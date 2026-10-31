import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

async function runtime(file) {
  const url = new URL(`../dist/${file}`, import.meta.url);
  assert.ok(existsSync(url), `${file} exposes the runtime adapter`);
  return import(url);
}

function dataset() {
  const source = {id:'google-health',name:'Google Health',sourceType:'wearable',status:'connected',metricKeys:['sleep_duration','steps'],isSynthetic:false};
  const events = Array.from({length:40}, (_, i) => {
    const day = new Date(Date.UTC(2025, 10, 1 + i)).toISOString().slice(0,10);
    return {id:`step_${day}`,userId:null,sourceId:source.id,sourceRecordId:`raw_${day}`,metricKey:'steps',metricLabel:'Steps',category:'activity',value:i===0?0:1000+i,unit:'steps',originalValue:i===0?0:1000+i,originalUnit:'steps',observedAt:`${day}T20:00:00Z`,importedAt:'2025-12-11T12:00:00Z',timezone:'America/Los_Angeles',quality:'valid',provenance:{sourceName:source.name,sourceType:source.sourceType,importBatchId:'batch_1',transformationVersion:'1'},metadata:{isSynthetic:false}};
  });
  return {version:1,mode:'local',profile:{name:'Local workspace',initials:'LW'},sources:[source],events,workouts:[],range:{from:'2025-11-01',to:'2025-12-10'},importedAt:'2025-12-11T12:00:00Z',notices:[]};
}

function deviceReading(sample={}) {
  return {id:'device_1',sourceId:'bluetooth',deviceName:'Personal monitor',receivedAt:'2025-11-02T20:00:01Z',sample:{kind:'heart_rate',bpm:72,unit:'bpm',timestamp:'2025-11-02T20:00:00Z',contactSupported:true,contactDetected:true,energyExpendedKJ:null,rrIntervalsSeconds:[],qualityWarnings:[],usable:true,rejectionReason:null,...sample}};
}

function deviceDataset(reading=deviceReading()) {
  const data=dataset();
  data.sources.push({id:'bluetooth',name:'Bluetooth devices',sourceType:'wearable',status:'disconnected',metricKeys:[],isSynthetic:false});
  data.deviceReadings=[reading];
  return data;
}

test('public first-run is an empty current-date workspace without sample records', async () => {
  const {emptyWorkspace} = await runtime('data/workspace-data.js');
  const data = emptyWorkspace({now:'2027-01-02T04:00:00Z'});
  assert.deepEqual(data.range,{from:'2026-12-03',to:'2027-01-01'});
  assert.equal(data.mode,'empty');
  assert.deepEqual(data.events,[]);
  assert.deepEqual(data.sources,[]);
  assert.deepEqual(data.workouts,[]);
  assert.deepEqual(data.deviceReadings,[]);
  assert.equal(data.available,false);
});

test('device readings retain spot measurements and quality without entering daily analytics', async () => {
  const {validateWorkspace}=await runtime('data/workspace-data.js');
  const {createHealthService}=await runtime('data/health-service.js');
  const input=deviceDataset(deviceReading({bpm:0,contactDetected:false,qualityWarnings:[],secret:'discard me'}));
  const valid=validateWorkspace(input);
  assert.equal(valid.deviceReadings.length,1);
  assert.equal(valid.deviceReadings[0].sample.bpm,0);
  assert.match(valid.deviceReadings[0].sample.qualityWarnings.join(' '),/contact/i);
  assert.equal(valid.deviceReadings[0].sample.secret,undefined);
  input.deviceReadings[0].sample.bpm=100;
  input.deviceReadings[0].sample.rrIntervalsSeconds.push(1);
  assert.equal(valid.deviceReadings[0].sample.bpm,0);
  assert.deepEqual(valid.deviceReadings[0].sample.rrIntervalsSeconds,[]);
  const summary=await createHealthService(valid).summarize();
  assert.equal(summary.coverage.records,40);
  assert.equal(summary.seriesByMetric.resting_heart_rate.every(point=>point.value===null),true);
});

