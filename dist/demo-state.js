import {sources, DEMO_START, DEMO_END} from './data/demo-data.js';
export const screens = ['overview', 'connect', 'recovery', 'insights', 'timeline', 'intelligence', 'reports', 'about'];
const metricKeys = ['all', 'sleep_duration', 'steps', 'resting_heart_rate', 'energy'];
const plotMetricKeys = metricKeys.slice(1);
const sourceIds = sources.filter(source => source.status === 'demo_loaded').map(source => source.id);
const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
export const createInitialState = () => ({screen: 'overview', from: DEMO_START, to: DEMO_END, selectedDate: DEMO_END, sourceIds: [...sourceIds], metricKey: 'all', plotMetric: 'sleep_duration'});
export function normalizeState(input) {
  const fallback = createInitialState();
  const validRange = validDate(input.from) && validDate(input.to) && input.from <= input.to && input.from >= DEMO_START && input.to <= DEMO_END;
  const from = validRange ? input.from : fallback.from, to = validRange ? input.to : fallback.to;
  return {screen: screens.includes(input.screen) ? input.screen : 'overview', from, to,
    selectedDate: validDate(input.selectedDate) ? [from, input.selectedDate, to].sort()[1] : to,
    sourceIds: Array.isArray(input.sourceIds) ? [...new Set(input.sourceIds.filter(id => sourceIds.includes(id)))] : [...sourceIds],
    metricKey: metricKeys.includes(input.metricKey) ? input.metricKey : 'all',
    plotMetric: plotMetricKeys.includes(input.plotMetric) ? input.plotMetric : fallback.plotMetric};
}
export function stateFromSearch(search) {
  const params = new URLSearchParams(search);
  return normalizeState({screen: params.get('screen'), from: params.get('from') || DEMO_START, to: params.get('to') || DEMO_END,
    selectedDate: params.get('day') || DEMO_END, sourceIds: params.has('sources') ? params.get('sources').split(',').filter(Boolean) : undefined, metricKey: params.get('metric') || 'all', plotMetric: params.get('plot')});
}
export function searchFromState(state) {
  const params = new URLSearchParams({screen: state.screen, from: state.from, to: state.to, day: state.selectedDate, sources: state.sourceIds.join(','), metric: state.metricKey, plot: state.plotMetric});
  return `?${params}`;
}
export function rangeState(state, days) {
  const date = new Date(`${DEMO_END}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - Number(days) + 1);
  return normalizeState({...state, from: date.toISOString().slice(0, 10), to: DEMO_END});
}
export function toggleSource(state, id, checked) {
  const selection=new Set(state.sourceIds);
  if(checked)selection.add(id);else selection.delete(id);
  return normalizeState({...state,sourceIds:[...selection]});
}
export function scopeFromEvidence(filters, resolved) {
  const calculations=resolved.calculations || [];
  if(!calculations.length)return {...filters,sourceIds:[...filters.sourceIds]};
  return {...filters,sourceIds:[...filters.sourceIds],from:calculations.map(c=>c.periodStart).sort()[0],to:calculations.map(c=>c.periodEnd).sort().at(-1)};
}
