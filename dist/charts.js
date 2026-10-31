import { escapeHtml, formatMetric, formatDate, metricLabel } from './ui.js';

export const metricColors = Object.freeze({
  sleep_duration: '#b9a4ff', steps: '#ff9a62', resting_heart_rate: '#86b0ff', energy: '#69d5ba',
});

// Adapted from the selected preview's segmented SVG line chart. Nulls break the
// path; points remain exact, with no smoothing or interpolated observations.
export function timeSeriesChart({ points = [], metricKey, selectedDate, id = 'series', interactive = true }) {
  const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '-');
  const valid = points.filter(point => Number.isFinite(point.value));
  if (!valid.length) return `<div class="chart-empty empty-state"><p>No ${escapeHtml(metricLabel(metricKey).toLowerCase())} records in this view.</p><span class="muted">Change the date range or source filters to explore available records.</span></div>`;
  const upper = metricKey === 'energy' ? Math.max(10, ...valid.map(point => point.value)) : Math.max(...valid.map(point => point.value), 1) * 1.12;
  const x = index => points.length === 1 ? 500 : 28 + index * 944 / (points.length - 1);
  const y = value => 192 - value / upper * 170;
  let drawing = false;
  const path = points.map((point, index) => {
    if (!Number.isFinite(point.value)) { drawing = false; return ''; }
    const segment = `${drawing ? 'L' : 'M'}${x(index).toFixed(2)},${y(point.value).toFixed(2)}`;
    drawing = true;
    return segment;
  }).join(' ');
  const selectedIndex = points.findIndex(point => point.date === selectedDate);
  const label = point => `${formatDate(point.date, { short: true })}: ${Number.isFinite(point.value) ? formatMetric(point.value, metricKey) : 'No recorded value'}`;
  const ticks = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  return `<figure class="time-series" style="--metric-color:${metricColors[metricKey] || metricColors.resting_heart_rate}" aria-labelledby="${safeId}-caption">
    <figcaption class="sr-only" id="${safeId}-caption">${escapeHtml(metricLabel(metricKey))} by date. Missing observations appear as gaps.${interactive ? ' Select a point to explore that day across all measurements.' : ''}</figcaption>
    <div class="chart-scale" aria-hidden="true"><span>${escapeHtml(formatMetric(upper, metricKey))}</span><span>${escapeHtml(formatMetric(upper / 2, metricKey))}</span><span>${escapeHtml(formatMetric(0, metricKey))}</span></div>
    <div class="chart-plot">
      <svg viewBox="0 0 1000 220" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(metricLabel(metricKey))} trend, ${valid.length} recorded days">
        ${[22, 107, 192].map(value => `<line class="chart-gridline" x1="0" x2="1000" y1="${value}" y2="${value}"/>`).join('')}
        ${selectedIndex < 0 ? '' : `<line class="chart-selection" x1="${x(selectedIndex)}" x2="${x(selectedIndex)}" y1="8" y2="204"/>`}
        <path class="chart-line" d="${path}"/>
        ${points.map((point, index) => !Number.isFinite(point.value) ? '' : `<circle class="chart-point ${point.date === selectedDate ? 'is-selected' : ''}" cx="${x(index)}" cy="${y(point.value)}" r="${point.date === selectedDate ? 5 : 3}"><title>${escapeHtml(label(point))}</title></circle>`).join('')}
      </svg>
      ${interactive ? points.map((point, index) => `<button type="button" class="chart-hit ${point.date === selectedDate ? 'is-selected' : ''}" data-day="${escapeHtml(point.date)}" style="left:${x(index) / 10}%;top:${(Number.isFinite(point.value) ? y(point.value) : 192) / 2.2}%" aria-label="${escapeHtml(label(point))}" aria-pressed="${point.date === selectedDate}"><span class="chart-tip ${index > points.length / 2 ? 'tip-left' : 'tip-right'}">${escapeHtml(label(point))}</span></button>`).join('') : ''}
      <div class="chart-dates" aria-hidden="true">${ticks.map(index => `<span>${escapeHtml(formatDate(points[index].date, { short: true }))}</span>`).join('')}</div>
    </div>
  </figure>`;
}