test('device validation preserves nullable pressure, sensor status and decoder metadata', async () => {
  const {validateDeviceReading}=await runtime('data/workspace-data.js');
  const pressure=validateDeviceReading(deviceReading({kind:'blood_pressure',bpm:undefined,unit:'mmHg',systolic:null,diastolic:80,meanPressure:null,pulseRate:0,deviceTimestamp:'2025-11-02T12:00:00',userId:0,measurementStatus:3}));
  assert.equal(pressure.sample.systolic,null);
  assert.equal(pressure.sample.pulseRate,0);
  assert.equal(pressure.sample.userId,0);
  assert.equal(pressure.sample.measurementStatus,3);
  assert.equal(pressure.sample.deviceTimestamp,'2025-11-02T12:00:00');
  assert.match(pressure.sample.qualityWarnings.join(' '),/movement.*loose.*unavailable/i);
  const plx=validateDeviceReading(deviceReading({kind:'pulse_oximeter',bpm:undefined,unit:'%',mode:'continuous',spo2:null,pulseRate:68,measurementStatus:1<<14,deviceSensorStatus:1<<11,pulseAmplitudeIndex:0,deviceTimestamp:null,fast:{spo2:98,pulseRate:69},slow:null}));
  assert.equal(plx.sample.spo2,null);
  assert.equal(plx.sample.pulseAmplitudeIndex,0);
  assert.deepEqual(plx.sample.fast,{spo2:98,pulseRate:69});
  assert.equal(plx.sample.slow,null);
  assert.match(plx.sample.qualityWarnings.join(' '),/questionable.*contact.*unavailable/i);
});

test('device validation rejects forged quality flags and invalid or missing measurements', async () => {
  const {validateDeviceReading,validateWorkspace}=await runtime('data/workspace-data.js');
  for(const mutate of [
    r=>{r.sourceId='google-health';},r=>{r.isSynthetic=true;},r=>{r.sample.isSynthetic=true;},
    r=>{r.sample.kind='resting_heart_rate';},r=>{r.sample.bpm=Infinity;},r=>{r.sample.bpm=-1;},r=>{r.sample.bpm=null;},
    r=>{r.sample.bpm=72.5;},r=>{r.sample.unit='Hz';},r=>{r.sample.usable=false;},
    r=>{r.sample.rejectionReason='Rejected by monitor';},r=>{r.sample.timestamp='2025-02-30T20:00:00Z';},
    r=>{r.sample.timestamp='2025-11-02T20:00:02Z';},r=>{r.receivedAt='bad date';},
    r=>{r.sample.rrIntervalsSeconds=[-1];},r=>{r.sample.contactSupported=false;},
    r=>{Object.assign(r.sample,{kind:'blood_pressure',unit:'mmHg',systolic:null,diastolic:null,meanPressure:null,pulseRate:null});},
    r=>{Object.assign(r.sample,{kind:'blood_pressure',unit:'mmHg',systolic:120,measurementStatus:65536});},
    r=>{Object.assign(r.sample,{kind:'blood_pressure',unit:'mmHg',systolic:120,deviceTimestamp:'2025-02-30T12:00:00'});},
    r=>{Object.assign(r.sample,{kind:'pulse_oximeter',unit:'%',mode:'spot-check',spo2:null,pulseRate:null});},
    r=>{Object.assign(r.sample,{kind:'pulse_oximeter',unit:'%',mode:'spot-check',spo2:98,pulseRate:60,deviceSensorStatus:16777216});},
    ...[10,11,13,15].map(bit=>r=>{Object.assign(r.sample,{kind:'pulse_oximeter',unit:'%',mode:'spot-check',spo2:98,pulseRate:60,measurementStatus:1<<bit,usable:true,qualityWarnings:[]});}),
  ]) {const reading=deviceReading();mutate(reading);assert.throws(()=>validateDeviceReading(reading));}
  for(const mutate of [
    d=>{d.sources[1].metricKeys=['resting_heart_rate'];},
    d=>{d.deviceReadings.push(d.deviceReadings[0]);},
    d=>{d.deviceReadings[0].id=d.events[0].id;},
    d=>{d.range.from='2025-11-03';d.events=d.events.slice(2);},
    d=>{d.deviceReadings=Array(10001).fill(d.deviceReadings[0]);},
  ]) {const data=deviceDataset();mutate(data);assert.throws(()=>validateWorkspace(data));}
});

