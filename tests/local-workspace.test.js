import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp, readFile, rm, writeFile, mkdir, symlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {readWorkspace} from '../server/local-workspace.mjs';
import {createLocalServer} from '../server/http-server.mjs';
import {validateWorkspace} from '../dist/data/workspace-data.js';

const now = new Date('2026-10-31T03:00:00Z');
const syncTime = '2026-10-30T22:00:00Z';
const field = (sum, count = 1) => ({sum, count, min: sum / count, max: sum / count});
async function fixture(t, {accounts = ['account-a'], summaries = [], workouts = []} = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'aethriva-local-test-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const databasePath = path.join(directory, 'health.sqlite');
  const db = new DatabaseSync(databasePath);
  db.exec(`CREATE TABLE accounts(account_id TEXT PRIMARY KEY, created_at TEXT);
    CREATE TABLE daily_summaries(account_id TEXT,metric_id TEXT,date TEXT,record_count INTEGER,fields_json TEXT);
    CREATE TABLE sync_state(account_id TEXT,metric_id TEXT,status TEXT,last_success TEXT,last_error TEXT);
    CREATE TABLE lyfta_workouts(account_id TEXT,id TEXT,date TEXT,normalized_json TEXT,payload_json TEXT);
    CREATE TABLE lyfta_sync(account_id TEXT,status TEXT,last_success TEXT,last_error TEXT);
    CREATE TABLE snapshots(account_id TEXT,resource TEXT,payload_json TEXT);`);
  for (const account of accounts) db.prepare('INSERT INTO accounts VALUES(?,?)').run(account, syncTime);
  for (const entry of summaries) {
    db.prepare('INSERT INTO daily_summaries VALUES(?,?,?,?,?)').run(entry.account || accounts[0], entry.metric, entry.date || '2026-10-30', entry.records ?? 1, typeof entry.fields === 'string' ? entry.fields : JSON.stringify(entry.fields));
    db.prepare('INSERT INTO sync_state VALUES(?,?,?,?,?)').run(entry.account || accounts[0], entry.metric, 'complete', syncTime, 'SECRET ERROR TOKEN');
  }
  for (const workout of workouts) db.prepare('INSERT INTO lyfta_workouts VALUES(?,?,?,?,?)').run(accounts[0], workout.id || 'source-workout', workout.date || '2026-10-30', typeof workout.normalized === 'string' ? workout.normalized : JSON.stringify(workout.normalized), '{"apiKey":"SECRET RAW TOKEN"}');
  if (workouts.length) db.prepare('INSERT INTO lyfta_sync VALUES(?,?,?,?)').run(accounts[0], 'complete', syncTime, 'SECRET LYFTA TOKEN');
  db.prepare('INSERT INTO snapshots VALUES(?,?,?)').run(accounts[0] || 'none', 'users/me/profile', '{"email":"private@example.test","name":"Private Identity"}');
  db.close();
  return {databasePath, directory};
}

test('maps daily totals and averages with stable provenance while leaving the database unchanged', async t => {
  const {databasePath} = await fixture(t, {summaries: [
    {metric: 'steps', fields: {Count: field(123, 3)}, records: 3},
    {metric: 'sleep', fields: {'Hours asleep': field(8, 2)}, records: 2},
    {metric: 'daily-resting-heart-rate', fields: {'Beats Per Minute': field(120, 2)}, records: 2},
    {metric: 'heart-rate', fields: {'Beats Per Minute': field(999, 3)}, records: 3},
  ]});
  const before = await readFile(databasePath);
  const result = readWorkspace({databasePath, now});
  const repeated = readWorkspace({databasePath, now: new Date('2026-10-31T04:00:00Z')});
  assert.deepEqual(await readFile(databasePath), before);
  assert.equal(result.version, 1);
  assert.equal(result.mode, 'local');
  assert.deepEqual(result.profile, {name: 'Your health', initials: 'YH'});
  assert.deepEqual(result.events.map(e => e.id), repeated.events.map(e => e.id));
  assert.equal(result.events.length, 3);
  const events = Object.fromEntries(result.events.map(e => [e.metricKey, e]));
  assert.equal(events.steps.value, 123);
  assert.equal(events.sleep_duration.value, 480);
  assert.equal(events.resting_heart_rate.value, 60);
  assert.equal(events.sleep_duration.originalValue, 8);
  assert.equal(events.sleep_duration.originalUnit, 'h');
  assert.deepEqual(events.resting_heart_rate.metadata.summary, {sum: 120, count: 2});
  assert.equal(events.steps.provenance.inputRecordCount, 3);
  assert.equal(events.steps.observedAt, '2026-10-30T20:00:00.000Z');
  assert.equal(events.steps.metadata.civilDate, '2026-10-30');
  assert.equal(result.importedAt, now.toISOString());
  assert.equal(result.sources[0].lastSyncedAt, syncTime);
  assert.deepEqual(result.range, {from: '2026-10-30', to: '2026-10-30'});
  assert.ok(result.notices.some(value => /naps/i.test(value)));
  assert.ok(result.notices.some(value => /day.*aggregate|aggregate.*day/i.test(value)));
});

