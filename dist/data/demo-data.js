/**
 * @typedef {Object} HealthEvent
 * @property {string} id
 * @property {null} userId
 * @property {string} sourceId
 * @property {string} [sourceRecordId]
 * @property {string} metricKey
 * @property {string} metricLabel
 * @property {'sleep'|'activity'|'cardiovascular'|'wellness_checkin'|'other'} category
 * @property {number|string|boolean} value
 * @property {string|null} unit
 * @property {number|string|boolean} [originalValue]
 * @property {string|null} [originalUnit]
 * @property {string} observedAt
 * @property {string} importedAt
 * @property {string} [timezone]
 * @property {number} [durationSeconds]
 * @property {'valid'|'estimated'|'incomplete'|'invalid'} quality
 * @property {{sourceName:string,sourceType:string,importBatchId:string,transformationVersion:string}} provenance
 * @property {Object} metadata
 *
 * @typedef {{id:string,name:string,sourceType:'wearable'|'activity'|'manual'|'clinical'|'file',status:'demo_loaded'|'connected'|'not_connected'|'error'|'planned',isSynthetic:boolean,lastSyncedAt?:string,description?:string}} HealthSource
 * @typedef {{id:string,observedAt:string,energy:number|null,perceivedRecovery:number|null,stress:number|null,note?:string,sourceId:string,isSynthetic:boolean}} WellnessCheckIn
 */
export const DEMO_START = '2026-10-01';
export const DEMO_END = '2026-10-30';
export const TIME_ZONE = 'America/Los_Angeles';
export const AS_OF = '2026-10-30T16:00:00-07:00';
export const IMPORTED_AT = '2026-10-30T16:00:00-07:00';
export const metrics = {
  sleep_duration: {key:'sleep_duration', label:'Sleep duration', unit:'min', color:'#b9a4ff'},
  steps: {key:'steps', label:'Steps', unit:'steps', color:'#ff9a62'},
  resting_heart_rate: {key:'resting_heart_rate', label:'Resting heart rate', unit:'bpm', color:'#86b0ff'},
  energy: {key:'energy', label:'Self-reported energy', unit:'/10', color:'#69d5ba'},
};
export const demoProfile = {name:'Alex Taylor', initials:'AT', description:'Fictional Pacific-time profile · October 2026 · synthetic records'};
/** @type {HealthSource[]} */
export const sources = [
  {id:'wearable', name:'Wearable export', sourceType:'wearable', status:'demo_loaded', isSynthetic:true, lastSyncedAt:IMPORTED_AT, description:'Synthetic sleep and resting-heart-rate observations.'},
  {id:'activity', name:'Activity tracker export', sourceType:'activity', status:'demo_loaded', isSynthetic:true, lastSyncedAt:IMPORTED_AT, description:'Synthetic daily step totals, including one observed zero.'},
  {id:'checkin', name:'Daily check-ins', sourceType:'manual', status:'demo_loaded', isSynthetic:true, lastSyncedAt:IMPORTED_AT, description:'Synthetic self-reported energy on a personal 1–10 scale; not a clinical instrument.'},
  {id:'clinical', name:'Clinical records', sourceType:'clinical', status:'planned', isSynthetic:true, description:'Available in a future release. Not connected.'},
];
/** @type {HealthEvent[]} */
export const events = [];
/** @type {WellnessCheckIn[]} */
export const checkins = [];
const lowDays = new Set([3,4,8,12,13,18,19,24,25]);
function add(day, metricKey, value, sourceId, category, hour, extra={}) {
  const source = sources.find(s => s.id === sourceId);
  const date = `2026-10-${String(day).padStart(2,'0')}`;
  if(day===30 && Number(hour)>15) hour='15';
  const id = `evt_${metricKey}_${String(day).padStart(2,'0')}`;
  events.push({id, userId:null, sourceId, sourceRecordId:`raw_${id}`, metricKey, metricLabel:metrics[metricKey].label,
    category, value, unit:metrics[metricKey].unit, originalValue:value, originalUnit:metrics[metricKey].unit,
    observedAt:`${date}T${hour}:00:00-07:00`, importedAt:IMPORTED_AT, timezone:TIME_ZONE, quality:'valid',
    provenance:{sourceName:source.name,sourceType:source.sourceType,importBatchId:'demo_october_2026',transformationVersion:'1.0.0'}, metadata:{isSynthetic:true,...extra}});
}
for (let day=1; day<=30; day++) {
  const low = lowDays.has(day);
  const later = day > 15;
  if (![6,19].includes(day)) add(day,'sleep_duration', Math.round(((low ? 5.7 : 7.1) + (day%3)*0.2 + (later?0.4:0))*60), 'wearable','sleep','07');
  if (![11,22].includes(day)) add(day,'steps', day===4 ? 0 : (low?2800:6800)+(day%5)*430+(later?900:0), 'activity','activity','21');
  if (![5,12,20,27].includes(day)) add(day,'resting_heart_rate',(low?65:59)+(day%3)-(later?2:0), 'wearable','cardiovascular','07');
  if (![9,23].includes(day)) {
    const id = `checkin_${String(day).padStart(2,'0')}`;
    const observedAt = `2026-10-${String(day).padStart(2,'0')}T${day===30?'15':'20'}:00:00-07:00`;
    const energy = low ? 3+(day%2) : 6+(day%3);
    checkins.push({id, observedAt, energy, perceivedRecovery:null, stress:null, sourceId:'checkin', isSynthetic:true,
      note:low?'A quieter day; felt less energetic.':'A usual day; energy felt steady.'});
    add(day,'energy',energy,'checkin','wellness_checkin','20',{checkInId:id});
  }
}

