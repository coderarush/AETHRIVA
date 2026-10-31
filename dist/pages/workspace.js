import { escapeHtml, icon, formatMetric, formatDate, metricLabel, evidenceButton } from '../ui.js';

const metricKeys = ['sleep_duration', 'steps', 'resting_heart_rate', 'energy'];
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

function metricTabs(ctx) {
  const selected = ctx.state.metricKey || 'all';
  return `<div class="metric-tabs range-group" role="group" aria-label="Filter records by metric">${['all', ...metricKeys].map(key => `<button type="button" data-metric="${key}" class="${selected === key ? 'selected' : ''}" aria-pressed="${selected === key}">${safe(key === 'all' ? 'All metrics' : metricLabel(key))}</button>`).join('')}</div>`;
}

function sourceName(ctx, id) {
  return ctx.sources.find(source => source.id === id)?.name || id;
}

function sourceCoverage(ctx) {
  return ctx.sources.filter(source => source.status === 'demo_loaded').map(source => {
    const records = ctx.events.filter(event => event.sourceId === source.id);
    const dates = [...new Set(records.map(recordDay))].sort();
    return {source, records, dates};
  });
}

function sourceTable(ctx) {
  return `<div class="table-wrap" role="region" aria-label="Source coverage" tabindex="0"><table class="evidence-table"><caption class="sr-only">Synthetic source coverage within the selected scope</caption><thead><tr><th scope="col">Source</th><th scope="col">Records</th><th scope="col">Observed days</th><th scope="col">Coverage</th></tr></thead><tbody>${sourceCoverage(ctx).map(({source, records, dates}) => `<tr><th scope="row">${safe(source.name)}</th><td>${count(records.length)}</td><td>${count(dates.length)}</td><td>${dates.length ? range(dates[0], dates.at(-1)) : 'No matching records'}</td></tr>`).join('')}</tbody></table></div>`;
}

