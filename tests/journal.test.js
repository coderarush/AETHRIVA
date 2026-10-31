import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, stat, readFile, link} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {createLocalServer} from '../server/http-server.mjs';
import {validateWorkspace} from '../dist/data/workspace-data.js';

const now = new Date('2026-10-31T03:00:00.000Z');
const origin='http://127.0.0.1:4173';
async function fixture(t) {
  const directory=await mkdtemp(path.join(os.tmpdir(),'aethriva-journal-test-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const databasePath=path.join(directory,'cache.sqlite'),journalPath=path.join(directory,'journal.sqlite');
  const db=new DatabaseSync(databasePath);
  db.exec('CREATE TABLE accounts(account_id TEXT PRIMARY KEY); CREATE TABLE daily_summaries(account_id TEXT,metric_id TEXT,date TEXT,record_count INTEGER,fields_json TEXT);');
  db.prepare('INSERT INTO accounts VALUES(?)').run('private-account');
  db.prepare('INSERT INTO daily_summaries VALUES(?,?,?,?,?)').run('private-account','steps','2026-10-30',1,JSON.stringify({Count:{sum:0,count:1}}));db.close();
  const options={databasePath,journalPath,now:()=>now};
  const servers=[];
  async function start(overrides={}) {const server=createLocalServer({...options,...overrides});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});servers.push(server);return server;}
  t.after(()=>Promise.all(servers.filter(s=>s.listening).map(s=>new Promise(resolve=>s.close(resolve)))));
  return {directory,databasePath,journalPath,start};
}
function request(server,url,{method='GET',body,headers={}}={}) {
  return new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port:server.address().port,path:url,method,headers:{Host:'127.0.0.1:4173',...(method==='POST'?{Origin:origin,'Content-Type':'application/json'}:{}),...headers}},res=>{let raw='';res.setEncoding('utf8');res.on('data',part=>raw+=part);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(raw)}));});
    req.on('error',reject);req.end(body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body));
  });
}
const heart={kind:'heart_rate',timestamp:'2026-10-31T02:59:00.000Z',bpm:0,unit:'bpm',contactSupported:true,contactDetected:false,energyExpendedKJ:0,rrIntervalsSeconds:[0.5],usable:true,rejectionReason:null,qualityWarnings:[]};

test('a preexisting unreadable journal rejects a save before committing the new observation',async t=>{
  const f=await fixture(t),server=await f.start();
  await request(server,'/api/workspace');
  const db=new DatabaseSync(f.journalPath);
  db.prepare('INSERT INTO checkins VALUES(?,?,?,?)').run('2099-01-01',4,now.toISOString(),now.toISOString());db.close();
  const response=await request(server,'/api/checkins',{method:'POST',body:{date:'2026-10-30',energy:7}});
  assert.equal(response.status,503);
  const after=new DatabaseSync(f.journalPath,{readOnly:true});
  assert.equal(after.prepare('SELECT count(*) AS n FROM checkins WHERE date=?').get('2026-10-30').n,0);after.close();
});

test('daily energy upserts persist after server restart without changing the provider cache',async t=>{
  const f=await fixture(t),before=await readFile(f.databasePath),server=await f.start();
  const created=await request(server,'/api/checkins',{method:'POST',body:{date:'2026-10-30',energy:4}});
  assert.equal(created.status,201);const id=created.body.checkin.id;
  const replaced=await request(server,'/api/checkins',{method:'POST',body:{date:'2026-10-30',energy:7}});
  assert.equal(replaced.status,201);assert.equal(replaced.body.checkin.id,id);
  await new Promise(resolve=>server.close(resolve));
  const restarted=await f.start(),workspace=(await request(restarted,'/api/workspace')).body;
  const energy=workspace.events.filter(e=>e.metricKey==='energy');
  assert.equal(energy.length,1);assert.equal(energy[0].value,7);assert.equal(energy[0].sourceId,'checkins');
  assert.equal(workspace.events.find(e=>e.metricKey==='steps').value,0);
  assert.equal(workspace.sources.find(s=>s.id==='checkins').sourceType,'manual');
  assert.deepEqual(await readFile(f.databasePath),before);
  assert.equal((await stat(f.journalPath)).mode&0o777,0o600);
});

