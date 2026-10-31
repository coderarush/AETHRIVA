import {METRIC_KEYS, validDate, offsetDate} from './data/metrics.js';

export const screens=Object.freeze(['overview','connect','recovery','insights','timeline','intelligence','reports','about']);

/** State helpers are bound to one validated workspace, never module-global data. */
export function createWorkspaceState(dataset) {
  const bounds={...dataset.range};
  if(!validDate(bounds.from)||!validDate(bounds.to)||bounds.from>bounds.to)throw new Error('Invalid workspace bounds');
  // Historical records remain selectable after a connector disconnects.
  const historical=new Set([...(dataset.events||[]),...(dataset.workouts||[]),...(dataset.deviceReadings||[])].map(record=>record.sourceId));
  const sourceIds=dataset.sources.filter(source=>['connected','ready'].includes(source.status)||historical.has(source.id)).map(source=>source.id);
  const defaultFrom=[bounds.from,offsetDate(bounds.to,-29)].sort().at(-1);
  const createInitialState=()=>({screen:'overview',from:defaultFrom,to:bounds.to,selectedDate:bounds.to,sourceIds:[...sourceIds],metricKey:'all',plotMetric:'sleep_duration'});
  function normalizeState(input={}) {
    const fallback=createInitialState();
    const validRange=validDate(input.from)&&validDate(input.to)&&input.from<=input.to&&input.from>=bounds.from&&input.to<=bounds.to;
    const from=validRange?input.from:fallback.from,to=validRange?input.to:fallback.to;
    return {screen:screens.includes(input.screen)?input.screen:'overview',from,to,selectedDate:validDate(input.selectedDate)?[from,input.selectedDate,to].sort()[1]:to,
      sourceIds:Array.isArray(input.sourceIds)?[...new Set(input.sourceIds.filter(id=>sourceIds.includes(id)))]:[...sourceIds],
      metricKey:input.metricKey==='all'||METRIC_KEYS.includes(input.metricKey)?input.metricKey:'all',plotMetric:METRIC_KEYS.includes(input.plotMetric)?input.plotMetric:'sleep_duration'};
  }
  function stateFromSearch(search) {
    const params=new URLSearchParams(search),fallback=createInitialState();
    return normalizeState({screen:params.get('screen'),from:params.get('from')||fallback.from,to:params.get('to')||fallback.to,selectedDate:params.get('day')||fallback.to,sourceIds:params.has('sources')?params.get('sources').split(',').filter(Boolean):undefined,metricKey:params.get('metric')||'all',plotMetric:params.get('plot')});
  }
  function searchFromState(state) {return `?${new URLSearchParams({screen:state.screen,from:state.from,to:state.to,day:state.selectedDate,sources:state.sourceIds.join(','),metric:state.metricKey,plot:state.plotMetric})}`;}
  function rangeState(state,days) {
    const n=Number(days);if(!Number.isInteger(n)||n<1||n>3661)throw new Error('Invalid range length');
    return normalizeState({...state,from:[bounds.from,offsetDate(bounds.to,-n+1)].sort().at(-1),to:bounds.to});
  }
  function toggleSource(state,id,checked) {const selected=new Set(state.sourceIds);if(checked)selected.add(id);else selected.delete(id);return normalizeState({...state,sourceIds:[...selected]});}
  return {createInitialState,normalizeState,stateFromSearch,searchFromState,rangeState,toggleSource,scopeFromEvidence,bounds:Object.freeze(bounds),sourceIds:Object.freeze(sourceIds)};
}

export function scopeFromEvidence(filters,resolved) {
  const calculations=resolved.calculations||[],snapshot={...filters,sourceIds:[...(filters.sourceIds||[])]};
  return calculations.length?{...snapshot,from:calculations.map(c=>c.periodStart).sort()[0],to:calculations.map(c=>c.periodEnd).sort().at(-1)}:snapshot;
}
