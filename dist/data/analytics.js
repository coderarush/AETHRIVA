import {metrics,sources,DEMO_START,DEMO_END,TIME_ZONE,AS_OF} from './demo-data.js';
/** @typedef {{id:string,calculationType:'summary'|'period_comparison'|'rolling_average'|'association',metricKeys:string[],periodStart:string,periodEnd:string,pairedSampleCount?:number,values:Object<string,number|string|null>,method:string,sourceRecordIds:string[],limitations:string[],createdAt:string}} CalculationResult */
export const BASE_LIMITATIONS = ['All records are synthetic demonstration data.','Missing observations are excluded from calculations; missing values are not zero.'];
const dayFormatter = new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
export function pacificDate(timestamp) { return dayFormatter.format(new Date(timestamp)); }
function validDate(value) { return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)===value; }
export function normalizeFilters(filters={}) {
  if (!filters || typeof filters!=='object' || Array.isArray(filters)) throw new Error('Invalid filters');
  const {from=DEMO_START,to=DEMO_END,sourceIds=sources.map(s=>s.id),metricKey='all'}=filters;
  if (!validDate(from)||!validDate(to)||from>to) throw new Error('Invalid date range');
  if ((Date.parse(`${to}T12:00Z`)-Date.parse(`${from}T12:00Z`))/86400000>3660) throw new Error('Date range too large');
  if (!Array.isArray(sourceIds)||sourceIds.some(id=>!sources.some(s=>s.id===id))) throw new Error('Unknown source filter');
  if (metricKey!=='all'&&!Object.hasOwn(metrics,metricKey)) throw new Error('Unknown metric filter');
  return {from,to,sourceIds:[...new Set(sourceIds)].sort(),metricKey};
}
export function datesInRange(from,to) {
  const dates=[];
  for(let n=Date.parse(`${from}T12:00:00Z`);n<=Date.parse(`${to}T12:00:00Z`);n+=86400000) dates.push(new Date(n).toISOString().slice(0,10));
  return dates;
}
export function selectRecords(records,filters={}) {
  const f=normalizeFilters(filters);
  return records.filter(e=>f.sourceIds.includes(e.sourceId)&&(f.metricKey==='all'||e.metricKey===f.metricKey)&&pacificDate(e.observedAt)>=f.from&&pacificDate(e.observedAt)<=f.to).sort((a,b)=>a.observedAt.localeCompare(b.observedAt)||a.id.localeCompare(b.id));
}
const usable = records=>records.filter(e=>e.quality!=='invalid'&&Number.isFinite(e.value));
const mean = values=>values.length?values.reduce((s,v)=>s+v,0)/values.length:null;
function hash(input) {let a=2166136261,b=5381;for(const c of input){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b,33)^c.charCodeAt(0);}return `${(a>>>0).toString(36)}${(b>>>0).toString(36)}`;}
/** Every calculation lists ALL inputs; resolving those IDs reconstructs its selected observations. */
export function calculation(type,keys,filters,records,values,method,limitations=[],pairedSampleCount) {
  const f=normalizeFilters(filters);
  const ordered=[...records].sort((a,b)=>a.id.localeCompare(b.id));
  const signature=JSON.stringify([type,keys,f,method,ordered.map(e=>[e.id,e.value,e.observedAt]),values]);
  return {id:`calc_${type}_${keys.join('_')}_${hash(signature)}`,calculationType:type,metricKeys:keys,periodStart:f.from,periodEnd:f.to,...(pairedSampleCount===undefined?{}:{pairedSampleCount}),values,method,sourceRecordIds:ordered.map(e=>e.id),limitations:[...BASE_LIMITATIONS,...limitations],createdAt:AS_OF};
}
export function dailySeries(records,key,dates) {
  const grouped=new Map();
  for(const r of usable(records).filter(e=>e.metricKey===key)){const d=pacificDate(r.observedAt);if(!grouped.has(d))grouped.set(d,[]);grouped.get(d).push(r);}
  return dates.map(date=>{const rows=grouped.get(date)||[];return {date,value:mean(rows.map(r=>r.value)),recordIds:rows.map(r=>r.id)};});
}
export function summarizeRecords(records,filters={}) {
  const f=normalizeFilters(filters),selected=selectRecords(records,f),dates=datesInRange(f.from,f.to);
  const seriesByMetric={},calculations=[],coverageMetrics={};
  for(const key of Object.keys(metrics)) {
    const series=dailySeries(selected,key,dates);seriesByMetric[key]=series;
    const values=series.map(p=>p.value).filter(v=>v!==null),sorted=[...values].sort((a,b)=>a-b),n=values.length;
    const observedDays=n,missingDays=dates.length-n;
    coverageMetrics[key]={observedDays,missingDays};
    calculations.push(calculation('summary',[key],f,usable(selected).filter(r=>r.metricKey===key),{mean:mean(values),median:n?(sorted[Math.floor((n-1)/2)]+sorted[Math.floor(n/2)])/2:null,min:n?Math.min(...values):null,max:n?Math.max(...values):null,total:key==='steps'&&n?values.reduce((a,b)=>a+b,0):null,observedDays,missingDays},'Arithmetic mean of observed daily values; median, min and max across observed days. Steps total sums observed daily totals.'));
  }
  return {coverage:{records:selected.length,sources:new Set(selected.map(e=>e.sourceId)).size,daysWithRecords:new Set(selected.map(e=>pacificDate(e.observedAt))).size,daysWithCheckins:new Set(selected.filter(e=>e.metricKey==='energy').map(e=>pacificDate(e.observedAt))).size,latestObservedAt:selected.length?selected.reduce((latest,e)=>Date.parse(e.observedAt)>Date.parse(latest)?e.observedAt:latest,selected[0].observedAt):null,metrics:coverageMetrics},seriesByMetric,calculations};
}
export function compareRecords(records,filters={}) {
  const f=normalizeFilters(filters),dates=datesInRange(f.from,f.to),half=Math.floor(dates.length/2);
  if(!half)return {status:'insufficient_data',previousRange:null,currentRange:null,excludedDates:[],calculations:[],limitations:[...BASE_LIMITATIONS,'At least two selected days are required for equal adjacent windows.']};
  const excludedDates=dates.length%2?[dates[0]]:[],used=dates.slice(excludedDates.length),previousRange={from:used[0],to:used[half-1]},currentRange={from:used[half],to:used.at(-1)};
  const selected=usable(selectRecords(records,f)),calculations=[];
  for(const key of Object.keys(metrics)) {
    const series=dailySeries(selected,key,used),prev=series.slice(0,half).filter(p=>p.value!==null),curr=series.slice(half).filter(p=>p.value!==null);
    const previousMean=mean(prev.map(p=>p.value)),currentMean=mean(curr.map(p=>p.value)),delta=previousMean!==null&&currentMean!==null?currentMean-previousMean:null;
    calculations.push(calculation('period_comparison',[key],f,selected.filter(e=>e.metricKey===key&&used.includes(pacificDate(e.observedAt))),{previousMean,currentMean,delta,percentageChange:delta!==null&&previousMean!==0?100*delta/previousMean:null,previousCount:prev.length,currentCount:curr.length,previousMissingDays:half-prev.length,currentMissingDays:half-curr.length},`Compare arithmetic daily means for ${previousRange.from}–${previousRange.to} versus ${currentRange.from}–${currentRange.to}; current minus previous. Percentage uses previous mean; zero baseline is undefined.`,excludedDates.length?['The earliest selected day is excluded to make equal adjacent windows.']:[]));
  }
  return {status:calculations.some(c=>c.values.delta!==null)?'supported':'insufficient_data',previousRange,currentRange,excludedDates,calculations,limitations:[...BASE_LIMITATIONS,...(excludedDates.length?['The earliest selected day is excluded to make equal adjacent windows.']:[])]};
}
function paired(records,keyA,keyB,f) {
  if(!Object.hasOwn(metrics,keyA)||!Object.hasOwn(metrics,keyB)||keyA===keyB)throw new Error('Invalid metric pair');
  const selected=usable(selectRecords(records,f)),dates=datesInRange(f.from,f.to),a=dailySeries(selected,keyA,dates),b=dailySeries(selected,keyB,dates);
  const pairs=a.map((p,i)=>({date:p.date,a:p.value,b:b[i].value,ids:[...p.recordIds,...b[i].recordIds]})).filter(p=>p.a!==null&&p.b!==null);
  const ids=new Set(pairs.flatMap(p=>p.ids));return {pairs,inputs:selected.filter(e=>ids.has(e.id))};
}
export function associateRecords(records,keyA,keyB,filters={}) {
  const f=normalizeFilters(filters),{pairs,inputs}=paired(records,keyA,keyB,f),n=pairs.length;
  const mx=mean(pairs.map(p=>p.a)),my=mean(pairs.map(p=>p.b));
  const xx=pairs.reduce((s,p)=>s+(p.a-mx)**2,0),yy=pairs.reduce((s,p)=>s+(p.b-my)**2,0);
  const ok=n>=7&&xx>0&&yy>0;
  const correlation=ok?Math.max(-1,Math.min(1,pairs.reduce((s,p)=>s+(p.a-mx)*(p.b-my),0)/Math.sqrt(xx*yy))):null;
  const limitations=['This is a descriptive association, not proof of causation.','Only complete pairs on the same Pacific calendar date are included.',...(n<7?['Insufficient data: at least 7 complete pairs are required.']:n<14?['Small-sample warning: 7–13 pairs support exploratory description only.']:[]),...(n>=7&&(!xx||!yy)?['Insufficient data: zero variance prevents a Pearson correlation.']:[])];
  return {status:ok?'supported':'insufficient_data',calculation:calculation('association',[keyA,keyB],f,inputs,{correlation,pairCount:n},'Pearson correlation of complete daily means paired by America/Los_Angeles calendar date.',limitations,n)};
}
export function lowEnergyRecords(records,key,filters={}) {
  const f=normalizeFilters(filters),{pairs,inputs}=paired(records,key,'energy',f),low=pairs.filter(p=>p.b<=4),higher=pairs.filter(p=>p.b>=5),ok=pairs.length>=7&&low.length>=3&&higher.length>=3;
  const lowEnergyMean=ok?mean(low.map(p=>p.a)):null,higherEnergyMean=ok?mean(higher.map(p=>p.a)):null;
  const limitations=['These are self-reported groups, not clinical thresholds.','Group differences are descriptive and do not establish causation.','Only same-Pacific-date complete pairs are included.',...(ok?[]:['Insufficient data: at least 7 complete pairs and 3 days in each group are required.']),...(ok&&pairs.length<14?['Small-sample warning: fewer than 14 complete pairs.']:[])];
  return {status:ok?'supported':'insufficient_data',calculation:calculation('association',[key,'energy'],f,inputs,{lowEnergyMean,higherEnergyMean,delta:ok?lowEnergyMean-higherEnergyMean:null,lowEnergyCount:low.length,higherEnergyCount:higher.length,pairCount:pairs.length},'Compare mean on self-reported energy ≤4 days with energy ≥5 days; lower group minus higher group. Complete Pacific-date pairs only.',limitations,pairs.length)};
}