test('canonical check-ins retain energy provenance and only advertise energy',async()=>{
  const {validateWorkspace}=await runtime('data/workspace-data.js');
  const data=dataset();
  data.sources.push({id:'checkins',name:'Energy check-ins',sourceType:'manual',status:'ready',metricKeys:['energy'],isSynthetic:false});
  data.events.push({...data.events[1],id:'energy_1',sourceId:'checkins',sourceRecordId:'checkin_1',metricKey:'energy',metricLabel:'Self-reported energy',category:'wellness_checkin',value:7,unit:'/10',originalValue:7,originalUnit:'/10',metadata:{isSynthetic:false,checkInId:'checkin_1'},provenance:{sourceName:'Energy check-ins',sourceType:'manual',importBatchId:'journal',transformationVersion:'1'}});
  const valid=validateWorkspace(data);
  assert.equal(valid.events.at(-1).metadata.checkInId,'checkin_1');
  data.sources.at(-1).metricKeys.push('steps');
  assert.throws(()=>validateWorkspace(data));
});

test('workspace validation preserves zero and original normalized-value provenance', async () => {
  const {validateWorkspace} = await runtime('data/workspace-data.js');
  const input=dataset();
  input.events[0].originalValue=0;
  const validated=validateWorkspace(input);
  assert.equal(validated.events[0].value,0);
  input.events[0].value=999;
  assert.equal(validated.events[0].value,0,'validated payload is its own snapshot');
  assert.equal(validated.events[0].provenance.importBatchId,'batch_1');
});

test('daily aggregate markers retain day precision even before the marker clock time', async () => {
  const {validateWorkspace}=await runtime('data/workspace-data.js');
  const {createHealthService}=await runtime('data/health-service.js');
  const data=dataset();data.events=data.events.slice(0,1);data.range={from:'2025-11-01',to:'2025-11-01'};
  data.importedAt='2025-11-01T15:00:00Z';data.events[0].importedAt=data.importedAt;
  data.events[0].metadata={isSynthetic:false,aggregate:true,timestampPrecision:'day',civilDate:'2025-11-01'};
  const valid=validateWorkspace(data);
  assert.equal(valid.events[0].metadata.aggregate,true);
  assert.equal(valid.events[0].metadata.timestampPrecision,'day');
  const service=createHealthService(valid);
  assert.equal((await service.summarize()).seriesByMetric.steps[0].value,0);
  data.events[0].metadata.civilDate='2025-11-02';data.events[0].observedAt='2025-11-02T20:00:00Z';data.range.to='2025-11-02';
  assert.throws(()=>validateWorkspace(data),/time|future|date/i);
});

test('workouts preserve real sets independently of unsupported daily health metrics', async () => {
  const {validateWorkspace}=await runtime('data/workspace-data.js');
  const data=dataset();data.sources.push({id:'lyfta',name:'Lyfta',sourceType:'activity',status:'connected',metricKeys:[],isSynthetic:false});
  data.workouts=[{id:'workout_1',sourceId:'lyfta',sourceRecordId:'lyfta_1',title:'Session',date:'2025-11-02',timestamp:null,weightUnit:null,isSynthetic:false,exercises:[{id:'exercise_1',name:'Squat',type:'strength',sets:[{weight:40,reps:0,rir:null,duration:null,distance:null,completed:true,type:'normal'},{weight:null,reps:5,rir:null,duration:null,distance:null,completed:false,type:'warmup'}]}]}];
  const valid=validateWorkspace(data);
  assert.equal(valid.workouts[0].savedSetCount,2);assert.equal(valid.workouts[0].completedSetCount,1);
  assert.equal(valid.workouts[0].weightUnit,null);assert.equal(valid.workouts[0].exercises[0].sets[0].reps,0);
  assert.deepEqual(valid.sources[1].metricKeys,[]);
  assert.equal(valid.events.length,40);
});