function summaryTable(ctx, printable = false) {
  const calculations = ctx.summary.calculations.filter(calculation => calculation.calculationType === 'summary');
  if (!ctx.summary.coverage.records || !calculations.length) return empty('No measurements to summarize', 'This scope has no recorded measurements. Broaden the dates or include another source.');
  return `<div class="table-wrap" role="region" aria-label="Descriptive statistics" tabindex="0"><table class="evidence-table"><caption class="sr-only">Calculated descriptive statistics for ${scope(ctx)}</caption><thead><tr><th scope="col">Metric</th><th scope="col">Mean</th><th scope="col">Range</th><th scope="col">Observed / missing days</th><th scope="col">Evidence</th></tr></thead><tbody>${calculations.map(calculation => {
    const key = calculation.metricKeys[0];
    const values = calculation.values;
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
  return `<div class="card-grid">${ctx.insights.map(insight => `<article class="panel insight-card"><span class="insight-type muted">${safe(labels[insight.type] || 'Calculated observation')}</span><h3>${safe(insight.title)}</h3><p>${safe(insight.summary)}</p><p class="muted">${range(insight.periodStart, insight.periodEnd)}</p>${limitations(insight.limitations)}${evidence([insight.calculationId, ...(insight.evidenceRecordIds || [])], 'View evidence')}${printable ? `<p class="record-id muted">${insight.calculationId ? `Calculation: ${safe(insight.calculationId)} · ${count((insight.evidenceRecordIds || []).length)} linked input records` : `Evidence: ${safe((insight.evidenceRecordIds || []).join(', '))}`}</p>` : ''}</article>`).join('')}</div>`;
}

export async function renderConnect(ctx) {
  const coverage = sourceCoverage(ctx);
  const selected = ctx.state.sourceIds;
  const future = ctx.sources.filter(source => source.status !== 'demo_loaded');
  return `${scopeNote(ctx)}<section class="panel"><div class="section-title"><h2 class="section-heading">A clear path from source to insight.</h2><span class="pill">Synthetic data only</span></div><p class="muted">Different formats, one inspectable record. Every observation keeps its original source, timestamp, unit, and stable record ID.</p><ol class="source-flow" aria-label="How selected records become findings"><li><span class="muted">01 · Source records</span><strong>${count(new Set(ctx.events.map(event => event.sourceId)).size)} represented sources</strong><p>Fictional exports and personal check-ins</p></li><li><span class="muted">02 · Canonical events</span><strong>${count(ctx.events.length)} records</strong><p>Consistent metric names, units, and Pacific dates</p></li><li><span class="muted">03 · Calculated findings</span><strong>${count(ctx.insights.length)} observations</strong><p>Reproducible calculations linked to their inputs</p></li></ol></section><div class="section-title"><h2 class="section-heading">Your source registry</h2><span class="muted">Counts reflect the current scope</span></div><div class="card-grid">${coverage.map(({source, records, dates}) => `<article class="panel source-card"><div class="section-title"><span class="source-icon" aria-hidden="true">${icon(source.sourceType === 'manual' ? 'check' : 'connect', 22)}</span><span class="pill source-status">Demo data loaded</span></div><h3>${safe(source.name)}</h3><p class="muted">${safe(source.description || 'Synthetic records prepared for this demonstration.')}</p><div class="detail-row"><span>Matching records</span><strong>${count(records.length)}</strong></div><div class="detail-row"><span>Observed days</span><strong>${count(dates.length)}</strong></div><p class="muted">${dates.length ? range(dates[0], dates.at(-1)) : 'No records match the current dates, sources, and metric.'}</p><label class="source-filter"><input type="checkbox" name="source" value="${safe(source.id)}" ${selected == null || selected.includes(source.id) ? 'checked' : ''}> Include this source</label><button type="button" class="button" data-view-source="${safe(source.id)}">Inspect records ${icon('arrow', 15)}</button></article>`).join('')}${future.map(source => `<article class="panel source-card"><span class="pill">Available in a future release</span><h3>${safe(source.name)}</h3><p class="muted">${safe(source.description || 'Not connected. No records from this source are included in the demonstration.')}</p><p>Future clinical imports would require an authorized connection and a separate privacy and security review.</p></article>`).join('')}</div><section class="panel"><h2 class="section-heading">Provenance stays with the record.</h2><p class="muted">Inspect a record to see its source record ID, original measurement, import batch, and transformation version. Calculated findings link to the complete set of input records, so a summary can always be traced back to its evidence.</p><button class="button" data-screen="timeline">Open unified timeline ${icon('arrow', 15)}</button></section>`;
}

export async function renderInsights(ctx) {
  return `${scopeNote(ctx)}${metricTabs(ctx)}<div class="section-title"><div><h2 class="section-heading">What the records show</h2><p class="muted">Descriptive observations, with the inputs close at hand.</p></div><button class="button" data-screen="intelligence">Ask Intelligence ${icon('arrow', 15)}</button></div>${insightCards(ctx)}<section class="panel"><div class="section-title"><h2 class="section-heading">The numbers underneath</h2><span class="muted">Missing days excluded from averages</span></div>${summaryTable(ctx)}</section>${comparisonSection(ctx)}<p class="muted">Associations describe how recorded values moved together. They do not establish cause, explain an individual day, or support a medical conclusion.</p>`;
}

export async function renderTimeline(ctx) {
  const records = [...ctx.events].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt) || a.id.localeCompare(b.id));
  return `${scopeNote(ctx)}${metricTabs(ctx)}<section class="panel"><div class="section-title"><h2 class="section-heading">The original observations</h2><span class="pill">${count(records.length)} records</span></div><p class="muted">Newest first · Times are shown in America/Los_Angeles. Select a date to keep that day in focus across views.</p>${records.length ? `<div class="table-wrap" role="region" aria-label="Synthetic observation records" tabindex="0"><table class="evidence-table"><caption class="sr-only">Filtered synthetic records, newest first</caption><thead><tr><th scope="col">Observed at · Pacific</th><th scope="col">Metric</th><th scope="col">Recorded value</th><th scope="col">Source</th><th scope="col">Record ID / quality</th><th scope="col">Evidence</th></tr></thead><tbody>${records.map(event => {
    const day = recordDay(event);
    const selected = ctx.state.selectedDate === day;
    return `<tr class="${selected ? 'selected' : ''}"><td><button type="button" class="timeline-day ${selected ? 'selected' : ''}" data-day="${safe(day)}" aria-pressed="${selected}"><time datetime="${safe(event.observedAt)}">${safe(timestamp(event.observedAt))}</time>${selected ? '<span class="sr-only">, selected day</span>' : ''}</button></td><th scope="row">${safe(metricLabel(event.metricKey))}</th><td>${measurement(event.value, event.metricKey)}</td><td>${safe(sourceName(ctx, event.sourceId))}</td><td><code class="record-id">${safe(event.id)}</code><span class="muted">${safe(event.quality)} · synthetic</span></td><td>${evidence([event.id], 'Inspect record')}</td></tr>`;
  }).join('')}</tbody></table></div>` : empty('No records match these filters', 'Try a wider date range, another metric, or include a source. An absent observation is different from a recorded zero.')}</section>`;
}

export async function renderReports(ctx) {
  const coverage = ctx.summary.coverage;
  return `<div class="section-title"><p class="muted">A concise, sourced record of the selected scope.</p><button type="button" class="button primary" data-print>${icon('reports', 16)} Print summary</button></div><article class="report"><header class="report-header"><span class="pill">Synthetic demonstration</span><h2>Recorded wellness summary</h2><p>${scope(ctx)} · America/Los_Angeles</p><p class="muted">${safe(ctx.state.metricKey && ctx.state.metricKey !== 'all' ? metricLabel(ctx.state.metricKey) : 'All recorded metrics')} · ${count(coverage.records)} records · ${count(coverage.daysWithRecords)} days with records · ${count(coverage.sources)} represented sources</p><p>This is an informational summary of recorded wellness data, not a medical assessment.</p></header><section class="panel"><h2 class="section-heading">Measurements in this scope</h2>${summaryTable(ctx, true)}<p class="muted">Means and ranges describe recorded values only. Missing days are excluded rather than filled with zero. Energy is a personal self-reported 1–10 scale, not a clinical instrument.</p></section>${comparisonSection(ctx, true)}<section class="panel"><h2 class="section-heading">Sources and coverage</h2>${sourceTable(ctx)}<p class="muted">Coverage reports the dates with observations, not continuous monitoring. All sources and measurements in this report are synthetic.</p></section><section><h2 class="section-heading">Evidence-linked observations</h2>${insightCards(ctx, true)}</section><section class="panel"><h2 class="section-heading">How to read this summary</h2><p class="muted">Every calculated result links to its input records. A difference between periods is descriptive; an association does not show cause. Gaps, source exclusions, and a small number of observations can change the apparent pattern. No diagnosis, treatment recommendation, or readiness score is produced.</p></section></article>`;
}

export async function renderAbout(ctx) {
  return `<section class="panel"><span class="pill">AETHRIVA · Demo workspace</span><h2 class="section-heading">Your records, with the context intact.</h2><p>AETHRIVA brings wellness observations into a coherent timeline and makes the calculations behind a finding easy to inspect.</p><p class="muted">This public workspace uses one fictional October 2026 dataset. All measurements, check-ins, and source records are synthetic. You can explore it without an account or sharing personal information.</p></section><div class="card-grid"><section class="panel"><span class="muted">01 · Connect</span><h3>Bring the pieces together.</h3><p class="muted">A shared event model keeps metric names and units consistent while retaining source IDs, timestamps, original values, and transformation details.</p><button class="button" data-screen="connect">Explore sources ${icon('arrow', 15)}</button></section><section class="panel"><span class="muted">02 · Intelligence</span><h3>Understand the calculation.</h3><p class="muted">Supported questions retrieve selected records and run deterministic calculations locally in your browser. Responses use those results; no live language model or connector is called.</p><button class="button" data-screen="intelligence">Ask a question ${icon('arrow', 15)}</button></section><section class="panel"><span class="muted">03 · Recovery</span><h3>See the context around a day.</h3><p class="muted">Sleep, steps, resting heart rate, and self-reported energy sit together without an invented composite health or readiness score.</p><button class="button" data-screen="recovery">Explore recovery ${icon('arrow', 15)}</button></section></div><div class="two-column"><section class="panel"><h2 class="section-heading">Evidence, from end to end.</h2><p class="muted">Each observation has a stable record ID and source provenance. Each calculation records its method, period, limitations, and complete input record IDs. Evidence actions expose those inputs alongside the finding.</p><p class="muted">Dates are interpreted in America/Los_Angeles. Missing observations remain missing. A recorded zero stays zero. Associations require at least seven paired observations; small samples carry an explicit warning.</p><button class="button" data-screen="timeline">Inspect the timeline ${icon('arrow', 15)}</button></section><section class="panel"><h2 class="section-heading">A useful view, with limits.</h2><p class="muted">This demonstration describes recorded wellness data. It does not diagnose, predict disease, prescribe treatment, or provide medical advice. Descriptive associations do not establish cause.</p><p class="muted">Wearable estimates and personal check-ins have limits. Real data imports, clinical records, and sharing are future capabilities that would need appropriate authorization and further privacy and security work.</p></section></div><section class="panel"><div class="section-title"><div><h2 class="section-heading">Built by</h2><p class="muted">TanujBuilds and coderarush</p></div><div class="team-links"><a class="button" href="https://github.com/TanujBuilds" target="_blank" rel="noopener noreferrer">TanujBuilds ${icon('arrow', 15)}</a><a class="button" href="https://github.com/coderarush" target="_blank" rel="noopener noreferrer">coderarush ${icon('arrow', 15)}</a><a class="button" href="https://github.com/coderarush/AETHRIVA" target="_blank" rel="noopener noreferrer">View source ${icon('arrow', 15)}</a></div></div></section>`;
}
