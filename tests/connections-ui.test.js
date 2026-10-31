import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkspace} from '../dist/data/workspace-data.js';
import {createHealthService} from '../dist/data/health-service.js';
import {createWorkspaceState} from '../dist/workspace-state.js';
import {renderOverview,renderRecovery} from '../dist/pages/experience.js';
import {renderConnect,renderInsights,renderTimeline,renderReports,renderAbout} from '../dist/pages/workspace.js';
import {renderWorkouts} from '../dist/pages/workouts.js';

async function context(workspace=emptyWorkspace({now:'2026-06-20T20:00:00Z'})) {
  const state=createWorkspaceState(workspace).createInitialState(),service=createHealthService(workspace),filters={from:state.from,to:state.to,sourceIds:state.sourceIds};
  return {workspace,state,filters,sources:workspace.sources,events:workspace.events,summary:await service.summarize(filters),comparison:await service.comparePeriods(filters),insights:await service.buildInsights(filters),connectionUI:{query:'',category:'all',selectedDevice:null,refreshing:false,bluetooth:{status:'unsupported',available:false,samples:[],message:'Use a supported browser.'}}};
}

test('all public first-run surfaces are empty and omit fictional identity and demo claims',async()=>{
  const ctx=await context();
  for(const renderer of [renderOverview,renderRecovery,renderConnect,renderInsights,renderTimeline,renderReports,renderAbout]) {
    const html=await renderer(ctx);assert.doesNotMatch(html,/Alex Taylor|synthetic|fictional|demo workspace|Reset demo/i);
    assert.doesNotMatch(html,/evt_sleep_duration|7700|7,700/);
  }
  assert.match(await renderOverview(ctx),/Connect a source/);
  assert.match(await renderRecovery(ctx),/Not recorded/);
  assert.doesNotMatch(await renderRecovery(ctx),/Hidden by filters/);
});

test('catalog search precedes setup sections, escapes input, and does not fake ECG connection',async()=>{
  const ctx=await context();ctx.connectionUI.query='Kardia';ctx.connectionUI.selectedDevice='kardia-mobile-6l';
  let html=await renderConnect(ctx);
  assert.ok(html.indexOf('id="device-search"')<html.indexOf('id="connected-history-title"'));
  assert.match(html,/Kardia/);assert.doesNotMatch(html,/data-bluetooth-connect="kardia/);
  ctx.connectionUI.query='<img src=x onerror=alert(1)>';
  html=await renderConnect(ctx);assert.doesNotMatch(html,/<img src=x/);assert.match(html,/No matching device yet/);
});

test('live BP and pulse-ox readings retain units, unavailable values and sensor warnings',async()=>{
  const ctx=await context();
  ctx.connectionUI.bluetooth={status:'receiving',available:true,connected:true,samples:[],profile:'blood_pressure',latestSample:{kind:'blood_pressure',systolic:16.2,diastolic:10.4,unit:'kPa',timestamp:'2026-06-20T20:00:00Z',qualityWarnings:['Cuff fit warning.']}};
  let html=await renderConnect(ctx);assert.match(html,/16.2 \/ 10.4/);assert.match(html,/kPa/);assert.match(html,/Cuff fit warning/);
  ctx.connectionUI.bluetooth.latestSampleStale=true;ctx.connectionUI.bluetooth.errorCode='unusable_measurement';
  ctx.connectionUI.bluetooth.latestSample={kind:'pulse_oximeter',spo2:null,pulseRate:70,timestamp:'2026-06-20T20:00:00Z',qualityWarnings:[]};
  html=await renderConnect(ctx);assert.match(html,/Previous reading · Latest measurement rejected/);assert.match(html,/— <small>%/);assert.doesNotMatch(html,/>0 <small>%/);
});

test('Lyfta details preserve zero, unknown units and completion state within source/date scope',async()=>{
  const ctx=await context();ctx.state.sourceIds=['lyfta'];
  ctx.workspace.workouts=[{id:'test_workout',sourceId:'lyfta',title:'<Legs>',date:'2026-06-19',weightUnit:null,exercises:[{id:'exercise',name:'Squat',sets:[{weight:0,reps:0,rir:null,completed:false},{weight:20,reps:5,rir:2,completed:true}]}]}];
  const html=renderWorkouts(ctx);assert.match(html,/&lt;Legs&gt;/);assert.match(html,/1 completed sets/);assert.match(html,/0 unit not supplied/);assert.match(html,/Not marked complete/);
  ctx.state.sourceIds=[];assert.doesNotMatch(renderWorkouts(ctx),/workout-record/);
});
