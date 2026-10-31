import { escapeHtml as esc, formatMetric, formatDate, metricLabel, evidenceButton, icon } from '../ui.js';
import { events as fixtureEvents } from '../data/demo-data.js';
import { timeSeriesChart, metricColors } from '../charts.js';
import { datesInRange } from '../data/analytics.js';

const keys = ['sleep_duration', 'steps', 'resting_heart_rate', 'energy'];
const metricIcons = { sleep_duration: 'moon', steps: 'activity', resting_heart_rate: 'heart', energy: 'energy' };
const shortLabels = {sleep_duration: 'Sleep', steps: 'Steps', resting_heart_rate: 'Resting heart rate', energy: 'Energy'};
const metricSources = Object.fromEntries(keys.map(key => [key, [...new Set(fixtureEvents.filter(event => event.metricKey === key).map(event => event.sourceId))]]));
const series = (ctx, key) => ctx.summary.seriesByMetric[key] || [];
const selectedPoint = (ctx, key) => series(ctx, key).find(point => point.date === ctx.state.selectedDate);
const summaryCalculation = (ctx, key) => ctx.summary.calculations.find(calc => calc.metricKeys.includes(key));
const selectedIds = ctx => keys.flatMap(key => selectedPoint(ctx, key)?.recordIds || []);
const dateText = ctx => formatDate(ctx.state.selectedDate, { short: true });
const rangeText = ctx => `${formatDate(ctx.state.from, { short: true })} – ${formatDate(ctx.state.to, { short: true })}`;
const excluded = (ctx, key) => (ctx.state.metricKey && ctx.state.metricKey !== 'all' && ctx.state.metricKey !== key) || (ctx.state.sourceIds != null && !metricSources[key].some(id => ctx.state.sourceIds.includes(id)));
const restoreButton = () => '<button class="text-button" data-restore-measurements>Show all measurements</button>';
const valueText = (ctx, key) => excluded(ctx, key) ? 'Hidden by filters' : selectedPoint(ctx, key)?.value == null ? 'Not recorded' : formatMetric(selectedPoint(ctx, key).value, key);
const valueClass = (ctx, key) => excluded(ctx, key) ? 'is-hidden' : selectedPoint(ctx, key)?.value == null ? 'is-missing' : '';

