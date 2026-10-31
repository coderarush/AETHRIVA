import {metrics, METRIC_KEYS, TIME_ZONE, validDate, offsetDate, civilDate} from './metrics.js';
import {withMeasurementQuality} from '../connections/bluetooth.js';

const MAX_EVENTS=100000, MAX_WORKOUTS=10000, MAX_DEVICE_READINGS=10000, MAX_BYTES=25_000_000;
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
function optionalInteger(value,label,max) {const result=optionalNumber(value,label);if(result!==null&&(!Number.isInteger(result)||result>max))throw new Error(`Invalid ${label}`);return result;}
function deviceClock(value) {
  if(value==null)return null;
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)||!timestamp(`${value}Z`))throw new Error('Invalid device clock time');
  return value; // The monitor's local clock has no known time zone.
}

/** Share the journal and browser boundary: accepted readings contain only supported decoder fields. */
export function validateDeviceReading(record) {
  if(!object(record)||record.sourceId!=='bluetooth'||record.isSynthetic===true)throw new Error('Invalid device reading');
  const id=text(record.id,'device reading ID',256),deviceName=text(record.deviceName,'device name',200);
  if(!timestamp(record.receivedAt))throw new Error('Invalid device receipt time');
  const input=record.sample;
  if(!object(input)||input.isSynthetic===true||input.usable!==true||input.rejectionReason!=null||!timestamp(input.timestamp)||Date.parse(input.timestamp)>Date.parse(record.receivedAt))throw new Error('Invalid device measurement time or quality');
  let sample={kind:input.kind,timestamp:input.timestamp,unit:input.unit};
  if(input.kind==='heart_rate') {
    if(input.unit!=='bpm')throw new Error('Invalid heart-rate unit');
    const bpm=optionalInteger(input.bpm,'heart rate',65535);
    if(bpm===null)throw new Error('Heart-rate measurement is unavailable');
    const contactSupported=input.contactSupported??false,contactDetected=input.contactDetected??null;
    if(typeof contactSupported!=='boolean'||(contactSupported?typeof contactDetected!=='boolean':contactDetected!==null))throw new Error('Invalid heart-rate contact flags');
    const intervals=input.rrIntervalsSeconds??[];
    if(!Array.isArray(intervals)||intervals.length>1000||intervals.some(value=>!finite(value)||value<0))throw new Error('Invalid heart-rate intervals');
    Object.assign(sample,{bpm,contactSupported,contactDetected,energyExpendedKJ:optionalInteger(input.energyExpendedKJ,'energy expended',65535),rrIntervalsSeconds:[...intervals]});
  } else if(input.kind==='blood_pressure') {
    if(!['mmHg','kPa'].includes(input.unit))throw new Error('Invalid blood-pressure unit');
    for(const key of ['systolic','diastolic','meanPressure','pulseRate'])sample[key]=optionalNumber(input[key],`blood-pressure ${key}`);
    Object.assign(sample,{deviceTimestamp:deviceClock(input.deviceTimestamp),userId:optionalInteger(input.userId,'device user ID',255),measurementStatus:optionalInteger(input.measurementStatus,'measurement status',65535)});
  } else if(input.kind==='pulse_oximeter') {
    if(input.unit!=='%'||!['spot-check','continuous'].includes(input.mode))throw new Error('Invalid pulse-oximeter unit or mode');
    const pair=value=>{
      if(!object(value))throw new Error('Invalid pulse-oximeter measurement pair');
      return {spo2:optionalNumber(value.spo2,'oxygen saturation'),pulseRate:optionalNumber(value.pulseRate,'pulse rate')};
    };
    Object.assign(sample,pair(input),{mode:input.mode,deviceTimestamp:deviceClock(input.deviceTimestamp),measurementStatus:optionalInteger(input.measurementStatus,'measurement status',65535),deviceSensorStatus:optionalInteger(input.deviceSensorStatus,'device sensor status',16777215),pulseAmplitudeIndex:optionalNumber(input.pulseAmplitudeIndex,'pulse amplitude index')});
    if(input.clockNotSet!=null) {
      if(typeof input.clockNotSet!=='boolean')throw new Error('Invalid device clock status');
      sample.clockNotSet=input.clockNotSet;
      if(input.clockNotSet)sample.deviceTimestamp=null;
    }
    for(const key of ['fast','slow'])if(Object.hasOwn(input,key))sample[key]=input[key]===null?null:pair(input[key]);
  } else throw new Error('Unsupported device measurement');
  // Never trust posted usable flags or warning text to override the monitor's status bits.
  sample=withMeasurementQuality(sample);
  if(!sample.usable)throw new Error(sample.rejectionReason||'Device measurement is unavailable');
  return {id,sourceId:'bluetooth',deviceName,receivedAt:record.receivedAt,sample};
}

export function emptyWorkspace({now=new Date(),error=null}={}) {
  const current=new Date(now);
  if(!Number.isFinite(current.getTime()))throw new Error('Invalid workspace clock');
  const to=civilDate(current),from=offsetDate(to,-29);
  return {version:1,mode:'empty',profile:{name:'Your workspace',initials:'AW'},sources:[],events:[],workouts:[],deviceReadings:[],range:{from,to},importedAt:current.toISOString(),timezone:TIME_ZONE,notices:[],available:false,error};
}