test('validation rejects malformed dates, units, duplicate IDs and missing provenance', async () => {
  const {validateWorkspace} = await runtime('data/workspace-data.js');
  for (const mutate of [
    d=>{d.events[0].value=Infinity;},d=>{d.events[0].unit='hours';},
    d=>{d.events[0].observedAt='2025-02-30T20:00:00Z';},
    d=>{d.events[0].sourceId='missing';},d=>{d.events.push(d.events[0]);},
    d=>{d.sources.push(d.sources[0]);},d=>{delete d.events[0].provenance;},
    d=>{d.range.to='2025-02-30';},d=>{d.events[0].metadata.isSynthetic=true;},
    d=>{d.events[0].metricKey='heart_rate';},
  ]) {const data=dataset();mutate(data);assert.throws(()=>validateWorkspace(data));}
});

test('loader distinguishes public absence from bridge errors and never uses demo fallback', async () => {
  const {loadWorkspace} = await runtime('data/workspace-data.js');
  const absent=await loadWorkspace({fetchImpl:async()=>({ok:false,status:404})});
  assert.equal(absent.mode,'empty');assert.equal(absent.available,false);assert.equal(absent.error,null);
  const failure=await loadWorkspace({fetchImpl:async()=>({ok:false,status:503})});
  assert.equal(failure.mode,'empty');assert.match(failure.error,/503/);assert.deepEqual(failure.events,[]);
  const offline=await loadWorkspace({fetchImpl:async()=>{throw new Error('offline');}});
  assert.match(offline.error,/offline/);
  const data=await loadWorkspace({fetchImpl:async()=>({ok:true,json:async()=>dataset()})});
  assert.equal(data.available,true);assert.equal(data.events.length,40);
});

test('loader explains safe backend failures and bounds its network request',async()=>{
  const {loadWorkspace}=await runtime('data/workspace-data.js');
  let requestSignal;
  const safe=await loadWorkspace({fetchImpl:async(url,options)=>{
    requestSignal=options.signal;
    return new Response(JSON.stringify({error:'The local journal could not be read. Restart the local server.'}),{status:503,headers:{'Content-Type':'application/json'}});
  }});
  assert.ok(requestSignal instanceof AbortSignal);
  assert.match(safe.error,/local journal.*Restart/);
  const unsafe=await loadWorkspace({fetchImpl:async()=>new Response(JSON.stringify({error:'Failed reading /Users/private/person/data.json <script>secret</script>'}),{status:503})});
  assert.match(unsafe.error,/503/);
  assert.doesNotMatch(unsafe.error,/Users|private|person|script|data.json/);
  const timeout=await loadWorkspace({fetchImpl:async()=>{throw new DOMException('Signal timed out','TimeoutError');}});
  assert.match(timeout.error,/timed out.*try again/i);
  assert.equal(timeout.available,false);
});

test('real service retains complete input evidence and snapshot isolation', async () => {
  const {createHealthService} = await runtime('data/health-service.js');
  const input=dataset(), service=createHealthService(input);
  input.events[0].value=9000;
  const summary=await service.summarize();
  assert.equal(summary.seriesByMetric.steps[0].value,0);
  assert.equal(summary.coverage.records,40);
  const calc=summary.calculations.find(c=>c.metricKeys[0]==='steps');
  const evidence=await service.resolveEvidence([calc.id]);
  assert.deepEqual(new Set(evidence.records.map(e=>e.id)),new Set(calc.sourceRecordIds));
  evidence.records[0].value=9000;
  assert.equal((await service.resolveEvidence([calc.id])).records[0].value,0);
  assert.ok(calc.limitations.every(l=>!/demo|synthetic/i.test(l)));
  assert.equal((await service.summarize({sourceIds:[]})).coverage.records,0);
  assert.equal(summary.seriesByMetric.resting_heart_rate.every(p=>p.value===null),true);
  await assert.rejects(service.resolveEvidence(['fake']),/unknown/i);
});

