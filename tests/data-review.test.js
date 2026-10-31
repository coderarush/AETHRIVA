import test from 'node:test';
import assert from 'node:assert/strict';
import {answerQuestion, buildInsights, summarize, comparePeriods, resolveEvidence} from './fixtures/demo-service.js';
import {sources} from './fixtures/demo-data.js';
import {renderOverview, renderRecovery} from '../dist/pages/experience.js';

test('unavailable measurements and mixed requests never receive unrelated supported findings', async () => {
  for (const question of [
    'Summarize my blood glucose records.',
    'Compare my cholesterol over this month.',
    'Summarize sleep and blood glucose records.',
    'Compare sleep and cholesterol over this month.',
    'Summarize my weight records.',
    'Summarize sleep and HRV patterns.',
    'Summarize my calories records.',
    'Compare my blood pressure this month.',
    'Summarize sleep and dragon sightings.',
    'Prepare a neutral summary of my blood glucose for my doctor.',
  ]) {
    const response = await answerQuestion(question);
    assert.equal(response.responseType, 'insufficient_data', question);
    assert.deepEqual(response.findings, [], question);
    assert.deepEqual(response.evidence, [], question);
  }
});

test('explicit unavailable or unrecognized dates cannot fall through to the selected October scope', async () => {
  for (const question of [
    'Summarize sleep on October 10, 2025.',
    'Summarize sleep in November 2026.',
    'Summarize sleep tomorrow.',
    'Summarize sleep next week.',
    'Summarize sleep from October 10 to November 12, 2026.',
    'Summarize sleep on 2025-10-10.',
    'Summarize sleep from 2026-10-29 to 2026-11-02.',
    'Summarize sleep on October 31, 2026.',
    'Summarize sleep on October 10 and October 12, 2026.',
  ]) {
    const response = await answerQuestion(question);
    assert.equal(response.responseType, 'insufficient_data', question);
    assert.match(response.answer, /date|October 2026/i, question);
    assert.deepEqual(response.findings, [], question);
    assert.deepEqual(response.evidence, [], question);
  }
});

test('supported date forms preserve exact scope and source filters with wording aliases', async () => {
  for (const [question, from, to] of [
    ['Summarize sleep on October 10, 2026.', '2026-10-10', '2026-10-10'],
    ['Summarise my sleep on Oct. 10.', '2026-10-10', '2026-10-10'],
    ['Show me a summary of sleep from October 10 through October 16, 2026.', '2026-10-10', '2026-10-16'],
    ['Summarize sleep from 2026-10-10 to 2026-10-16.', '2026-10-10', '2026-10-16'],
    ['Summarize sleep over the past 7 days.', '2026-10-24', '2026-10-30'],
    ['Summarize sleep this month.', '2026-10-01', '2026-10-30'],
    ['Summarize sleep in October 2026.', '2026-10-01', '2026-10-30'],
  ]) {
    const response = await answerQuestion(question, {from:'2026-10-28', to:'2026-10-30', sourceIds:['wearable']});
    assert.equal(response.responseType, 'supported', question);
    assert.ok(response.evidence.length, question);
    assert.ok(response.evidence.every(record => record.sourceName === 'Wearable export'), question);
    for (const finding of response.findings) {
      const {calculations} = await resolveEvidence([finding.calculationId]);
      assert.equal(calculations[0].periodStart, from, question);
      assert.equal(calculations[0].periodEnd, to, question);
      assert.deepEqual(calculations[0].metricKeys, ['sleep_duration'], question);
    }
    assert.equal((await answerQuestion(question, {sourceIds:['checkin']})).responseType, 'insufficient_data', question);
    assert.equal((await answerQuestion(question, {sourceIds:[]})).responseType, 'insufficient_data', question);
  }
});

test('supported metric aliases answer their requested measurement rather than expanding to all metrics', async () => {
  for (const [question, metric] of [
    ['Summarize my resting heart rate records.', 'resting_heart_rate'],
    ['Summarize self-reported energy this month.', 'energy'],
    ['Compare my daily steps this month.', 'steps'],
    ['Show me the evidence behind the sleep trend.', 'sleep_duration'],
  ]) {
    const response = await answerQuestion(question);
    assert.equal(response.responseType, 'supported', question);
    assert.ok(response.findings.length, question);
    for (const finding of response.findings) {
      const evidence = await resolveEvidence([finding.calculationId]);
      assert.deepEqual(evidence.calculations[0].metricKeys, [metric], question);
    }
  }
});

async function context(filters) {
  return {
    state:{screen:'overview', selectedDate:filters.to, metricKey:'all', ...filters}, filters, sources,
    summary:await summarize(filters), comparison:await comparePeriods(filters), insights:await buildInsights(filters), events:[],
  };
}

test('Overview keeps the real 12-pair association, small-sample warning and inline evidence together', async () => {
  const ctx = await context({from:'2026-10-17', to:'2026-10-30'});
  const html = await renderOverview(ctx);
  const panel = html.match(/<aside class="perspective">[\s\S]*?<\/aside>/)?.[0];
  assert.ok(panel, 'Overview renders a perspective panel');
  assert.match(panel, /12 same-date pairs had a Pearson correlation of 0\.98/);
  assert.match(panel, /does not establish causation/);
  assert.match(panel, /<p[^>]*class="[^"]*limitation[^"]*"[^>]*>Small-sample warning: 7–13 pairs support exploratory description only\.<\/p>/);
  assert.match(panel, /data-evidence=/);
  const insight = ctx.insights.find(item => item.type === 'descriptive_association');
  assert.ok(panel.includes(insight.calculationId), 'Displayed association keeps its own calculation evidence');
});

test('single-day Recovery explains the two-day requirement in the comparison panel', async () => {
  const ctx = await context({from:'2026-10-10', to:'2026-10-10'});
  const html = await renderRecovery(ctx);
  const panel = html.match(/<section class="comparison-section">[\s\S]*?<\/section>/)?.[0];
  assert.ok(panel);
  assert.match(panel, /At least two selected days/);
});
