/** Canonical daily measurements shared by the real workspace and its adapters. */
export const metrics = Object.freeze({
  sleep_duration:Object.freeze({key:'sleep_duration',label:'Sleep duration',unit:'min',color:'#b9a4ff'}),
  steps:Object.freeze({key:'steps',label:'Steps',unit:'steps',color:'#ff9a62'}),
  resting_heart_rate:Object.freeze({key:'resting_heart_rate',label:'Resting heart rate',unit:'bpm',color:'#86b0ff'}),
  energy:Object.freeze({key:'energy',label:'Self-reported energy',unit:'/10',color:'#69d5ba'}),
});
export const METRIC_KEYS = Object.freeze(Object.keys(metrics));
export const TIME_ZONE = 'America/Los_Angeles';

export function validDate(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const parsed=new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
export function offsetDate(date, days) {
  return new Date(Date.parse(`${date}T12:00:00Z`)+days*86400000).toISOString().slice(0,10);
}
export function civilDate(timestamp, timezone=TIME_ZONE) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp));
}
