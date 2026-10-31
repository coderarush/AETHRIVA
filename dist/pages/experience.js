import { escapeHtml as esc, formatMetric, formatDate, metricLabel, evidenceButton, icon } from '../ui.js';
import { demoProfile } from '../data/demo-data.js';
import { timeSeriesChart, metricColors } from '../charts.js';

const keys = ['sleep_duration', 'steps', 'resting_heart_rate', 'energy'];
const metricIcons = { sleep_duration: 'moon', steps: 'activity', resting_heart_rate: 'heart', energy: 'sparkles' };
const series = (ctx, key) => ctx.summary.seriesByMetric[key] || [];
const selectedPoint = (ctx, key) => series(ctx, key).find(point => point.date === ctx.state.selectedDate);
const summaryCalculation = (ctx, key) => ctx.summary.calculations.find(calc => calc.metricKeys.includes(key));
const selectedIds = ctx => keys.flatMap(key => selectedPoint(ctx, key)?.recordIds || []);
const dateText = ctx => formatDate(ctx.state.selectedDate, { short: true });
const rangeText = ctx => `${formatDate(ctx.state.from, { short: true })} – ${formatDate(ctx.state.to, { short: true })}`;

function selectedValues(ctx) {
  return `<div class="day-measures">${keys.map(key => {
    const point = selectedPoint(ctx, key);
    const records = point?.recordIds || [];
    const sourceNames = [...new Set(ctx.events.filter(event => records.includes(event.id)).map(event => ctx.sources.find(source => source.id === event.sourceId)?.name).filter(Boolean))];
    return `<section class="day-measure" style="--metric-color:${metricColors[key]}"><h3>${icon(metricIcons[key], 17)}${esc(metricLabel(key))}</h3><p class="measure-value ${point?.value == null ? 'is-missing' : ''}">${point?.value == null ? 'Not recorded' : esc(formatMetric(point.value, key))}</p><p class="measure-context">${key === 'energy' ? 'Self-reported check-in' : esc(sourceNames.join(', ') || 'No source record for this day')}</p>${records.length ? evidenceButton(records, 'Inspect record') : '<span class="missing-caption">Missing values stay missing</span>'}</section>`;
  }).join('')}</div>`;
}

function coverage(ctx) {
  const c = ctx.summary.coverage;
  return `<div class="coverage-ribbon" aria-label="Records in the selected range"><span><strong>${esc(c.records)}</strong> records</span><span><strong>${esc(c.sources)}</strong> sources</span><span><strong>${esc(c.daysWithCheckins)}</strong> days with check-ins</span><span class="coverage-range">${esc(rangeText(ctx))}</span></div>`;
}

function dayStrip(ctx) {
  const dates = [...new Set(keys.flatMap(key => series(ctx, key).map(point => point.date)))].sort();
  if (!dates.length) return '';
  return `<div class="day-strip" role="group" aria-label="Select a day for all measurements">${dates.map(date => `<button type="button" class="day-choice ${date === ctx.state.selectedDate ? 'selected' : ''}" data-day="${esc(date)}" aria-pressed="${date === ctx.state.selectedDate}" aria-label="Explore ${esc(formatDate(date))}"><span>${esc(new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }))}</span><strong>${Number(date.slice(-2))}</strong></button>`).join('')}</div>`;
}

function insightPanel(ctx) {
  const insight = ctx.insights.find(item => item.type === 'descriptive_association') || ctx.insights[0];
  const warning = insight?.limitations?.find(item => /small.sample/i.test(item));
  const limitations = [...new Set([warning, insight?.limitations?.[0]].filter(Boolean))];
  return `<aside class="perspective"><div class="perspective-icon">${icon('sparkles', 24)}</div><h2>${insight ? esc(insight.title) : 'Start with the days behind the data.'}</h2><p>${insight ? esc(insight.summary) : 'Select a day to compare its recorded measurements. Broaden the dates or sources when there are too few observations to describe a pattern.'}</p>${limitations.map(item => `<p class="limitation">${esc(item)}</p>`).join('')}<div class="button-row">${insight ? evidenceButton([...(insight.calculationId ? [insight.calculationId] : []), ...(insight.evidenceRecordIds || [])], 'See how this was found') : ''}<button class="text-button" data-screen="intelligence">Explore in Intelligence ${icon('arrow', 16)}</button></div></aside>`;
}