test('accepted device samples persist independently, deduplicate retries, preserve units and remain separate from resting heart rate',async t=>{
  const f=await fixture(t),server=await f.start();
  const pressure={kind:'blood_pressure',timestamp:heart.timestamp,systolic:0,diastolic:null,meanPressure:0,pulseRate:null,unit:'kPa',deviceTimestamp:'2026-10-30T19:59:00',measurementStatus:1,usable:true,qualityWarnings:[],rejectionReason:null};
  const body={device:{name:'Test cuff'},samples:[heart,pressure]};
  const first=await request(server,'/api/device-readings',{method:'POST',body});assert.equal(first.status,201);assert.equal(first.body.inserted,2);
  const second=await request(server,'/api/device-readings',{method:'POST',body});assert.equal(second.body.inserted,0);assert.equal(second.body.duplicates,2);
  await new Promise(resolve=>server.close(resolve));const restarted=await f.start();
  const workspace=(await request(restarted,'/api/workspace')).body;
  assert.equal(workspace.deviceReadings.length,2);
  const saved=workspace.deviceReadings.find(r=>r.sample.kind==='blood_pressure');
  assert.equal(saved.sample.unit,'kPa');assert.equal(saved.sample.systolic,0);assert.equal(saved.sample.diastolic,null);assert.equal(saved.sample.deviceTimestamp,pressure.deviceTimestamp);
  assert.ok(saved.sample.qualityWarnings.some(w=>/movement/i.test(w)));
  assert.ok(!workspace.events.some(e=>e.metricKey==='resting_heart_rate'));
  assert.deepEqual(workspace.sources.find(s=>s.id==='bluetooth').metricKeys,[]);
});

test('journal rejects invalid dates, energy, device status and unusable values atomically',async t=>{
  const f=await fixture(t),server=await f.start();
  for(const body of [{date:'2026-02-31',energy:4},{date:'2026-11-01',energy:4},{date:'2000-01-01',energy:4},{date:'2026-10-30',energy:0},{date:'2026-10-30',energy:2.5}])assert.equal((await request(server,'/api/checkins',{method:'POST',body})).status,400);
  for(const bit of [10,11,13,15]){
    const bad={kind:'pulse_oximeter',timestamp:heart.timestamp,unit:'%',spo2:98,pulseRate:70,measurementStatus:1<<bit,usable:true,qualityWarnings:[]};
    assert.equal((await request(server,'/api/device-readings',{method:'POST',body:{device:{name:'Test'},samples:[heart,bad]}})).status,400);
  }
  for(const bad of [{...heart,bpm:-1},{...heart,bpm:null},{...heart,timestamp:'2099-01-01T00:00:00Z'},{...heart,unit:'ECG'},{kind:'pulse_oximeter',timestamp:heart.timestamp,unit:'%',spo2:null,pulseRate:null,usable:true}])assert.equal((await request(server,'/api/device-readings',{method:'POST',body:{device:{name:'Test'},samples:[bad]}})).status,400);
  assert.equal((await request(server,'/api/workspace')).body.deviceReadings.length,0);
});

test('mutations require the exact same-origin JSON request and enforce body and batch limits',async t=>{
  const f=await fixture(t),server=await f.start(),body={date:'2026-10-30',energy:4};
  for(const headers of [{Origin:''},{Origin:'http://evil.example'},{'Content-Type':'text/plain'}])assert.ok([400,403,415].includes((await request(server,'/api/checkins',{method:'POST',body,headers})).status));
  assert.equal((await request(server,'/api/checkins',{method:'POST',body:'{'})).status,400);
  assert.equal((await request(server,'/api/checkins',{method:'POST',body:' '.repeat(256*1024+1)})).status,413);
  assert.equal((await request(server,'/api/device-readings',{method:'POST',body:{device:{name:'Test'},samples:Array.from({length:121},()=>heart)}})).status,400);
  assert.equal((await request(server,'/api/workspace',{method:'POST',body:{}})).status,405);
});

