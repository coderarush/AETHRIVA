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