function dayNavigator(ctx) {
  const {selectedDate, from, to} = ctx.state;
  const offset = days => new Date(Date.parse(`${selectedDate}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  return `<div class="day-navigator" role="group" aria-label="Selected day"><button class="button day-previous" id="previous-day" data-day="${selectedDate === from ? selectedDate : offset(-1)}" ${selectedDate === from ? 'disabled' : ''} aria-label="Previous day">${icon('arrow', 19)}</button><label for="selected-day-input"><span>Selected day</span><input type="date" id="selected-day-input" data-selected-day min="${esc(from)}" max="${esc(to)}" value="${esc(selectedDate)}" required></label><button class="button day-next" id="next-day" data-day="${selectedDate === to ? selectedDate : offset(1)}" ${selectedDate === to ? 'disabled' : ''} aria-label="Next day">${icon('arrow', 19)}</button></div>`;
}

function sourceText(ctx, key) {
  if (excluded(ctx, key)) return 'Outside the selected sources or measurement filter.';
  const records = selectedPoint(ctx, key)?.recordIds || [];
  if (!records.length) return 'No observation for this day.';
  if (key === 'energy') return 'Self-reported · personal 1–10 scale';
  return [...new Set(ctx.events.filter(event => records.includes(event.id)).map(event => ctx.sources.find(source => source.id === event.sourceId)?.name).filter(Boolean))].join(', ');
}

function coverageCalendar(ctx) {
  const dates = datesInRange(ctx.state.from, ctx.state.to);
  const pointAt = (radius, angle) => {
    const radians = (angle - 90) * Math.PI / 180;
    return [160 + radius * Math.cos(radians), 160 + radius * Math.sin(radians)].map(value => value.toFixed(3)).join(',');
  };
  const step = 360 / dates.length, gap = Math.min(3.2, step * .18);
  const selectedIndex = dates.indexOf(ctx.state.selectedDate);
  const selectedAngle = (selectedIndex + .5) * step;
  const tracks = keys.map((key, track) => {
    const radius = 136 - track * 16;
    return dates.map((date,index) => {
      const point = series(ctx,key).find(item => item.date === date);
      const status = excluded(ctx,key) ? 'excluded' : Number.isFinite(point?.value) ? 'recorded' : 'missing';
      const start = index * step + gap / 2, end = (index + 1) * step - gap / 2;
      return `<path class="coverage-segment ${date === ctx.state.selectedDate ? 'is-selected' : ''}" data-coverage-date="${date}" data-coverage-metric="${key}" data-coverage="${status}" d="M${pointAt(radius,start)} A${radius},${radius} 0 ${end-start > 180 ? 1 : 0} 1 ${pointAt(radius,end)}" style="--track-color:${metricColors[key]}"><title>${esc(formatDate(date,{short:true}))}: ${esc(metricLabel(key))} — ${status === 'excluded' ? 'hidden by filters' : status === 'recorded' ? 'recorded' : 'not recorded'}</title></path>`;
    }).join('');
  }).join('');
  const month = new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${ctx.state.selectedDate}T12:00:00Z`));
  return `<figure class="coverage-calendar" aria-labelledby="coverage-calendar-caption"><div class="coverage-dial"><svg viewBox="0 0 320 320" role="img" aria-label="Recorded-day coverage for ${dates.length} days. Four tracks show sleep, steps, resting heart rate and self-reported energy, outside to inside.">${tracks}${selectedIndex < 0 ? '' : `<line class="coverage-day-guide" x1="${pointAt(76,selectedAngle).split(',')[0]}" y1="${pointAt(76,selectedAngle).split(',')[1]}" x2="${pointAt(148,selectedAngle).split(',')[0]}" y2="${pointAt(148,selectedAngle).split(',')[1]}"/>`}</svg><div class="coverage-date"><span>${esc(month)}</span><strong>${Number(ctx.state.selectedDate.slice(-2))}</strong><span>Selected day</span></div></div><figcaption id="coverage-calendar-caption"><strong>${dates.length} days in view</strong><span>Each segment is a day. Gaps are unrecorded or excluded.</span></figcaption><ul class="coverage-legend" aria-label="Coverage tracks, outside to inside">${keys.map(key => `<li style="--track-color:${metricColors[key]}"><i aria-hidden="true"></i><span>${shortLabels[key]}${excluded(ctx,key) ? ' — hidden by filters' : ''}</span></li>`).join('')}</ul></figure>`;
}

function selectedValues(ctx) {
  const pastel = {sleep_duration:'#ded3ff',steps:'#ffd5b9',resting_heart_rate:'#c9dfff',energy:'#c0eedf'};
  return `<div class="day-measures">${keys.map(key => {
    const records = selectedPoint(ctx, key)?.recordIds || [];
    return `<section class="day-measure" style="--metric-color:${metricColors[key]};--metric-pastel:${pastel[key]}"><h3>${icon(metricIcons[key], 19)}${esc(metricLabel(key))}</h3><p class="measure-value ${valueClass(ctx, key)}">${esc(valueText(ctx, key))}</p>${excluded(ctx,key) ? '<p class="mini-chart-empty">Trend hidden by filters</p>' : timeSeriesChart({points:series(ctx,key),metricKey:key,selectedDate:ctx.state.selectedDate,id:`daily-mini-${key}`,compact:true,interactive:false})}<div class="metric-card-actions"><button class="metric-explore" id="plot-card-${key}" data-plot-metric="${key}" data-plot-scroll="true" aria-label="Explore ${esc(metricLabel(key))} trend">Explore${icon('arrow',15)}</button>${excluded(ctx, key) ? restoreButton() : records.length ? evidenceButton(records, 'Evidence') : '<span class="missing-caption">Missing, not zero</span>'}</div></section>`;
  }).join('')}</div>`;
}

function coverage(ctx) {
  const c = ctx.summary.coverage;
  return `<div class="coverage-ribbon" aria-label="Records in the selected range"><span><strong>${esc(c.records)}</strong> records</span><span><strong>${esc(c.sources)}</strong> sources</span><span><strong>${esc(c.daysWithRecords)}</strong> days with observations</span><span class="coverage-range">${esc(rangeText(ctx))}</span></div>`;
}