test('preserves an observed zero and omits missing, malformed and invalid observations', async t => {
  const {databasePath} = await fixture(t, {summaries: [
    {metric: 'steps', date: '2026-10-01', fields: {Count: field(0)}},
    {metric: 'steps', date: '2026-10-02', fields: {}},
    {metric: 'steps', date: '2026-10-03', fields: '{broken'},
    {metric: 'steps', date: '2026-10-04', fields: {Count: field(-1)}},
    {metric: 'steps', date: '2026-02-31', fields: {Count: field(1)}},
    {metric: 'steps', date: '2026-11-02', fields: {Count: field(1)}},
    {metric: 'daily-resting-heart-rate', date: '2026-10-05', fields: {'Beats Per Minute': field(1, 0)}},
    {metric: 'sleep', date: '2026-10-06', fields: {'Hours asleep': {sum: null, count: 1}}},
  ]});
  const result = readWorkspace({databasePath, now});
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].value, 0);
  assert.ok(!result.events.some(event => event.metricKey === 'energy'));
  assert.ok(result.notices.some(value => /unreadable|invalid/i.test(value)));
});

test('requires explicit selection for multiple accounts and never combines them', async t => {
  const {databasePath} = await fixture(t, {accounts: ['account-a', 'account-b'], summaries: [
    {account: 'account-a', metric: 'steps', fields: {Count: field(11)}},
    {account: 'account-b', metric: 'steps', fields: {Count: field(22)}},
  ]});
  assert.throws(() => readWorkspace({databasePath, now}), error => error.code === 'ACCOUNT_SELECTION_REQUIRED');
  assert.throws(() => readWorkspace({databasePath, now, accountId: 'missing'}), error => error.code === 'ACCOUNT_NOT_FOUND');
  assert.equal(readWorkspace({databasePath, now, accountId: 'account-b'}).events[0].value, 22);
});

test('returns an honest empty range based on the current Pacific date', async t => {
  const {databasePath} = await fixture(t, {accounts: []});
  const result = readWorkspace({databasePath, now});
  assert.deepEqual(result.events, []);
  assert.deepEqual(result.workouts, []);
  assert.deepEqual(result.range, {from: '2026-10-01', to: '2026-10-30'});
  assert.ok(result.sources.every(source => source.status === 'not_connected' && source.lastSyncedAt === null));
  assert.ok(!result.notices.some(value => value.includes('account-a')));
});

test('sanitizes Lyfta workouts, distinguishes completed sets and never invents units or energy', async t => {
  const {databasePath} = await fixture(t, {workouts: [{id: 'private@example.test', normalized: {
    id: 'private@example.test', title: 'Training session', date: '2026-10-30', timestamp: '2026-10-31 02:00:00', weightUnit: null,
    apiKey: 'SECRET NORMALIZED TOKEN', email: 'private@example.test',
    exercises: [{id: 'exercise-1', name: 'Exercise', type: 'strength', secret: 'SECRET EXERCISE', sets: [
      {weight: 10, reps: 4, rir: 2, duration: null, distance: null, completed: true, type: '1', secret: 'SECRET SET'},
      {weight: 12, reps: 3, rir: null, completed: false, type: '1'},
    ]}],
  }}, {id: 'bad', normalized: '{broken'}]});
  const result = readWorkspace({databasePath, now});
  const workout = result.workouts[0];
  assert.equal(result.workouts.length, 1);
  assert.equal(workout.sourceId, 'lyfta');
  assert.equal(workout.weightUnit, null);
  assert.equal(workout.timestamp, '2026-10-31T02:00:00.000Z');
  assert.equal(workout.savedSetCount, 2);
  assert.equal(workout.completedSetCount, 1);
  assert.equal(workout.exerciseCount, 1);
  assert.equal(workout.exercises[0].sets[0].rir, 2);
  assert.equal(workout.exercises[0].sets[0].distance, null);
  assert.equal(result.events.length, 0);
  const serialized = JSON.stringify(result);
  for (const secret of ['SECRET', 'private@example.test', 'Private Identity', 'account-a', databasePath]) assert.ok(!serialized.includes(secret));
});

