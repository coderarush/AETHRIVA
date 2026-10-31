import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState, normalizeState, stateFromSearch, searchFromState, rangeState, toggleSource, scopeFromEvidence} from '../dist/demo-state.js';

test('out-of-range day is clamped and an empty source filter remains empty', () => {
  const state = normalizeState({...createInitialState(), from: '2026-10-10', to: '2026-10-15', selectedDate: '2026-10-30', sourceIds: []});
  assert.equal(state.selectedDate, '2026-10-15');
  assert.deepEqual(state.sourceIds, []);
});
test('bookmark round-trip preserves source and date scope', () => {
  const state = {...createInitialState(), screen: 'recovery', from: '2026-10-17', to: '2026-10-30', selectedDate: '2026-10-22', sourceIds: ['activity'], metricKey: 'steps'};
  assert.deepEqual(stateFromSearch(searchFromState(state)), state);
});
test('malformed dates and unknown routes recover to the complete demo', () => {
  const state = stateFromSearch('?screen=secret&from=2026-02-31&to=2026-10-01&day=invalid');
  assert.equal(state.screen, 'overview');
  assert.equal(state.from, '2026-10-01');
  assert.equal(state.to, '2026-10-30');
});
test('seven-day range uses inclusive civil dates and retains selection within it', () => {
  const state = rangeState({...createInitialState(), selectedDate: '2026-10-28'}, 7);
  assert.equal(state.from, '2026-10-24');
  assert.equal(state.to, '2026-10-30');
  assert.equal(state.selectedDate, '2026-10-28');
});
test('a source checkbox updates shared selection independently of duplicate controls', () => {
  const changed=toggleSource(createInitialState(), 'activity', false);
  assert.deepEqual(changed.sourceIds, ['wearable','checkin']);
  assert.deepEqual(toggleSource(changed, 'activity', true).sourceIds, ['wearable','checkin','activity']);
});
test('an explicit question range is preserved with its answer evidence', () => {
  const filters={from:'2026-10-17',to:'2026-10-30',sourceIds:['wearable']};
  const resolved=scopeFromEvidence(filters,{calculations:[{periodStart:'2026-10-01',periodEnd:'2026-10-30'}]});
  assert.deepEqual(resolved,{from:'2026-10-01',to:'2026-10-30',sourceIds:['wearable']});
});

test('a bookmarked Overview plot remains independent of the shared metric filter', () => {
  const state = {...createInitialState(), metricKey:'steps', plotMetric:'resting_heart_rate'};
  const search = searchFromState(state);
  assert.equal(new URLSearchParams(search).get('plot'), 'resting_heart_rate');
  const restored = stateFromSearch(search);
  assert.equal(restored.plotMetric, 'resting_heart_rate');
  assert.equal(restored.metricKey, 'steps');
  assert.deepEqual(restored, state);
});

test('all four measurements are accepted as a local plot without changing the global filter', () => {
  for (const plotMetric of ['sleep_duration', 'steps', 'resting_heart_rate', 'energy']) {
    const state = stateFromSearch(`?metric=energy&plot=${plotMetric}`);
    assert.equal(state.plotMetric, plotMetric);
    assert.equal(state.metricKey, 'energy');
  }
});

test('invalid and absent local plot choices recover to sleep without changing metric scope', () => {
  for (const plotMetric of ['all', 'unknown', '__proto__', '']) {
    const state = normalizeState({...createInitialState(), metricKey:'steps', plotMetric});
    assert.equal(state.plotMetric, 'sleep_duration');
    assert.equal(state.metricKey, 'steps');
  }
  assert.equal(stateFromSearch('?screen=overview&metric=steps').plotMetric, 'sleep_duration');
  assert.equal(stateFromSearch('?plot=unknown').plotMetric, 'sleep_duration');
});

test('date and source scope changes preserve the independently selected plot', () => {
  const state = {...createInitialState(), metricKey:'steps', plotMetric:'energy'};
  const ranged = rangeState(state, 7);
  const filtered = toggleSource(ranged, 'wearable', false);
  assert.equal(ranged.plotMetric, 'energy');
  assert.equal(filtered.plotMetric, 'energy');
  assert.equal(filtered.metricKey, 'steps');
  assert.deepEqual(filtered.sourceIds, ['activity','checkin']);
});

test('resetting state restores the sleep plot and all-metrics filter', () => {
  const changed = normalizeState({...createInitialState(), plotMetric:'energy', metricKey:'steps'});
  assert.equal(changed.plotMetric, 'energy');
  const reset = createInitialState();
  assert.equal(reset.plotMetric, 'sleep_duration');
  assert.equal(reset.metricKey, 'all');
  assert.equal(stateFromSearch(searchFromState(reset)).plotMetric, 'sleep_duration');
});