function insightPanel(ctx) {
  const insight = ctx.insights.find(item => item.type === 'descriptive_association') || ctx.insights[0];
  const warnings = insight?.limitations?.filter(item => /small.sample/i.test(item)) || [];
  const limitations = [...new Set(insight?.limitations?.filter(item => !/All records are synthetic|Missing observations are excluded|small.sample/i.test(item)) || [])];
  return `<aside class="perspective"><h2>${insight ? esc(insight.title) : 'A little more context'}</h2><p>${insight ? esc(insight.summary) : 'Choose a broader period or include more sources to explore a recorded pattern. Each day’s observations remain available above.'}</p>${warnings.map(item => `<p class="limitation">${esc(item)}</p>`).join('')}${limitations.length ? `<details class="perspective-details"><summary>How to read this finding</summary>${limitations.map(item => `<p>${esc(item)}</p>`).join('')}</details>` : ''}<div class="button-row">${insight ? evidenceButton([...(insight.calculationId ? [insight.calculationId] : []), ...(insight.evidenceRecordIds || [])], 'View finding evidence') : ''}<button class="text-button" data-screen="intelligence">Explore this period ${icon('arrow', 16)}</button></div></aside>`;
}

function filteredChart(ctx, key, id) {
  return excluded(ctx, key) ? `<div class="chart-empty chart-filtered"><p>${esc(metricLabel(key))} is hidden by filters.</p><span>Restore the selected measurements to see this trend.</span>${restoreButton()}</div>` : timeSeriesChart({points: series(ctx, key), metricKey: key, selectedDate: ctx.state.selectedDate, id});
}

export async function renderOverview(ctx) {
  const key = keys.includes(ctx.state.plotMetric) ? ctx.state.plotMetric : 'sleep_duration';
  const calc = summaryCalculation(ctx, key);
  return `<div class="overview-page"><section class="daily-journal" aria-labelledby="daily-title"><div class="journal-centerpiece"><h2 id="daily-title">Your days, connected.</h2>${coverageCalendar(ctx)}${dayNavigator(ctx)}</div>${selectedValues(ctx)}<div class="daily-footer"><span>Recorded observations, one date at a time.</span>${selectedIds(ctx).length ? `<button class="text-button" data-view-day="${esc(ctx.state.selectedDate)}">All records for ${esc(dateText(ctx))} ${icon('arrow', 16)}</button>` : ''}</div></section>
    <section class="month-section" aria-labelledby="month-title"><div class="section-heading"><div><h2 id="month-title">The days around it.</h2><p class="muted">${esc(rangeText(ctx))}, 2026 · Choose a measurement to explore.</p></div><button class="text-button" data-screen="recovery">Compare all four ${icon('arrow', 16)}</button></div><div class="plot-metric-tabs" role="group" aria-label="Measurement shown in trend">${keys.map(metric => `<button id="plot-tab-${metric}" data-plot-metric="${metric}" aria-pressed="${metric === key}" style="--metric-color:${metricColors[metric]}">${icon(metricIcons[metric], 17)}${shortLabels[metric]}</button>`).join('')}</div>
    <div class="focus-layout"><section class="focus-trend" style="--metric-color:${metricColors[key]}"><div class="trend-heading"><h3>${esc(metricLabel(key))} across your days</h3><p><strong>${esc(valueText(ctx, key))}</strong><span>${esc(dateText(ctx))}</span></p></div>${filteredChart(ctx, key, 'overview-trend')}<div class="chart-footer"><span>${excluded(ctx, key) ? 'Excluded by the current filters' : `${esc(ctx.summary.coverage.metrics[key]?.observedDays ?? 0)} days recorded · Gaps are missing observations`}</span>${!excluded(ctx, key) && calc?.sourceRecordIds.length ? evidenceButton([calc.id], 'View period evidence') : ''}</div></section>${insightPanel(ctx)}</div>${coverage(ctx)}</section>
    <section class="source-journey"><div><h2>Every reading has a source.</h2><p>Follow the records behind your picture, including what’s missing.</p></div><button class="button" data-screen="connect">Explore demo sources ${icon('arrow', 16)}</button></section></div>`;
}

