import test from 'node:test';
import assert from 'node:assert/strict';
import { renderOverview, renderRecovery } from '../dist/pages/experience.js';
import { timeSeriesChart } from '../dist/charts.js';
import { createInitialState } from '../dist/demo-state.js';
import { sources } from '../dist/data/demo-data.js';
import { summarize, comparePeriods, buildInsights, selectEvents } from '../dist/data/demo-service.js';

async function context(changes = {}) {
  const state = { ...createInitialState(), ...changes };
  const filters = {from: state.from, to: state.to, sourceIds: state.sourceIds, metricKey: state.metricKey};
  const [summary, comparison, insights, events] = await Promise.all([summarize(filters), comparePeriods(filters), buildInsights(filters), selectEvents(filters)]);
  return {state, filters, summary, comparison, insights, events, sources};
}

test('plot selection changes the overview trend without excluding other day readings', async () => {
  const ctx = await context({plotMetric: 'steps'});
  const html = await renderOverview(ctx);
  assert.match(html, /Steps across your days/);
  assert.match(html, /7h 30m/);
  assert.match(html, /57 bpm/);
  assert.match(html, /6\/10/);
  assert.match(html, /data-plot-metric="steps"[^>]*aria-pressed="true"/);
  assert.equal(ctx.state.metricKey, 'all');
});

test('source and metric exclusions are distinguished from genuinely missing observations', async () => {
  for (const change of [{sourceIds: ['activity']}, {metricKey: 'steps'}]) {
    const html = await renderOverview(await context(change));
    assert.equal((html.match(/class="measure-value is-hidden">Hidden by filters/g) || []).length, 3);
    assert.match(html, /data-restore-measurements/);
  }
  const missing = await renderOverview(await context({selectedDate: '2026-10-06'}));
  assert.match(missing, /class="measure-value is-missing">Not recorded/);
  assert.doesNotMatch(missing, /Hidden by filters/);
});

test('native day navigation respects the selected range endpoints', async () => {
  const html = await renderOverview(await context({from: '2026-10-04', to: '2026-10-04', selectedDate: '2026-10-04'}));
  assert.match(html, /id="selected-day-input"[^>]*min="2026-10-04"[^>]*max="2026-10-04"/);
  assert.equal((html.match(/data-day="2026-10-04"[^>]*disabled/g) || []).length, 2);
  assert.match(html, /0 steps/);
});

test('renderers treat an omitted source scope as all sources', async () => {
  const ctx = await context();
  delete ctx.state.sourceIds;
  const html = await renderRecovery(ctx);
  assert.match(html, /7h 30m/);
  assert.doesNotMatch(html, /Hidden by filters/);
});

test('Recovery exposes the exact excluded date for odd comparison windows', async () => {
  const html = await renderRecovery(await context({from: '2026-10-24', to: '2026-10-30'}));
  assert.match(html, /Oct 24[^<]*excluded[^<]*equal/i);
  assert.match(html, /missing days/i);
});

test('chart keyboard navigation has one entry point, even when the selected date is missing', () => {
  const points = [{date:'2026-10-01',value:2},{date:'2026-10-02',value:null},{date:'2026-10-03',value:0}];
  const html = timeSeriesChart({points, metricKey:'steps', selectedDate:'2026-10-02'});
  assert.equal((html.match(/tabindex="0"/g) || []).length, 1);
  assert.equal((html.match(/tabindex="-1"/g) || []).length, 2);
  assert.match(html, /data-day="2026-10-02"[^>]*tabindex="0"/);
  assert.match(html, /Oct 3: 0 steps/);
  const path = html.match(/class="chart-line" d="([^"]*)"/)[1];
  assert.equal((path.match(/M/g) || []).length, 2);
  assert.doesNotMatch(path, /L/);
});

test('all-zero series renders measurements and noninteractive charts have no focus targets', () => {
  const points = [{date:'2026-10-04',value:0}];
  const html = timeSeriesChart({points, metricKey:'steps', selectedDate:'2026-10-04', interactive:false});
  assert.match(html, /Oct 4: 0 steps/);
  assert.doesNotMatch(html, /No steps records/);
  assert.doesNotMatch(html, /<button/);
});

test('coverage visualization counts scoped recorded days and treats an observed zero as present', async () => {
  const html = await renderOverview(await context({selectedDate:'2026-10-04'}));
  assert.equal((html.match(/data-coverage="recorded"/g) || []).length, 110);
  assert.equal((html.match(/data-coverage="missing"/g) || []).length, 10);
  assert.match(html, /data-coverage-date="2026-10-04" data-coverage-metric="steps" data-coverage="recorded"/);
  assert.match(html, /id="previous-day"/);
  assert.match(html, /id="next-day"/);
});

test('coverage tracks distinguish excluded sources from genuine gaps and honor short ranges', async () => {
  const html = await renderOverview(await context({sourceIds:['activity'],from:'2026-10-03',to:'2026-10-05',selectedDate:'2026-10-04'}));
  assert.equal((html.match(/data-coverage="recorded"/g) || []).length, 3);
  assert.equal((html.match(/data-coverage="excluded"/g) || []).length, 9);
  assert.equal((html.match(/data-coverage="missing"/g) || []).length, 0);
  assert.match(html, /Sleep[^<]*hidden by filters/);
  assert.equal((html.match(/data-plot-scroll="true"/g) || []).length, 4);
});

test('compact card trends retain exact gaps and observed zero without interactive controls', () => {
  const points = [{date:'2026-10-03',value:500},{date:'2026-10-04',value:0},{date:'2026-10-05',value:null},{date:'2026-10-06',value:100}];
  const html = timeSeriesChart({points, metricKey:'steps', selectedDate:'2026-10-04', compact:true, interactive:false});
  const path = html.match(/class="chart-line" d="([^"]*)"/)[1];
  assert.equal((path.match(/M/g) || []).length, 2);
  assert.equal((path.match(/L/g) || []).length, 1);
  assert.match(html, /Oct 4: 0 steps/);
  assert.match(path, /L342\.67,192\.00/);
  assert.doesNotMatch(html, /<button/);
});