test('blank Lyfta labels use readable fallbacks without discarding valid Google history', async t => {
  const {databasePath} = await fixture(t, {
    summaries: [{metric: 'steps', fields: {Count: field(123)}}],
    workouts: [{normalized: {title: ' \t\n ', weightUnit: '  ', exercises: [
      {id: 'exercise-1', name: ' \t ', type: ' ', sets: [{weight: 10, reps: 4, rir: 0, completed: true, type: ' '}]},
      {id: 'exercise-2', name: '  Recorded exercise  ', sets: []},
    ]}}],
  });
  const result = validateWorkspace(readWorkspace({databasePath, now}));
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].value, 123);
  assert.equal(result.workouts[0].title, 'Workout');
  assert.equal(result.workouts[0].exercises[0].name, 'Exercise');
  assert.equal(result.workouts[0].exercises[1].name, 'Recorded exercise');
  assert.equal(result.workouts[0].weightUnit, null);
  assert.equal(result.workouts[0].exercises[0].type, null);
  assert.equal(result.workouts[0].exercises[0].sets[0].type, null);
  assert.equal(result.workouts[0].completedSetCount, 1);
});

test('invalid negative Lyfta RIR becomes missing without changing completion or losing Google history', async t => {
  const {databasePath} = await fixture(t, {
    summaries: [{metric: 'steps', fields: {Count: field(0)}}],
    workouts: [{normalized: {title: 'Training session', exercises: [{id: 'exercise-1', name: 'Exercise', sets: [
      {weight: 10, reps: 4, rir: -1, completed: true},
      {weight: 10, reps: 4, rir: 0, completed: false},
    ]}]}}],
  });
  const result = validateWorkspace(readWorkspace({databasePath, now}));
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].value, 0);
  assert.equal(result.workouts[0].exercises[0].sets[0].rir, null);
  assert.equal(result.workouts[0].exercises[0].sets[1].rir, 0);
  assert.equal(result.workouts[0].savedSetCount, 2);
  assert.equal(result.workouts[0].completedSetCount, 1);
});

function request(server, target, headers = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({hostname: '127.0.0.1', port: server.address().port, path: target, method, headers: {Host: '127.0.0.1:4173', ...headers}}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error', reject); req.end();
  });
}

test('local HTTP serves only same-origin read-only data, protects static boundaries and masks database errors', async t => {
  const {databasePath, directory} = await fixture(t, {summaries: [{metric: 'steps', fields: {Count: field(0)}}]});
  const staticRoot = path.join(directory, 'dist');
  await mkdir(staticRoot); await writeFile(path.join(staticRoot, 'index.html'), '<h1>Local</h1>');
  const secretPath = path.join(directory, 'secret.txt'); await writeFile(secretPath, 'DO NOT EXPOSE');
  await symlink(secretPath, path.join(staticRoot, 'linked.txt'));
  const server = createLocalServer({databasePath, staticRoot, now: () => now});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const allowed = await request(server, '/api/workspace', {Origin: 'http://127.0.0.1:4173', 'Sec-Fetch-Site': 'same-origin'});
  assert.equal(allowed.status, 200);
  assert.equal(JSON.parse(allowed.text).events[0].value, 0);
  assert.equal(allowed.headers['cache-control'], 'no-store');
  assert.equal(allowed.headers['access-control-allow-origin'], undefined);
  assert.equal(allowed.headers['x-content-type-options'], 'nosniff');
  assert.ok(allowed.headers['content-security-policy'].includes("connect-src 'self'"));
  assert.equal((await request(server, '/api/workspace', {Host: 'evil.example:4173'})).status, 403);
  assert.equal((await request(server, '/api/workspace', {Origin: 'https://evil.example'})).status, 403);
  assert.equal((await request(server, '/api/workspace', {'Sec-Fetch-Site': 'cross-site'})).status, 403);
  assert.equal((await request(server, '/api/workspace', {Origin: 'http://localhost:3000'})).status, 403);
  assert.equal((await request(server, '/api/workspace', {}, 'POST')).status, 405);
  assert.equal((await request(server, '/api/workspace', {}, 'OPTIONS')).status, 405);
  assert.equal((await request(server, '/')).status, 200);
  assert.equal((await request(server, '/%2e%2e%2fsecret.txt')).status, 403);
  assert.equal((await request(server, '/linked.txt')).status, 403);
  const missing = createLocalServer({databasePath: path.join(directory, 'PRIVATE-MISSING.sqlite'), staticRoot});
  await new Promise(resolve => missing.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => missing.close(resolve)));
  const errorResponse = await request(missing, '/api/workspace');
  assert.equal(errorResponse.status, 503);
  assert.equal(JSON.parse(errorResponse.text).error.code, 'DATABASE_UNAVAILABLE');
  assert.ok(!errorResponse.text.includes(directory));
  assert.ok(!errorResponse.text.includes('PRIVATE-MISSING'));
});
