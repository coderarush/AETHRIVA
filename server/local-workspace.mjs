import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

export const DEFAULT_DATABASE_PATH = path.join(os.homedir(), 'Library', 'Application Support', 'Ascend', 'data', 'ascend.sqlite');
const TIME_ZONE = 'America/Los_Angeles';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'});
const syncStatuses = new Set(['complete', 'running', 'pending', 'error']);
const mappings = [
  {id: 'steps', key: 'steps', label: 'Steps', field: 'Count', unit: 'steps', originalUnit: 'steps', category: 'activity', aggregation: 'sum', scale: 1},
  {id: 'sleep', key: 'sleep_duration', label: 'Sleep duration', field: 'Hours asleep', unit: 'min', originalUnit: 'h', category: 'sleep', aggregation: 'sum', scale: 60},
  {id: 'daily-resting-heart-rate', key: 'resting_heart_rate', label: 'Resting heart rate', field: 'Beats Per Minute', unit: 'bpm', originalUnit: 'bpm', category: 'cardiovascular', aggregation: 'arithmetic_mean', scale: 1},
];
const mappingById = new Map(mappings.map(mapping => [mapping.id, mapping]));

export class WorkspaceError extends Error {
  constructor(code, message, status = 503) { super(message); this.code = code; this.status = status; }
}

const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 24);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const nonnegative = value => finite(value) && value >= 0 ? value : null;
const text = (value, fallback = '', limit = 240) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit).trim() || fallback : fallback;
function parsed(value) { try { const result = JSON.parse(value); return object(result) ? result : null; } catch { return null; } }
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
function validInstant(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
}
function shiftDate(date, days) { return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10); }
function latestInstant(values) { return values.filter(validInstant).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1) || null; }
function sourceStatus(states) {
  for (const status of ['error', 'running', 'pending', 'complete']) if (states.some(state => state.status === status)) return status;
  return 'unknown';
}

function emptyWorkspace(now) {
  const today = dateFormatter.format(now);
  return {
    version: 1, mode: 'local', profile: {name: 'Your health', initials: 'YH'},
    sources: [
      {id: 'google-health', name: 'Google Health', sourceType: 'wearable', status: 'not_connected', isSynthetic: false, metricKeys: [], lastSyncedAt: null, syncStatus: 'unknown', description: 'Cached data from your existing local Google Health integration. Sleep totals include all saved sessions and naps.'},
      {id: 'lyfta', name: 'Lyfta', sourceType: 'activity', status: 'not_connected', isSynthetic: false, metricKeys: [], lastSyncedAt: null, syncStatus: 'unknown', description: 'Cached workouts from your existing local Lyfta integration. Weight units are shown only when supplied by Lyfta.'},
    ],
    events: [], workouts: [], range: {from: shiftDate(today, -29), to: today}, importedAt: now.toISOString(),
    notices: ['This workspace reads saved data. The existing local service owns connections and synchronization.', 'Daily aggregate timestamps mark the Pacific calendar day; they are not exact observation times.', 'Sleep duration totals all saved sleep sessions ending on each date, including naps.', 'Self-reported energy has no saved observations. Missing measurements remain missing.'],
  };
}

