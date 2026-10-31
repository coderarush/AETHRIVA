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

test('public first-run is an empty current-date workspace without sample records', async () => {
  const {emptyWorkspace} = await runtime('data/workspace-data.js');
  const data = emptyWorkspace({now:'2027-01-02T04:00:00Z'});
  assert.deepEqual(data.range,{from:'2026-12-03',to:'2027-01-01'});
  assert.equal(data.mode,'empty');
  assert.deepEqual(data.events,[]);
  assert.deepEqual(data.sources,[]);
  assert.deepEqual(data.workouts,[]);
  assert.equal(data.available,false);
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