/** Validate and copy only fields consumed by the workspace. No credentials or raw provider payloads cross this boundary. */
export function validateWorkspace(payload) {
  if(!object(payload)||payload.version!==1||!['local','empty'].includes(payload.mode))throw new Error('Unsupported workspace payload');
  if(!object(payload.profile)||!object(payload.range)||!validDate(payload.range.from)||!validDate(payload.range.to)||payload.range.from>payload.range.to)throw new Error('Invalid workspace dates or profile');
  if((Date.parse(payload.range.to)-Date.parse(payload.range.from))/86400000>3660)throw new Error('Workspace date range is too large');
  const rawDeviceReadings=payload.deviceReadings??[];
  if(!Array.isArray(payload.sources)||payload.sources.length>1000||!Array.isArray(payload.events)||payload.events.length>MAX_EVENTS||!Array.isArray(payload.workouts)||payload.workouts.length>MAX_WORKOUTS||!Array.isArray(rawDeviceReadings)||rawDeviceReadings.length>MAX_DEVICE_READINGS)throw new Error('Workspace record limits exceeded');
  if(!timestamp(payload.importedAt))throw new Error('Invalid workspace import time');
  const timezone=payload.timezone||TIME_ZONE;
  if(!validTimezone(timezone))throw new Error('Invalid workspace time zone');
  const ids=new Set(),sourceMap=new Map();
  const sources=payload.sources.map(source=>{
    if(!object(source)||!sourceTypes.has(source.sourceType)||!sourceStatuses.has(source.status)||source.isSynthetic!==false)throw new Error('Invalid workspace source');
    const id=text(source.id,'source ID',256);
    if(sourceMap.has(id))throw new Error('Duplicate source ID');
    if(!Array.isArray(source.metricKeys)||source.metricKeys.some(key=>!METRIC_KEYS.includes(key)))throw new Error('Invalid source metrics');
    if((id==='bluetooth'&&source.metricKeys.length)||(id==='checkins'&&(source.sourceType!=='manual'||source.metricKeys.length!==1||source.metricKeys[0]!=='energy')))throw new Error('Invalid journal source metrics');
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
  const deviceReadings=rawDeviceReadings.map(record=>{
    const reading=validateDeviceReading(record);
    if(!sourceMap.has(reading.sourceId))throw new Error('Missing device reading source');
    if(ids.has(reading.id))throw new Error('Duplicate record ID');ids.add(reading.id);
    const day=civilDate(reading.sample.timestamp,timezone);
    if(day<payload.range.from||day>payload.range.to)throw new Error('Device reading lies outside workspace dates');
    return reading;
  });
  if(payload.mode==='empty'&&(sources.length||events.length||workouts.length||deviceReadings.length))throw new Error('Empty workspace contains records');
  if(!Array.isArray(payload.notices)||payload.notices.length>100)throw new Error('Invalid workspace notices');
  const availability={};
  for(const key of ['cache','journal'])if(payload[key]!==undefined){if(!object(payload[key])||typeof payload[key].available!=='boolean')throw new Error('Invalid workspace availability');availability[key]={available:payload[key].available};}
  return {...availability,version:1,mode:payload.mode,profile:{name:text(payload.profile.name,'profile name',200),initials:text(payload.profile.initials,'profile initials',10)},sources,events,workouts,deviceReadings,range:{from:payload.range.from,to:payload.range.to},importedAt:payload.importedAt,timezone,notices:payload.notices.map(note=>text(note,'workspace notice',2000)),available:payload.available??payload.mode==='local',error:payload.error?text(payload.error,'workspace error',1000):null};
}

function safeConnectionMessage(value) {
  return typeof value==='string'&&value.length<=300&&/^[\p{L}\p{N} .,;:!?'"()–—-]+$/u.test(value)?value:null;
}

async function backendFailureMessage(response) {
  try {
    if(Number(response.headers?.get?.('content-length'))>4096)return null;
    const body=typeof response.text==='function'?await response.text():null;
    if(body!==null&&body.length>4096)return null;
    const payload=body===null?await response.json():JSON.parse(body);
    if(!object(payload))return null;
    return safeConnectionMessage(payload.message)||safeConnectionMessage(payload.error);
  } catch {return null;}
}

export async function loadWorkspace({fetchImpl=globalThis.fetch,url='/api/workspace',now=new Date()}={}) {
  let timeoutId;
  try {
    if(typeof fetchImpl!=='function')throw new Error('Workspace connection is unavailable');
    if(typeof url!=='string'||!url.startsWith('/')||url.startsWith('//'))throw new Error('Workspace endpoint must be same-origin');
    let signal;
    if(typeof globalThis.AbortSignal?.timeout==='function')signal=globalThis.AbortSignal.timeout(8000);
    else {
      const controller=new AbortController();signal=controller.signal;
      timeoutId=setTimeout(()=>controller.abort(new DOMException('Workspace request timed out','TimeoutError')),8000);
    }
    const response=await fetchImpl(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal});
    if(response.status===404)return emptyWorkspace({now});
    if(response.status===503) {
      const message=await backendFailureMessage(response);
      throw new Error(message?`Workspace connection returned HTTP 503. ${message}`:'The local workspace is unavailable (HTTP 503). Check the local server and try again.');
    }
    if(!response.ok)throw new Error(`Workspace connection returned HTTP ${response.status}`);
    const length=Number(response.headers?.get?.('content-length'));
    if(length>MAX_BYTES)throw new Error('Workspace response is too large');
    const payload=typeof response.text==='function'?await response.text():null;
    if(payload!==null&&payload.length>MAX_BYTES)throw new Error('Workspace response is too large');
    return {...validateWorkspace(payload===null?await response.json():JSON.parse(payload)),available:true};
  } catch(error) {
    const message=['TimeoutError','AbortError'].includes(error?.name)?'The workspace connection timed out. Check the local server and try again.':safeConnectionMessage(error?.message)||'Could not load the workspace. Check the local server and try again.';
    return emptyWorkspace({now,error:message});
  } finally {if(timeoutId!==undefined)clearTimeout(timeoutId);}
}