function comparisonPanel(ctx) {
  const comparison = ctx.comparison;
  const exclusions = comparison.excludedDates.length ? `<p class="comparison-note">${esc(comparison.excludedDates.map(date => formatDate(date, {short:true})).join(', '))} excluded to make the two windows equal in length.</p>` : '';
  if (!comparison.previousRange) return `<section class="comparison-section"><h2>Compare periods</h2><p class="muted">At least two selected days are needed to compare equal periods.</p>${exclusions}<button class="text-button" data-range="30">Explore the full month ${icon('arrow', 16)}</button></section>`;
  return `<section class="comparison-section"><div class="section-heading"><div><h2>Earlier days. Later days.</h2><p class="muted">${esc(formatDate(comparison.previousRange.from, {short:true}))} – ${esc(formatDate(comparison.previousRange.to, {short:true}))} compared with ${esc(formatDate(comparison.currentRange.from, {short:true}))} – ${esc(formatDate(comparison.currentRange.to, {short:true}))}</p></div></div>${exclusions}<div class="comparison-list">${comparison.calculations.map(calc => {
    const key = calc.metricKeys[0], v = calc.values;
    if (excluded(ctx, key)) return `<article class="comparison-item" style="--metric-color:${metricColors[key]}"><h3>${esc(metricLabel(key))}</h3><p>Hidden by filters</p>${restoreButton()}</article>`;
    return `<article class="comparison-item" style="--metric-color:${metricColors[key]}"><h3>${esc(metricLabel(key))}</h3><div class="comparison-values"><span><small>Earlier average</small>${v.previousMean == null ? 'Not recorded' : esc(formatMetric(v.previousMean, key))}</span><span><small>Later average</small>${v.currentMean == null ? 'Not recorded' : esc(formatMetric(v.currentMean, key))}</span></div><p class="muted">${esc(v.previousCount)} earlier observations · ${esc(v.currentCount)} later observations</p><p class="comparison-missing">${esc(v.previousMissingDays)} earlier and ${esc(v.currentMissingDays)} later missing days excluded from averages.</p>${calc.sourceRecordIds.length ? evidenceButton([calc.id], 'View comparison evidence') : ''}</article>`;
  }).join('')}</div><p class="comparison-note">These averages describe the selected observations. Missing values are never counted as zero.</p></section>`;
}

export async function renderRecovery(ctx) {
  return `<div class="recovery-page"><section class="recovery-intro"><div><h2>Four measures, one timeline.</h2><p class="muted">Compare the same dates. Each chart keeps its own units.</p></div>${dayNavigator(ctx)}</section><div class="recovery-chart-help"><span>${esc(rangeText(ctx))}, 2026</span><span>Choose a point or use the day controls. Arrow keys move through a focused chart.</span></div>
    <div class="recovery-grid">${keys.map(key => {
      const point = selectedPoint(ctx, key), calc = summaryCalculation(ctx, key);
      return `<section class="recovery-chart" style="--metric-color:${metricColors[key]}"><div class="recovery-reading"><h3>${icon(metricIcons[key], 20)}${esc(metricLabel(key))}</h3><p class="recovery-value ${valueClass(ctx, key)}">${esc(valueText(ctx, key))}</p><p class="recovery-date">${esc(dateText(ctx))}</p><p class="measure-context">${esc(sourceText(ctx, key))}</p>${excluded(ctx, key) ? restoreButton() : point?.recordIds?.length ? evidenceButton(point.recordIds, 'View day evidence') : ''}</div><div class="recovery-plot">${filteredChart(ctx, key, `recovery-${key}`)}<div class="chart-footer"><span>${excluded(ctx, key) ? 'Excluded by the current filters' : `${esc(ctx.summary.coverage.metrics[key]?.observedDays ?? 0)} days recorded · Gaps are missing observations`}</span>${!excluded(ctx, key) && calc?.sourceRecordIds.length ? evidenceButton([calc.id], 'View period evidence') : ''}</div></div></section>`;
    }).join('')}</div>${coverage(ctx)}${comparisonPanel(ctx)}<section class="question-bridge"><div><h2>What was different on lower-energy days?</h2><p>Compare the observations, with the supporting records alongside the answer.</p></div><button class="button primary" data-ask="What patterns appear on lower-energy days?">Explore this question ${icon('arrow', 16)}</button></section></div>`;
}