/** Reject malformed canonical records before analytics can consume them. */
export function validateFixture(data={events,sources,checkins}) {
  const ids = new Set();
  const sourceIds = new Set();
  for (const source of data.sources) {
    if (!source.id || sourceIds.has(source.id) || !source.name || !['wearable','activity','manual','clinical','file'].includes(source.sourceType) || !['demo_loaded','connected','not_connected','error','planned'].includes(source.status) || source.isSynthetic !== true) throw new Error('Invalid source');
    sourceIds.add(source.id);
  }
  for (const event of data.events) {
    const metric = Object.hasOwn(metrics,event.metricKey) ? metrics[event.metricKey] : null;
    const source = data.sources.find(s=>s.id===event.sourceId);
    if (!event.id || ids.has(event.id)) throw new Error('Invalid or duplicate event ID');
    ids.add(event.id);
    if (!source || !metric || event.metricLabel!==metric.label || !['sleep','activity','cardiovascular','wellness_checkin','other'].includes(event.category) || typeof event.value !== 'number' || !Number.isFinite(event.value) || event.value < 0 || event.unit !== metric.unit || (event.metricKey==='energy' && (event.value<1 || event.value>10))) throw new Error(`Invalid measurement ${event.id}`);
    if (event.userId !== null || event.timezone !== TIME_ZONE || !/^2026-10-\d{2}T\d{2}:\d{2}:\d{2}-07:00$/.test(event.observedAt) || !Number.isFinite(Date.parse(event.observedAt)) || event.observedAt.slice(0,10)<DEMO_START || event.observedAt.slice(0,10)>DEMO_END || !Number.isFinite(Date.parse(event.importedAt)) || Date.parse(event.importedAt)<Date.parse(event.observedAt) || Date.parse(event.importedAt)>Date.parse(AS_OF)) throw new Error(`Invalid event time ${event.id}`);
    const p = event.provenance;
    if (!p || p.sourceName!==source.name || p.sourceType!==source.sourceType || !p.importBatchId || !p.transformationVersion || !event.sourceRecordId || event.originalValue!==event.value || event.originalUnit!==event.unit || !event.metadata?.isSynthetic) throw new Error(`Invalid provenance ${event.id}`);
    if (!['valid','estimated','incomplete','invalid'].includes(event.quality)) throw new Error('Invalid quality');
  }
  const checkIds = new Set();
  for (const c of data.checkins) {
    if (!c.id || checkIds.has(c.id) || !sourceIds.has(c.sourceId) || c.isSynthetic!==true || (c.energy!==null && (!Number.isFinite(c.energy)||c.energy<1||c.energy>10))) throw new Error('Invalid checkin');
    for (const v of [c.perceivedRecovery,c.stress]) if(v!==null && (typeof v!=='number'||!Number.isFinite(v))) throw new Error('Invalid checkin scale');
    if(!Number.isFinite(Date.parse(c.observedAt)) || (c.note!==undefined && typeof c.note!=='string'))throw new Error('Invalid checkin details');
    checkIds.add(c.id);
    const matches = data.events.filter(e=>e.metadata?.checkInId===c.id);
    if (c.energy===null && matches.length) throw new Error('Checkin without energy must not have an energy event');
    if (c.energy!==null && (matches.length!==1 || matches[0].value!==c.energy || matches[0].metricKey!=='energy' || matches[0].observedAt!==c.observedAt || matches[0].sourceId!==c.sourceId)) throw new Error('Checkin energy must be represented once');
  }
  for (const e of data.events.filter(e=>e.metricKey==='energy')) if (!checkIds.has(e.metadata?.checkInId)) throw new Error('Unknown checkin provenance');
  return true;
}
validateFixture();
function deepFreeze(value) { Object.freeze(value); for (const child of Object.values(value)) if (child && typeof child==='object' && !Object.isFrozen(child)) deepFreeze(child); return value; }
[sources,events,checkins,metrics,demoProfile].forEach(deepFreeze);