test('cache failure keeps saved local records available and status discloses no identity or measurement values',async t=>{
  const f=await fixture(t),server=await f.start();
  await request(server,'/api/checkins',{method:'POST',body:{date:'2026-10-30',energy:4}});
  const degraded=await f.start({databasePath:path.join(f.directory,'missing.sqlite')});
  const workspace=await request(degraded,'/api/workspace');assert.equal(workspace.status,200);assert.equal(workspace.body.events.length,1);assert.ok(workspace.body.notices.some(n=>/unavailable/i.test(n)));
  const status=await request(degraded,'/api/status');assert.equal(status.status,200);assert.equal(status.body.status,'degraded');assert.equal(status.body.cache.available,false);assert.equal(status.body.journal.available,true);assert.ok(status.body.capabilities.checkins);
  const raw=JSON.stringify(status.body);for(const forbidden of ['private-account','2026-10-30','energy','sqlite',f.directory])assert.ok(!raw.includes(forbidden));
});

test('journal failures remain explicit and an alias of the provider cache is never opened for writing',async t=>{
  const f=await fixture(t),before=await readFile(f.databasePath),providerMode=(await stat(f.databasePath)).mode;
  const alias=path.join(f.directory,'cache-alias.sqlite');await link(f.databasePath,alias);
  const unsafe=await f.start({journalPath:alias});
  const save=await request(unsafe,'/api/checkins',{method:'POST',body:{date:'2026-10-30',energy:4}});
  assert.equal(save.status,503);assert.equal(save.body.error.code,'JOURNAL_UNAVAILABLE');
  assert.deepEqual(await readFile(f.databasePath),before);assert.equal((await stat(f.databasePath)).mode,providerMode);
  const failed=await f.start({journalPath:path.join(f.databasePath,'impossible.sqlite')});
  assert.equal((await request(failed,'/api/workspace')).status,503);
  const status=(await request(failed,'/api/status')).body;assert.equal(status.status,'degraded');assert.equal(status.journal.available,false);assert.equal(status.capabilities.checkins,false);
});

test('merged workspace stays within ten years through today while retaining valid cached observations',async t=>{
  const f=await fixture(t),db=new DatabaseSync(f.databasePath);
  db.prepare('INSERT INTO daily_summaries VALUES(?,?,?,?,?)').run('private-account','steps','2000-01-01',1,JSON.stringify({Count:{sum:123,count:1}}));db.close();
  const server=await f.start(),response=await request(server,'/api/workspace');assert.equal(response.status,200);
  const workspace=validateWorkspace(response.body);assert.equal(workspace.range.to,'2026-10-30');assert.ok(workspace.range.from>='2016-10-23');assert.equal(workspace.events.length,1);assert.equal(workspace.events[0].value,0);assert.ok(workspace.notices.some(note=>/ten.year|10.year/i.test(note)));
});

test('a stalled mutation body receives a bounded timeout without writing a check-in',async t=>{
  const f=await fixture(t),server=await f.start();
  const response=await new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/api/checkins',method:'POST',headers:{Host:'127.0.0.1:4173',Origin:origin,'Content-Type':'application/json','Transfer-Encoding':'chunked'}},res=>{let raw='';res.on('data',chunk=>raw+=chunk);res.on('end',()=>{req.end();resolve({status:res.statusCode,body:JSON.parse(raw)});});});
    req.on('error',reject);req.flushHeaders();req.write('{');
  });
  assert.equal(response.status,408);assert.equal(response.body.error.code,'BODY_TIMEOUT');assert.ok(!(await request(server,'/api/workspace')).body.events.some(e=>e.metricKey==='energy'));
});