function sanitizeWorkout(row, account, today) {
  const raw = parsed(row.normalized_json);
  if (!raw || !validDate(row.date) || row.date > today || !Array.isArray(raw.exercises)) return null;
  const key = String(row.id);
  const sourceRecordId = /^[A-Za-z0-9_-]{1,128}$/.test(key) ? `lyfta_${key}` : `lyfta_${hash(key)}`;
  const exercises = raw.exercises.filter(object).slice(0, 200).map((exercise, index) => ({
    id: /^[A-Za-z0-9_-]{1,128}$/.test(String(exercise.id || '')) ? String(exercise.id) : `exercise_${index + 1}`,
    name: text(exercise.name, 'Exercise'), type: text(exercise.type, '', 60),
    sets: (Array.isArray(exercise.sets) ? exercise.sets : []).filter(object).slice(0, 200).map(set => ({
      weight: nonnegative(set.weight), reps: nonnegative(set.reps), rir: nonnegative(set.rir),
      duration: nonnegative(set.duration), distance: nonnegative(set.distance), completed: set.completed === true, type: text(set.type, '', 60),
    })),
  }));
  const sets = exercises.flatMap(exercise => exercise.sets);
  // The existing Lyfta importer interprets unqualified API datetimes as UTC.
  const instant = typeof raw.timestamp === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(raw.timestamp) ? `${raw.timestamp.replace(' ', 'T')}Z` : raw.timestamp;
  return {
    id: `workout_${hash(`${account}\0${key}`)}`, sourceId: 'lyfta', sourceRecordId, title: text(raw.title, 'Workout'), date: row.date,
    timestamp: validInstant(instant) ? new Date(instant).toISOString() : null,
    weightUnit: typeof raw.weightUnit === 'string' && raw.weightUnit.trim() ? text(raw.weightUnit.trim(), '', 30) : null,
    exercises, exerciseCount: exercises.length, savedSetCount: sets.length, completedSetCount: sets.filter(set => set.completed).length, isSynthetic: false,
  };
}

