import { escapeHtml, icon, formatMetric, formatDate, metricLabel, evidenceButton } from '../ui.js';
import {renderWorkouts} from './workouts.js';

const metricKeys = ['sleep_duration', 'steps', 'resting_heart_rate', 'energy'];
const metricSources = (ctx,key) => ctx.sources.filter(source => source.metricKeys?.includes(key) || ctx.events.some(event => event.metricKey === key && event.sourceId === source.id) || ({wearable:['sleep_duration','resting_heart_rate'],activity:['steps'],checkin:['energy']}[source.id] || []).includes(key)).map(source => source.id);
const count = value => Number(value || 0).toLocaleString('en-US');
const safe = escapeHtml;
const isNumber = value => typeof value === 'number' && Number.isFinite(value);
const measurement = (value, key) => isNumber(value) ? safe(formatMetric(value, key)) : 'Not available';
const range = (from, to) => `${safe(formatDate(from))}${from.slice(0, 4) !== to.slice(0, 4) ? `, ${safe(from.slice(0, 4))}` : ''} – ${safe(formatDate(to))}, ${safe(to.slice(0, 4))}`;
const scope = ctx => range(ctx.filters.from, ctx.filters.to);
const recordDay = event => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Los_Angeles', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date(event.observedAt));
const timestamp = iso => new Intl.DateTimeFormat('en-US', {timeZone:'America/Los_Angeles', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short'}).format(new Date(iso));
const evidence = (ids, label) => {
  const unique = [...new Set(ids.filter(Boolean))];
  return unique.length ? evidenceButton(unique, label) : '<span class="muted">No supporting records in this scope</span>';
};
const calculationEvidence = calculation => evidence([calculation.id, ...(calculation.sourceRecordIds || [])], 'Inspect calculation');
const scopeNote = ctx => `<p class="scope-note muted">${scope(ctx)} · Pacific time · Selected sources and metric apply throughout this workspace.</p>`;
const empty = (title, description) => `<section class="empty-state"><h2>${safe(title)}</h2><p>${safe(description)}</p><button class="button" data-clear-filters>Clear filters</button></section>`;
const sourceIncluded = (ctx, id) => {
  const selected = ctx.filters.sourceIds ?? ctx.state.sourceIds;
  return selected == null || selected.includes(id);
};
const measurementExcluded = (ctx, key) => {
  const metric = ctx.filters.metricKey ?? ctx.state.metricKey;
  return (metric && metric !== 'all' && metric !== key) || (metricSources(ctx,key).length > 0 && !metricSources(ctx,key).some(id => sourceIncluded(ctx, id)));
};
const hiddenMeasurementRow = (key, columns, calculation, printable) => `<tr><th scope="row">${safe(metricLabel(key))}</th><td colspan="${columns}" class="workspace-hidden-measurement"><strong>Hidden by filters</strong><span class="muted">Outside the selected sources or metric. This does not indicate missing observations.</span><button type="button" class="text-button" data-restore-measurements>Show all measurements</button></td><td>${calculationEvidence(calculation)}${printable ? `<small class="record-id">${safe(calculation.id)}</small>` : ''}</td></tr>`;

function metricTabs(ctx) {
  const selected = ctx.state.metricKey || 'all';
  return `<div class="metric-tabs range-group" role="group" aria-label="Filter records by metric">${['all', ...metricKeys].map(key => `<button type="button" data-metric="${key}" class="${selected === key ? 'selected' : ''}" aria-pressed="${selected === key}">${safe(key === 'all' ? 'All metrics' : metricLabel(key))}</button>`).join('')}</div>`;
}

function sourceName(ctx, id) {
  return ctx.sources.find(source => source.id === id)?.name || id;
}

function sourceCoverage(ctx) {
  return ctx.sources.filter(source => ['connected','ready','disconnected','demo_loaded'].includes(source.status)).map(source => {
    const records = ctx.events.filter(event => event.sourceId === source.id);
    const dates = [...new Set(records.map(recordDay))].sort();
    return {source, records, dates, included: sourceIncluded(ctx, source.id)};
  });
}

function sourceTable(ctx) {
  return `<div class="table-wrap" role="region" aria-label="Source coverage" tabindex="0"><table class="evidence-table"><caption class="sr-only">Source coverage within the selected scope</caption><thead><tr><th scope="col">Source</th><th scope="col">Records in scope</th><th scope="col">Observed days</th><th scope="col">Coverage</th></tr></thead><tbody>${sourceCoverage(ctx).map(({source, records, dates, included}) => `<tr><th scope="row">${safe(source.name)}</th><td>${count(records.length)}</td><td>${count(dates.length)}</td><td>${!included ? 'Excluded by source filter · saved history is retained' : dates.length ? range(dates[0], dates.at(-1)) : 'No observations match the dates and metric'}</td></tr>`).join('')}</tbody></table></div>`;
}

function summaryTable(ctx, printable = false) {
  const calculations = ctx.summary.calculations.filter(calculation => calculation.calculationType === 'summary');
  if (!ctx.summary.coverage.records || !calculations.length) return empty('No measurements to summarize', 'This scope has no recorded measurements. Broaden the dates or include another source.');
  return `<div class="table-wrap" role="region" aria-label="Descriptive statistics" tabindex="0"><table class="evidence-table"><caption class="sr-only">Calculated descriptive statistics for ${scope(ctx)}</caption><thead><tr><th scope="col">Metric</th><th scope="col">Mean</th><th scope="col">Range</th><th scope="col">Observed / missing days</th><th scope="col">Evidence</th></tr></thead><tbody>${calculations.map(calculation => {
    const key = calculation.metricKeys[0];
    const values = calculation.values;
    if (measurementExcluded(ctx, key)) return hiddenMeasurementRow(key, 3, calculation, printable);
    return `<tr><th scope="row">${safe(metricLabel(key))}${key === 'energy' ? '<span class="muted">Personal 1–10 scale</span>' : ''}</th><td>${measurement(values.mean, key)}</td><td>${isNumber(values.min) && isNumber(values.max) ? `${measurement(values.min, key)} – ${measurement(values.max, key)}` : 'Not available'}</td><td>${count(values.observedDays)} / ${count(values.missingDays)}</td><td>${calculationEvidence(calculation)}${printable ? `<small class="record-id">${safe(calculation.id)}</small>` : ''}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function comparisonSection(ctx, printable = false) {
  const comparison = ctx.comparison;
  const current = comparison.currentRange;
  const previous = comparison.previousRange;
  const explanation = current && previous ? `<p class="muted">Earlier: ${range(previous.from, previous.to)}<br>Later: ${range(current.from, current.to)}. Changes are later minus earlier.</p>` : '<p class="muted">A comparison needs two periods with recorded values.</p>';
  const calculations = comparison.calculations || [];
  return `<section class="panel"><div class="section-title"><h2 class="section-heading">Period comparison</h2><span class="pill">Calculated locally</span></div>${explanation}${comparison.status === 'insufficient_data' ? '<p class="scope-note">Insufficient data for a supported comparison in this scope. Unavailable changes are left empty.</p>' : ''}${calculations.length ? `<div class="table-wrap" role="region" aria-label="Period comparison values" tabindex="0"><table class="evidence-table"><caption class="sr-only">Earlier and later period averages</caption><thead><tr><th scope="col">Metric</th><th scope="col">Earlier mean</th><th scope="col">Later mean</th><th scope="col">Change</th><th scope="col">Observed days, earlier / later</th><th scope="col">Evidence</th></tr></thead><tbody>${calculations.map(calculation => {
    const key = calculation.metricKeys[0];
    const values = calculation.values;
    if (measurementExcluded(ctx, key)) return hiddenMeasurementRow(key, 4, calculation, printable);
    const delta = isNumber(values.delta) ? `${values.delta > 0 ? '+' : values.delta < 0 ? '−' : ''}${measurement(Math.abs(values.delta), key)}` : 'Not available';
    const percentage = isNumber(values.percentageChange) ? `${values.percentageChange > 0 ? '+' : ''}${values.percentageChange.toLocaleString('en-US', {maximumFractionDigits:1})}%` : null;
    return `<tr><th scope="row">${safe(metricLabel(key))}</th><td>${measurement(values.previousMean, key)}</td><td>${measurement(values.currentMean, key)}</td><td>${delta}${percentage ? `<span class="muted">${safe(percentage)}</span>` : ''}</td><td>${count(values.previousCount)} / ${count(values.currentCount)}</td><td>${calculationEvidence(calculation)}${printable ? `<small class="record-id">${safe(calculation.id)}</small>` : ''}</td></tr>`;
  }).join('')}</tbody></table></div>` : '<p class="muted">No period calculations are available for the selected records.</p>'}${comparison.excludedDates?.length ? `<p class="muted">Excluded to keep periods equal: ${comparison.excludedDates.map(date => safe(formatDate(date))).join(', ')}.</p>` : ''}${limitations(comparison.limitations)}</section>`;
}

function limitations(notes = []) {
  return notes.length ? `<ul class="insight-limitations muted">${[...new Set(notes)].map(note => `<li>${safe(note)}</li>`).join('')}</ul>` : '';
}

function insightCards(ctx, printable = false) {
  if (!ctx.insights.length) return empty('No findings for this scope', 'Include more recorded days or sources to explore descriptive patterns. Missing observations are never treated as zero.');
  const labels = {trend:'Recorded trend', period_change:'Period change', descriptive_association:'Exploratory association', coverage_note:'Coverage note'};
  return `<div class="workspace-findings">${ctx.insights.map((insight, index) => {
    const warnings = (insight.limitations || []).filter(note => /small.sample|insufficient data/i.test(note));
    const otherNotes = (insight.limitations || []).filter(note => !warnings.includes(note));
    return `<article class="panel workspace-finding${index === 0 ? ' workspace-finding-lead' : ''}"><h3>${safe(insight.title)}</h3><div class="finding-context"><span>${safe(labels[insight.type] || 'Calculated observation')}</span><span>${range(insight.periodStart, insight.periodEnd)}</span></div><p class="finding-summary">${safe(insight.summary)}</p>${warnings.length ? `<div class="finding-warning"><strong>Read with caution</strong>${limitations(warnings)}</div>` : ''}<div class="finding-evidence">${evidence([insight.calculationId, ...(insight.evidenceRecordIds || [])], 'View evidence')}<span class="muted">${count((insight.evidenceRecordIds || []).length)} linked input records</span></div>${otherNotes.length ? `<details class="finding-limits" ${printable ? 'open' : ''}><summary>Limits of this finding</summary>${limitations(otherNotes)}</details>` : ''}${printable ? `<p class="record-id muted">${insight.calculationId ? `Calculation: ${safe(insight.calculationId)}` : `Evidence: ${safe((insight.evidenceRecordIds || []).join(', '))}`}</p>` : ''}</article>`;
  }).join('')}</div>`;
}

export {renderConnect} from './connections.js';

export async function renderInsights(ctx) {
  return `<div class="workspace-view workspace-insights">${scopeNote(ctx)}${metricTabs(ctx)}<div class="section-title workspace-view-intro"><div><h2>What the records show</h2><p class="muted">Read the finding. Inspect the records behind it.</p></div><button class="button" data-screen="intelligence">Ask Intelligence ${icon('arrow', 16)}</button></div>${insightCards(ctx)}<section class="panel"><div class="section-title"><div><h2>The numbers underneath</h2><p class="muted">Missing days are excluded from averages.</p></div></div>${summaryTable(ctx)}</section>${comparisonSection(ctx)}<p class="workspace-reading-note muted">Associations describe how recorded values moved together. They do not establish cause, explain an individual day, or support a medical conclusion.</p></div>`;
}

export async function renderTimeline(ctx) {
  if(ctx.workspace?.workouts.length&&ctx.state.sourceIds.length===1&&ctx.state.sourceIds[0]==='lyfta'&&ctx.state.metricKey==='all')return `<div class="workspace-view workspace-timeline">${scopeNote(ctx)}${renderWorkouts(ctx)}</div>`;
  const records = [...ctx.events].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt) || a.id.localeCompare(b.id));
  return `<div class="workspace-view workspace-timeline">${scopeNote(ctx)}${metricTabs(ctx)}<section class="panel"><div class="section-title"><div><h2>The original observations</h2><p class="muted">Newest first · Pacific time. Select a date to keep that day in focus.</p></div><span class="pill">${count(records.length)} records</span></div>${records.length ? `<p class="timeline-scroll-hint muted">Scroll the table to see every column. Inspect a record for its full provenance.</p><div class="table-wrap timeline-records" role="region" aria-label="Observation records, scroll to see all columns" tabindex="0"><table class="evidence-table"><caption class="sr-only">Filtered source records, newest first</caption><thead><tr><th scope="col">Recorded at · Pacific</th><th scope="col">Measurement</th><th scope="col">Source and record</th><th scope="col">Evidence</th></tr></thead><tbody>${records.map(event => {
    const day = recordDay(event);
    const selected = ctx.state.selectedDate === day;
    return `<tr class="${selected ? 'selected' : ''}"><td><button type="button" class="timeline-day ${selected ? 'selected' : ''}" data-day="${safe(day)}" aria-pressed="${selected}"><time datetime="${safe(event.observedAt)}">${event.metadata?.timestampPrecision==='day'?safe(formatDate(event.metadata.civilDate))+' · Daily aggregate':safe(timestamp(event.observedAt))}</time>${selected ? '<span class="sr-only">, selected day</span>' : ''}</button></td><th scope="row"><span class="timeline-metric">${safe(metricLabel(event.metricKey))}</span><strong class="timeline-value">${measurement(event.value, event.metricKey)}</strong></th><td><span class="timeline-source">${safe(sourceName(ctx, event.sourceId))}</span><code class="record-id">${safe(event.id)}</code><span class="muted timeline-quality">${safe(event.quality)}</span></td><td>${evidence([event.id], 'Inspect record')}</td></tr>`;
  }).join('')}</tbody></table></div>` : empty('No records match these filters', 'Try a wider date range, another metric, or include a source. An absent observation is different from a recorded zero.')}</section>${renderWorkouts(ctx)}</div>`;
}

export async function renderReports(ctx) {
  const coverage = ctx.summary.coverage;
  return `<div class="workspace-view workspace-reports"><div class="section-title"><p class="muted">A sourced summary of the selected records, ready to print.</p><button type="button" class="button primary" data-print>${icon('reports', 16)} Print summary</button></div><article class="report"><header class="report-header"><h2>Recorded wellness summary</h2><p>${scope(ctx)} · Pacific time</p><p class="report-scope">${safe(ctx.state.metricKey && ctx.state.metricKey !== 'all' ? metricLabel(ctx.state.metricKey) : 'All recorded metrics')} · ${count(coverage.records)} records · ${count(coverage.daysWithRecords)} days with records · ${count(coverage.sources)} represented sources</p><p class="muted">This is an informational summary of your recorded data, not a medical assessment.</p></header><section class="panel"><h2 class="section-heading">Measurements in this scope</h2>${summaryTable(ctx, true)}<p class="muted">Means and ranges use recorded values only. Missing days are excluded. Energy is a personal self-reported 1–10 scale, not a clinical instrument.</p></section>${comparisonSection(ctx, true)}<section class="panel"><h2 class="section-heading">Sources and coverage</h2>${sourceTable(ctx)}<p class="muted">Coverage shows dates with observations, not continuous monitoring.</p></section><section><h2 class="section-heading">Evidence-linked observations</h2>${insightCards(ctx, true)}</section><section class="panel"><h2 class="section-heading">How to read this summary</h2><p class="muted">Every result links to its input records. Period differences are descriptive; associations do not show cause. Gaps, source exclusions, and small samples can change the apparent pattern. No diagnosis, treatment recommendation, or readiness score is produced.</p></section></article></div>`;
}

export async function renderAbout(ctx) {
  return `<div class="workspace-view workspace-about"><section class="workspace-about-intro"><h2>Your records. A clearer picture.</h2><p>Measurements and workouts keep their source, date, and original units. Follow a finding back to the observations behind it.</p></section><div class="workspace-about-details"><section class="panel"><h2>Private history, on your computer.</h2><p class="muted">The local workspace reads the history already synchronized by your Health app. Google authorization and Lyfta credentials stay with that app. Your personal history is never included in the public website or source code.</p><p class="muted">The public site can explore connection options and receive a compatible Bluetooth heart-rate stream in this browser. It does not access another visitor’s records.</p><button class="button" data-screen="connect">Manage connections ${icon('arrow',16)}</button></section><section class="panel"><h2>Evidence, from end to end.</h2><p class="muted">Calculations run locally and retain their input records. Dates use Pacific time. Missing stays missing; a recorded zero stays zero.</p><p class="muted">Sleep totals include recorded naps. Live Bluetooth heart rate is a separate measurement from resting heart rate. Energy only appears when it has actually been reported.</p><button class="button" data-screen="timeline">Inspect timeline ${icon('arrow',16)}</button></section><section class="panel"><h2>Useful context, with limits.</h2><p class="muted">AETHRIVA organizes recorded information. It does not diagnose, predict disease, or recommend treatment. Associations describe the records and do not establish cause.</p><p class="muted">Bluetooth compatibility depends on the device protocol and browser. ECG and other proprietary medical devices may require a manufacturer integration. Catalog listings do not imply a tested connection.</p></section></div><section class="workspace-authors"><div><h2>Built by</h2><p class="muted">TanujBuilds and coderarush</p></div><div class="team-links"><a class="button" href="https://github.com/TanujBuilds" target="_blank" rel="noopener noreferrer">TanujBuilds ${icon('arrow',16)}</a><a class="button" href="https://github.com/coderarush" target="_blank" rel="noopener noreferrer">coderarush ${icon('arrow',16)}</a><a class="button" href="https://github.com/coderarush/Bodha" target="_blank" rel="noopener noreferrer">View source ${icon('arrow',16)}</a></div></section></div>`;
}
