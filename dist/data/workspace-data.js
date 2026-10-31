import {metrics, METRIC_KEYS, TIME_ZONE, validDate, offsetDate, civilDate} from './metrics.js';

const MAX_EVENTS=100000, MAX_WORKOUTS=10000, MAX_BYTES=25_000_000;
const sourceTypes=new Set(['wearable','activity','manual','clinical','file']);
const sourceStatuses=new Set(['connected','not_connected','disconnected','error','planned','syncing','ready']);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
function text(value,label,max=1000) {
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new Error(`Invalid ${label}`);
  return value;
}
function timestamp(value) {
  if(typeof value!=='string')return false;
  const match=value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/);
  return Boolean(match&&validDate(match[1])&&Number(match[2])<24&&Number(match[3])<60&&Number(match[4]||0)<60&&Number.isFinite(Date.parse(value)));
}
function validTimezone(value) {try{new Intl.DateTimeFormat('en-US',{timeZone:value}).format();return true;}catch{return false;}}
function optionalText(value,label,max=1000) {return value==null||value===''?null:text(value,label,max);}
function optionalNumber(value,label) {if(value==null)return null;if(!finite(value)||value<0)throw new Error(`Invalid ${label}`);return value;}

export function emptyWorkspace({now=new Date(),error=null}={}) {
  const current=new Date(now);
  if(!Number.isFinite(current.getTime()))throw new Error('Invalid workspace clock');
  const to=civilDate(current),from=offsetDate(to,-29);
  return {version:1,mode:'empty',profile:{name:'Your workspace',initials:'AW'},sources:[],events:[],workouts:[],range:{from,to},importedAt:current.toISOString(),timezone:TIME_ZONE,notices:[],available:false,error};
}