test('runtime answers accept all month names, ISO dates and relative ranges anchored to selected end', async () => {
  const {createHealthService} = await runtime('data/health-service.js');
  const service=createHealthService(dataset());
  for(const [question,from,to] of [
    ['Summarize steps on November 2, 2025','2025-11-02','2025-11-02'],
    ['Summarize steps from Nov. 2 through Nov. 5, 2025','2025-11-02','2025-11-05'],
    ['Summarize steps from November 28 to December 3, 2025','2025-11-28','2025-12-03'],
    ['Summarize steps from 2025-11-02 to 2025-11-05','2025-11-02','2025-11-05'],
    ['Summarize steps over the last 7 days','2025-11-14','2025-11-20'],
    ['Summarize steps in November 2025','2025-11-01','2025-11-30'],
  ]) {
    const response=await service.answerQuestion(question,{from:'2025-11-10',to:'2025-11-20'});
    assert.equal(response.responseType,'supported',question);
    assert.ok(response.limitations.every(l=>!/demo|synthetic/i.test(l)));
    const {calculations}=await service.resolveEvidence([response.findings[0].calculationId]);
    assert.equal(calculations[0].periodStart,from,question);assert.equal(calculations[0].periodEnd,to,question);
  }
  assert.equal((await service.answerQuestion('Compare earlier and later halves')).responseType,'supported');
  for(const question of ['Summarize steps tomorrow','Summarize steps on February 30, 2025','Summarize sleep and blood glucose','Summarize steps in February 2020']) {
    assert.equal((await service.answerQuestion(question)).responseType,'insufficient_data',question);
  }
});

test('empty runtime service exposes no invented records, findings or measurements', async () => {
  const {emptyWorkspace}=await runtime('data/workspace-data.js');
  const {createHealthService}=await runtime('data/health-service.js');
  const service=createHealthService(emptyWorkspace());
  assert.deepEqual(await service.selectEvents(),[]);
  assert.deepEqual(await service.buildInsights(),[]);
  assert.equal((await service.summarize()).coverage.records,0);
  assert.equal((await service.answerQuestion('Summarize sleep')).responseType,'insufficient_data');
});

test('workspace state defaults to latest available 30 days and retains empty source selections', async () => {
  const {createWorkspaceState}=await runtime('workspace-state.js');
  const stateApi=createWorkspaceState(dataset()), state=stateApi.createInitialState();
  assert.equal(state.from,'2025-11-11');assert.equal(state.to,'2025-12-10');
  assert.deepEqual(state.sourceIds,['google-health']);
  const none=stateApi.normalizeState({...state,sourceIds:[]});assert.deepEqual(none.sourceIds,[]);
  assert.equal(stateApi.rangeState(state,90).from,'2025-11-01');
  assert.deepEqual(stateApi.stateFromSearch(stateApi.searchFromState(none)),none);
  const changed=stateApi.normalizeState({...state,from:'2025-11-01',to:'2025-11-02',selectedDate:'2025-12-10'});
  assert.equal(changed.selectedDate,'2025-11-02');
});

test('workspace state includes ready and historical device sources after disconnection',async()=>{
  const {createWorkspaceState}=await runtime('workspace-state.js');
  const data=deviceDataset();
  data.sources.push({id:'checkins',name:'Energy check-ins',sourceType:'manual',status:'ready',metricKeys:['energy'],isSynthetic:false});
  data.sources.push({id:'unused',name:'Unused source',sourceType:'file',status:'not_connected',metricKeys:[],isSynthetic:false});
  const api=createWorkspaceState(data);
  assert.deepEqual(api.createInitialState().sourceIds,['google-health','bluetooth','checkins']);
  const selected=api.stateFromSearch('?sources=bluetooth&metric=all');
  assert.deepEqual(selected.sourceIds,['bluetooth']);
  assert.equal(selected.metricKey,'all');
});

test('runtime module graph does not import the demo fixture or legacy wrappers', async () => {
  const seen=new Set();
  function visit(url) {
    if(seen.has(url.href))return;seen.add(url.href);
    assert.ok(existsSync(url),`${url.pathname} exists`);
    const text=readFileSync(url,'utf8');
    for(const match of text.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
      if(!match[1].startsWith('.'))continue;
      const dependency=new URL(match[1],url);
      assert.doesNotMatch(dependency.pathname,/\/(?:demo-data|demo-service|demo-state|analytics)\.js$/);
      visit(dependency);
    }
  }
  for(const file of ['data/health-service.js','data/workspace-data.js','workspace-state.js'])visit(new URL(`../dist/${file}`,import.meta.url));
});