/** Read only approved summaries and normalized workout fields. Never load credentials or profile snapshots. */
export function readWorkspace({databasePath = process.env.AETHRIVA_DB_PATH || DEFAULT_DATABASE_PATH, accountId = process.env.AETHRIVA_ACCOUNT_ID || null, now = new Date()} = {}) {
  const workspace = emptyWorkspace(now);
  const today = dateFormatter.format(now);
  let db;
  try {
    db = new DatabaseSync(databasePath, {readOnly: true});
    db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=2000; BEGIN;');
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('accounts','daily_summaries','sync_state','lyfta_workouts','lyfta_sync')").all().map(row => row.name));
    if (!tables.has('accounts') || !tables.has('daily_summaries')) throw new WorkspaceError('DATABASE_UNSUPPORTED', 'The local health database has an unsupported format.');
    let account;
    if (accountId) {
      account = db.prepare('SELECT account_id FROM accounts WHERE account_id=?').get(accountId)?.account_id;
      if (!account) throw new WorkspaceError('ACCOUNT_NOT_FOUND', 'The configured local health account was not found.', 409);
    } else {
      const accounts = db.prepare('SELECT account_id FROM accounts ORDER BY account_id LIMIT 2').all();
      if (accounts.length > 1) throw new WorkspaceError('ACCOUNT_SELECTION_REQUIRED', 'More than one local health account is available. Set AETHRIVA_ACCOUNT_ID to choose one.', 409);
      account = accounts[0]?.account_id;
    }
    if (!account) { workspace.notices.push('No saved health account is available yet. Connect a source in your local health service.'); return workspace; }

    const states = tables.has('sync_state') ? db.prepare('SELECT metric_id,status,last_success FROM sync_state WHERE account_id=?').all(account) : [];
    const safeStates = states.map(state => ({metric_id: state.metric_id, status: syncStatuses.has(state.status) ? state.status : 'unknown', last_success: validInstant(state.last_success)}));
    const google = workspace.sources[0];
    const rows = db.prepare("SELECT metric_id,date,record_count,fields_json FROM daily_summaries WHERE account_id=? AND metric_id IN ('steps','sleep','daily-resting-heart-rate') ORDER BY date,metric_id").all(account);
    let skipped = 0;
    for (const row of rows) {
      const mapping = mappingById.get(row.metric_id);
      const field = parsed(row.fields_json)?.[mapping.field];
      if (!validDate(row.date) || row.date > today || !object(field) || nonnegative(field.sum) === null || !Number.isSafeInteger(field.count) || field.count <= 0 || !Number.isSafeInteger(row.record_count) || row.record_count <= 0) { skipped++; continue; }
      const value = mapping.aggregation === 'arithmetic_mean' ? field.sum / field.count : field.sum * mapping.scale;
      if (!finite(value)) { skipped++; continue; }
      workspace.events.push({
        id: `evt_${mapping.key}_${hash(`${account}\0${row.metric_id}\0${row.date}`)}`, userId: null, sourceId: google.id,
        sourceRecordId: `daily:${row.metric_id}:${row.date}`, metricKey: mapping.key, metricLabel: mapping.label, category: mapping.category,
        value, unit: mapping.unit, originalValue: field.sum, originalUnit: mapping.originalUnit,
        // 20:00 UTC always falls on the named Pacific day, in standard or daylight time.
        observedAt: `${row.date}T20:00:00.000Z`, importedAt: workspace.importedAt, timezone: TIME_ZONE, quality: 'valid',
        provenance: {sourceName: google.name, sourceType: google.sourceType, importBatchId: `local_daily_${hash(`${account}\0${row.metric_id}`)}`, transformationVersion: 'local-daily-v1', inputRecordCount: row.record_count},
        metadata: {isSynthetic: false, civilDate: row.date, aggregate: true, timestampPrecision: 'day', aggregation: mapping.aggregation, summary: {sum: field.sum, count: field.count}, inputRecordCount: row.record_count, ...(mapping.key === 'sleep_duration' ? {includesNaps: true} : {})},
      });
    }
    google.metricKeys = mappings.filter(mapping => workspace.events.some(event => event.metricKey === mapping.key)).map(mapping => mapping.key);
    google.status = rows.length || safeStates.length ? 'connected' : 'not_connected';
    google.lastSyncedAt = latestInstant(safeStates.map(state => state.last_success));
    google.syncStatus = sourceStatus(safeStates);

    const lyfta = workspace.sources[1];
    if (tables.has('lyfta_workouts')) {
      const workoutRows = db.prepare('SELECT id,date,normalized_json FROM lyfta_workouts WHERE account_id=? ORDER BY date DESC,id DESC').all(account);
      for (const row of workoutRows) { const workout = sanitizeWorkout(row, account, today); if (workout) workspace.workouts.push(workout); else skipped++; }
      if (workoutRows.length) lyfta.status = 'connected';
    }
    if (tables.has('lyfta_sync')) {
      const state = db.prepare('SELECT status,last_success FROM lyfta_sync WHERE account_id=?').get(account);
      if (state) {
        lyfta.status = 'connected'; lyfta.syncStatus = syncStatuses.has(state.status) ? state.status : 'unknown'; lyfta.lastSyncedAt = validInstant(state.last_success);
      }
    }
    const dates = [...workspace.events.map(event => event.metadata.civilDate), ...workspace.workouts.map(workout => workout.date)].sort();
    if (dates.length) workspace.range = {from: dates[0], to: dates.at(-1)};
    if (skipped) workspace.notices.push('Some unreadable or invalid saved observations were excluded. Your saved data was not changed.');
    for (const source of workspace.sources.filter(source => source.status === 'connected')) {
      if (source.syncStatus === 'error') workspace.notices.push(`${source.name} last reported a sync error. Previously saved data is still available.`);
      if (!source.lastSyncedAt) workspace.notices.push(`${source.name} has no confirmed successful sync timestamp.`);
      else if (now.getTime() - Date.parse(source.lastSyncedAt) > 24 * 60 * 60 * 1000) workspace.notices.push(`${source.name} saved data was last synchronized more than 24 hours ago.`);
    }
    return workspace;
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    throw new WorkspaceError('DATABASE_UNAVAILABLE', 'Saved health data is unavailable. Check that the existing local health service and its data folder are available.');
  } finally {
    if (db) { try { db.exec('ROLLBACK'); } catch {} db.close(); }
  }
}
