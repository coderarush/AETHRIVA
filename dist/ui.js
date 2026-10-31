export const metricLabels = {sleep_duration: 'Sleep duration', steps: 'Steps', resting_heart_rate: 'Resting heart rate', energy: 'Self-reported energy'};
export const metricLabel = key => metricLabels[key] || key;
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function formatMetric(value, key) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const number = Number(value);
  if (key === 'sleep_duration') {const minutes = Math.round(number); return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;}
  if (key === 'steps') return `${Math.round(number).toLocaleString('en-US')} steps`;
  if (key === 'resting_heart_rate') return `${number.toLocaleString('en-US', {maximumFractionDigits: 1})} bpm`;
  if (key === 'energy') return `${number.toLocaleString('en-US', {maximumFractionDigits: 1})}/10`;
  return number.toLocaleString('en-US', {maximumFractionDigits: 1});
}
export function formatDate(value, {short = false, time = false} = {}) {
  if (!value) return 'No observation';
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (!Number.isFinite(date.getTime())) return 'Unavailable date';
  return new Intl.DateTimeFormat('en-US', {timeZone: 'America/Los_Angeles', month: short ? 'short' : 'long', day: 'numeric', ...(time ? {hour: 'numeric', minute: '2-digit', timeZoneName: 'short'} : {})}).format(date);
}
const paths = {
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  overview:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  connect:'M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7',
  recovery:'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
  insights:'m3 17 6-6 4 4 8-10M16 5h5v5',
  timeline:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  intelligence:'m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z',
  reports:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6',
  about:'M12 11v6m0-10v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  arrow:'M5 12h14m-5-5 5 5-5 5', close:'m6 6 12 12M6 18 18 6', check:'m5 12 4 4L19 6',
  reset:'M3 11a9 9 0 1 1 2.3 7M3 4v7h7', calendar:'M4 5h16v16H4zM16 3v4M8 3v4M4 11h16',
  activity:'M3 12h4l3-8 4 16 3-8h4', sleep:'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
  source:'M12 3 2 8l10 5 10-5-10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
  energy:'m13 2-9 12h7l-1 8 10-12h-7l1-8', print:'M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6z',
};
export const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[({moon:'sleep',sparkles:'intelligence'})[name] || name] || paths.about}"/></svg>`;
export const evidenceButton = (ids, label = 'View evidence') => `<button class="button evidence-button" data-evidence="${escapeHtml(JSON.stringify(ids || []))}">${icon('source', 15)}${escapeHtml(label)}</button>`;
