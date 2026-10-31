import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEnergyCheckin,renderDeviceHistory} from '../dist/pages/journal.js';
import {renderReports} from '../dist/pages/workspace.js';
import {saveCheckin,saveDeviceReadings} from '../dist/data/journal-client.js';
import {emptyWorkspace,validateWorkspace} from '../dist/data/workspace-data.js';
import {createHealthService} from '../dist/data/health-service.js';

async function context() {
  const workspace={...emptyWorkspace({now:'2026-10-30T23:00:00Z'}),mode:'local',sources:[],events:[],workouts:[],deviceReadings:[]};
  const state={from:'2026-10-01',to:'2026-10-30',selectedDate:'2026-10-30',sourceIds:['lyfta','bluetooth'],metricKey:'all'};
  const service=createHealthService(workspace),filters={from:state.from,to:state.to,sourceIds:[]};
  return {workspace,state,filters,sources:[],events:[],journalUI:{},summary:await service.summarize(filters),comparison:await service.comparePeriods(filters),insights:[]};
}
test('local check-in form requires actual input and preserves an unsaved draft',async()=>{
  const ctx=await context();let html=renderEnergyCheckin(ctx);
  assert.match(html,/Choose a rating/);assert.doesNotMatch(html,/value="[1-9]" selected/);
  ctx.journalUI.checkinDraft={date:'2026-10-22',energy:4};html=renderEnergyCheckin(ctx);
  assert.match(html,/value="2026-10-22"/);assert.match(html,/value="4" selected/);
  ctx.workspace.mode='empty';assert.equal(renderEnergyCheckin(ctx),'');
});
test('check-in fields are disabled during a pending save so later edits cannot be discarded',async()=>{
  const ctx=await context();ctx.journalUI.savingCheckin=true;
  const html=renderEnergyCheckin(ctx);
  assert.match(html,/<input id="checkin-date"[^>]*disabled/);
  assert.match(html,/<select id="checkin-energy"[^>]*disabled/);
});
test('device history preserves BP units, warnings and source scope in reports',async()=>{
  const ctx=await context();ctx.workspace.deviceReadings=[{id:'reading-1',sourceId:'bluetooth',deviceName:'<My cuff>',receivedAt:'2026-10-30T23:00:00Z',sample:{kind:'blood_pressure',timestamp:'2026-10-30T22:00:00Z',systolic:16.2,diastolic:10.4,unit:'kPa',qualityWarnings:['Movement reported.'],measurementStatus:1}}];
  const html=await renderReports(ctx);assert.match(html,/1 device readings/);assert.match(html,/16.2 \/ 10.4 kPa/);assert.match(html,/Movement reported/);assert.match(html,/&lt;My cuff&gt;/);
  ctx.sources=[{id:'bluetooth',name:'Bluetooth monitors',status:'ready'}];
  ctx.workspace.cache={available:false};
  const degraded=await renderReports(ctx);assert.match(degraded,/1 days with records · 1 represented sources/);assert.match(degraded,/Provider history unavailable/);
  ctx.state.sourceIds=[];assert.equal(renderDeviceHistory(ctx),'');
});
test('Lyfta-only reports include workout counts and expanded printable exercise details',async()=>{
  const ctx=await context();ctx.state.sourceIds=['lyfta'];ctx.workspace.workouts=[{id:'workout-1',sourceId:'lyfta',title:'Training',date:'2026-10-24',weightUnit:'kg',exercises:[{id:'a',name:'Squat',sets:[{weight:0,reps:5,completed:true}]}]}];
  const html=await renderReports(ctx);assert.match(html,/1 workouts/);assert.match(html,/workout-record" open/);assert.match(html,/Squat/);assert.match(html,/0 kg/);
});
test('write client surfaces backend errors and validates returned snapshots',async()=>{
  await assert.rejects(saveCheckin({date:'2026-10-30',energy:4},{fetchImpl:async()=>({ok:false,status:400,json:async()=>({error:{message:'Choose an energy rating from 1 to 10.'}})})}),/Choose an energy/);
  let sent;
  const workspace=emptyWorkspace({now:'2026-10-30T23:00:00Z'});
  const result=await saveDeviceReadings({device:{name:'Test monitor'},samples:[]},{fetchImpl:async(path,options)=>{sent={path,options};return {ok:true,json:async()=>({inserted:0,workspace})};}});
  assert.equal(sent.path,'/api/device-readings');assert.equal(sent.options.method,'POST');assert.equal(sent.options.credentials,'same-origin');assert.equal(result.workspace.mode,'empty');
});

test('availability survives validation without copying arbitrary backend fields',()=>{
  const data={...emptyWorkspace(),mode:'local',cache:{available:false,secret:'must not cross boundary'},journal:{available:true}};
  const result=validateWorkspace(data);assert.deepEqual(result.cache,{available:false});assert.deepEqual(result.journal,{available:true});
  assert.throws(()=>validateWorkspace({...data,cache:{available:'yes'}}),/availability/);
});

test('device tables paginate interactively while reports retain every selected reading',async()=>{
  const ctx=await context();ctx.workspace.deviceReadings=Array.from({length:130},(_,i)=>({id:`r-${i}`,sourceId:'bluetooth',deviceName:'Test monitor',receivedAt:'2026-10-30T23:00:00Z',sample:{kind:'heart_rate',timestamp:'2026-10-30T22:00:00Z',bpm:60,unit:'bpm',qualityWarnings:[]}}));
  assert.equal((renderDeviceHistory(ctx).match(/<tr>/g)||[]).length,101);
  ctx.journalUI.devicePage=1;assert.equal((renderDeviceHistory(ctx).match(/<tr>/g)||[]).length,31);
  assert.equal((renderDeviceHistory(ctx,{printable:true}).match(/<tr>/g)||[]).length,131);
});