/** Validate and copy only fields consumed by the workspace. No credentials or raw provider payloads cross this boundary. */
export function validateWorkspace(payload) {
  if(!object(payload)||payload.version!==1||!['local','empty'].includes(payload.mode))throw new Error('Unsupported workspace payload');
  if(!object(payload.profile)||!object(payload.range)||!validDate(payload.range.from)||!validDate(payload.range.to)||payload.range.from>payload.range.to)throw new Error('Invalid workspace dates or profile');
  if((Date.parse(payload.range.to)-Date.parse(payload.range.from))/86400000>3660)throw new Error('Workspace date range is too large');
  if(!Array.isArray(payload.sources)||payload.sources.length>1000||!Array.isArray(payload.events)||payload.events.length>MAX_EVENTS||!Array.isArray(payload.workouts)||payload.workouts.length>MAX_WORKOUTS)throw new Error('Workspace record limits exceeded');
  if(!timestamp(payload.importedAt))throw new Error('Invalid workspace import time');
  const timezone=payload.timezone||TIME_ZONE;
  if(!validTimezone(timezone))throw new Error('Invalid workspace time zone');
  const ids=new Set(),sourceMap=new Map();
  const sources=payload.sources.map(source=>{
    if(!object(source)||!sourceTypes.has(source.sourceType)||!sourceStatuses.has(source.status)||source.isSynthetic!==false)throw new Error('Invalid workspace source');
    const id=text(source.id,'source ID',256);
    if(sourceMap.has(id))throw new Error('Duplicate source ID');
    if(!Array.isArray(source.metricKeys)||source.metricKeys.some(key=>!METRIC_KEYS.includes(key)))throw new Error('Invalid source metrics');
    if(source.lastSyncedAt!=null&&!timestamp(source.lastSyncedAt))throw new Error('Invalid source sync time');
    const result={id,name:text(source.name,'source name',200),sourceType:source.sourceType,status:source.status,metricKeys:[...new Set(source.metricKeys)],isSynthetic:false,lastSyncedAt:source.lastSyncedAt||null,description:optionalText(source.description,'source description')||''};
    if(source.syncStatus!=null)result.syncStatus=text(source.syncStatus,'sync status',50);
    sourceMap.set(id,result);return result;
  });
  const events=payload.events.map(event=>{
    if(!object(event))throw new Error('Invalid health event');
    const id=text(event.id,'event ID',256),source=sourceMap.get(event.sourceId),metric=Object.hasOwn(metrics,event.metricKey)?metrics[event.metricKey]:null;
    if(ids.has(id))throw new Error('Duplicate record ID');ids.add(id);
    if(!source||!metric||!source.metricKeys.includes(event.metricKey)||event.metricLabel!==metric.label||event.unit!==metric.unit||!finite(event.value)||event.value<0||(event.metricKey==='energy'&&(event.value<1||event.value>10)))throw new Error(`Invalid measurement ${id}`);
    if(!['sleep','activity','cardiovascular','wellness_checkin','other'].includes(event.category)||!['valid','estimated','incomplete','invalid'].includes(event.quality))throw new Error(`Invalid measurement category or quality ${id}`);
    if(!timestamp(event.observedAt)||!timestamp(event.importedAt))throw new Error(`Invalid event time ${id}`);
    const eventTimezone=event.timezone||timezone;
    if(!validTimezone(eventTimezone))throw new Error(`Invalid event time zone ${id}`);
    const p=event.provenance;
    if(!object(p)||p.sourceName!==source.name||p.sourceType!==source.sourceType)throw new Error(`Invalid provenance ${id}`);
    if(event.metadata?.isSynthetic===true)throw new Error('Synthetic events are not permitted in a real workspace');
    if(event.originalValue!=null&&!finite(event.originalValue))throw new Error(`Invalid original value ${id}`);
    const day=event.metadata?.civilDate||civilDate(event.observedAt,timezone);
    if(!validDate(day)||day<payload.range.from||day>payload.range.to)throw new Error(`Event lies outside workspace dates ${id}`);
    const dailyAggregate=event.metadata?.aggregate===true&&event.metadata?.timestampPrecision==='day'&&event.metadata?.civilDate;
    if(Date.parse(event.importedAt)<Date.parse(event.observedAt)&&!dailyAggregate)throw new Error(`Invalid event time ${id}`);
    if(dailyAggregate&&day>civilDate(event.importedAt,timezone))throw new Error(`Daily aggregate has a future date ${id}`);
    const metadata={isSynthetic:false};
    if(dailyAggregate){metadata.aggregate=true;metadata.timestampPrecision='day';}
    if(event.metadata?.civilDate)metadata.civilDate=day;
    if(event.metadata?.aggregation)metadata.aggregation=text(event.metadata.aggregation,'aggregation',200);
    if(event.metadata?.checkInId)metadata.checkInId=text(event.metadata.checkInId,'check-in ID',256);
    if(event.metadata?.inputRecordCount!=null)metadata.inputRecordCount=optionalNumber(event.metadata.inputRecordCount,'input record count');
    if(event.metadata?.summary!=null){if(!object(event.metadata.summary))throw new Error('Invalid event summary');metadata.summary={sum:optionalNumber(event.metadata.summary.sum,'summary sum'),count:optionalNumber(event.metadata.summary.count,'summary count')};}
    const provenance={sourceName:source.name,sourceType:source.sourceType,importBatchId:text(p.importBatchId,'import batch ID',256),transformationVersion:text(p.transformationVersion,'transformation version',100)};
    if(p.inputRecordCount!=null)provenance.inputRecordCount=optionalNumber(p.inputRecordCount,'provenance record count');
    return {id,userId:null,sourceId:source.id,sourceRecordId:text(event.sourceRecordId,'source record ID',512),metricKey:metric.key,metricLabel:metric.label,category:event.category,value:event.value,unit:metric.unit,originalValue:event.originalValue??event.value,originalUnit:optionalText(event.originalUnit,'original unit',100)??metric.unit,observedAt:event.observedAt,importedAt:event.importedAt,timezone:eventTimezone,quality:event.quality,provenance,metadata,...(event.durationSeconds==null?{}:{durationSeconds:optionalNumber(event.durationSeconds,'duration')})};
  });
  const workouts=payload.workouts.map(workout=>{
    if(!object(workout)||!sourceMap.has(workout.sourceId)||!validDate(workout.date)||workout.date<payload.range.from||workout.date>payload.range.to||workout.isSynthetic!==false)throw new Error('Invalid workout');
    const id=text(workout.id,'workout ID',256);if(ids.has(id))throw new Error('Duplicate record ID');ids.add(id);
    if(workout.timestamp!=null&&!timestamp(workout.timestamp))throw new Error('Invalid workout time');
    if(!Array.isArray(workout.exercises)||workout.exercises.length>1000)throw new Error('Invalid workout exercises');
    const exercises=workout.exercises.map(exercise=>{
      if(!object(exercise)||!Array.isArray(exercise.sets)||exercise.sets.length>1000)throw new Error('Invalid workout sets');
      return {id:text(String(exercise.id),'exercise ID',256),name:text(exercise.name,'exercise name',300),type:optionalText(exercise.type,'exercise type',100),sets:exercise.sets.map(set=>{
        if(!object(set)||typeof set.completed!=='boolean')throw new Error('Invalid workout set');
        return {weight:optionalNumber(set.weight,'set weight'),reps:optionalNumber(set.reps,'set reps'),rir:optionalNumber(set.rir,'set RIR'),duration:optionalNumber(set.duration,'set duration'),distance:optionalNumber(set.distance,'set distance'),completed:set.completed,type:optionalText(set.type,'set type',100)};
      })};
    });
    return {id,sourceId:workout.sourceId,sourceRecordId:text(workout.sourceRecordId,'workout source ID',512),title:text(workout.title,'workout title',300),date:workout.date,timestamp:workout.timestamp||null,weightUnit:optionalText(workout.weightUnit,'weight unit',100),exercises,exerciseCount:exercises.length,savedSetCount:exercises.reduce((n,e)=>n+e.sets.length,0),completedSetCount:exercises.reduce((n,e)=>n+e.sets.filter(s=>s.completed).length,0),isSynthetic:false};
  });
  if(payload.mode==='empty'&&(sources.length||events.length||workouts.length))throw new Error('Empty workspace contains records');
  if(!Array.isArray(payload.notices)||payload.notices.length>100)throw new Error('Invalid workspace notices');
  return {version:1,mode:payload.mode,profile:{name:text(payload.profile.name,'profile name',200),initials:text(payload.profile.initials,'profile initials',10)},sources,events,workouts,range:{from:payload.range.from,to:payload.range.to},importedAt:payload.importedAt,timezone,notices:payload.notices.map(note=>text(note,'workspace notice',2000)),available:payload.available??payload.mode==='local',error:payload.error?text(payload.error,'workspace error',1000):null};
}

export async function loadWorkspace({fetchImpl=globalThis.fetch,url='/api/workspace',now=new Date()}={}) {
  try {
    if(typeof fetchImpl!=='function')throw new Error('Workspace connection is unavailable');
    if(typeof url!=='string'||!url.startsWith('/')||url.startsWith('//'))throw new Error('Workspace endpoint must be same-origin');
    const response=await fetchImpl(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(response.status===404)return emptyWorkspace({now});
    if(!response.ok)throw new Error(`Workspace connection returned HTTP ${response.status}`);
    const length=Number(response.headers?.get?.('content-length'));
    if(length>MAX_BYTES)throw new Error('Workspace response is too large');
    const payload=typeof response.text==='function'?await response.text():null;
    if(payload!==null&&payload.length>MAX_BYTES)throw new Error('Workspace response is too large');
    return {...validateWorkspace(payload===null?await response.json():JSON.parse(payload)),available:true};
  } catch(error) {return emptyWorkspace({now,error:String(error?.message||'Could not load the workspace').slice(0,1000)});}
}