export async function renderOverview(ctx) {
  const key = keys.includes(ctx.state.metricKey) ? ctx.state.metricKey : 'sleep_duration';
  const point = selectedPoint(ctx, key);
  const calc = summaryCalculation(ctx, key);
  return `<div class="overview-page"><div class="overview-welcome"><p>Hello, ${esc(demoProfile.name.split(' ')[0])}. Here’s your recorded picture.</p><span class="muted">Fictional demo profile</span></div>${coverage(ctx)}
    <div class="focus-layout"><section class="panel focus-trend"><div class="section-heading"><div><h2>${esc(metricLabel(key))} across your days</h2><p class="muted">Select a point. Every measurement follows the same day.</p></div><button class="text-button" data-screen="recovery">Explore Recovery ${icon('arrow', 16)}</button></div>
      <div class="trend-headline"><strong style="color:${metricColors[key]}">${point?.value == null ? 'Not recorded' : esc(formatMetric(point.value, key))}</strong><span>${esc(dateText(ctx))}</span></div>
      ${timeSeriesChart({ points: series(ctx, key), metricKey: key, selectedDate: ctx.state.selectedDate, id: 'overview-trend' })}
      <div class="chart-footer"><span>${esc(ctx.summary.coverage.metrics[key]?.observedDays ?? 0)} days recorded · Gaps are missing observations</span>${calc ? evidenceButton([calc.id], 'View period evidence') : ''}</div>
    </section>${insightPanel(ctx)}</div>
    <section class="selected-day-section"><div class="section-heading"><div><h2>Your day, together</h2><p class="muted">${esc(dateText(ctx))} · Same date, separate measurements</p></div>${selectedIds(ctx).length ? `<button class="text-button" data-view-day="${esc(ctx.state.selectedDate)}">All records for this day ${icon('arrow', 16)}</button>` : ''}</div>${selectedValues(ctx)}</section>
    <section class="source-journey"><div><h2>A clear path back to the source.</h2><p>See which demo sources contribute to this picture, then follow each measurement to its original record.</p></div><button class="button" data-screen="connect">Explore sources ${icon('arrow', 16)}</button></section></div>`;
}

function comparisonPanel(ctx) {
  const comparison = ctx.comparison;
  const reason = comparison.limitations.find(item => /at least two selected days|insufficient/i.test(item));
  if (comparison.status !== 'supported') return `<section class="comparison-section"><h2>Compare periods</h2><p class="muted">${esc(reason || 'Choose a broader date range to compare two periods with recorded values.')}</p><button class="text-button" data-range="30">Explore the full month ${icon('arrow', 16)}</button></section>`;
  return `<section class="comparison-section"><div class="section-heading"><div><h2>How the periods compare</h2><p class="muted">${esc(formatDate(comparison.previousRange.from, { short: true }))} – ${esc(formatDate(comparison.previousRange.to, { short: true }))} compared with ${esc(formatDate(comparison.currentRange.from, { short: true }))} – ${esc(formatDate(comparison.currentRange.to, { short: true }))}</p></div></div><div class="comparison-list">${comparison.calculations.map(calc => {
    const key = calc.metricKeys[0];
    const value = calc.values;
    return `<article class="comparison-item"><h3>${esc(metricLabel(key))}</h3><div class="comparison-values"><span><small>Earlier mean</small>${esc(formatMetric(value.previousMean, key))}</span><span><small>Later mean</small>${esc(formatMetric(value.currentMean, key))}</span></div><p class="muted">${esc(value.previousCount)} earlier observations · ${esc(value.currentCount)} later observations</p>${evidenceButton([calc.id], 'Inspect comparison')}</article>`;
  }).join('')}</div></section>`;
}

export async function renderRecovery(ctx) {
  return `<div class="recovery-page">${coverage(ctx)}<section class="recovery-intro"><div><h2>Four measures. One day in focus.</h2><p class="muted">Explore sleep, movement, resting heart rate, and how the day felt. Select any point to move all four charts together.</p></div><div class="selected-date"><span>Selected day</span><strong>${esc(dateText(ctx))}</strong></div></section>${dayStrip(ctx)}
    <div class="recovery-grid">${keys.map(key => {
      const point = selectedPoint(ctx, key);
      const observed = ctx.summary.coverage.metrics[key]?.observedDays ?? 0;
      const calc = summaryCalculation(ctx, key);
      return `<section class="panel recovery-chart" style="--metric-color:${metricColors[key]}"><div class="section-heading"><h2>${icon(metricIcons[key], 19)}${esc(metricLabel(key))}</h2><span class="muted">${esc(dateText(ctx))}</span></div><p class="recovery-value ${point?.value == null ? 'is-missing' : ''}">${point?.value == null ? 'Not recorded' : esc(formatMetric(point.value, key))}</p>${timeSeriesChart({ points: series(ctx, key), metricKey: key, selectedDate: ctx.state.selectedDate, id: `recovery-${key}` })}<div class="chart-footer"><span>${esc(observed)} days recorded${key === 'energy' ? ' · Self-reported' : ''}</span>${point?.recordIds?.length ? evidenceButton(point.recordIds, 'Inspect this day') : calc ? evidenceButton([calc.id], 'Inspect period') : ''}</div></section>`;
    }).join('')}</div>
    <section class="selected-day-section"><div class="section-heading"><h2>The sources behind ${esc(dateText(ctx))}</h2>${selectedIds(ctx).length ? evidenceButton(selectedIds(ctx), 'View day evidence') : ''}</div>${selectedValues(ctx)}</section>
    ${comparisonPanel(ctx)}<section class="question-bridge"><div><h2>What was different on lower-energy days?</h2><p>Explore a supported comparison, with the records and limitations alongside the answer.</p></div><button class="button primary" data-ask="What patterns appear on lower-energy days?">Ask Intelligence ${icon('arrow', 16)}</button></section></div>`;
}
