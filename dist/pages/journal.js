import {escapeHtml as esc,formatDate,icon} from '../ui.js';
import {civilDate} from '../data/metrics.js';

export function renderEnergyCheckin(ctx) {
  if(ctx.workspace?.mode!=='local')return '';
  const saved=ctx.workspace.events.find(event=>event.sourceId==='checkins'&&event.metricKey==='energy'&&civilDate(event.observedAt)===ctx.state.selectedDate);
  const draft=ctx.journalUI?.checkinDraft;
  const date=draft?.date||ctx.state.selectedDate,energy=draft?.energy??saved?.value??'';
  return `<section class="energy-checkin panel" aria-labelledby="energy-checkin-title"><div><h2 id="energy-checkin-title">Daily energy check-in</h2><p class="muted">How much energy did you have? Your own rating, from 1 to 10.</p></div><form id="energy-checkin-form"><label for="checkin-date">Date<input id="checkin-date" type="date" name="date" value="${esc(date)}" max="${civilDate(new Date())}" ${ctx.journalUI?.savingCheckin?'disabled':''} required></label><label for="checkin-energy">Energy<select id="checkin-energy" name="energy" ${ctx.journalUI?.savingCheckin?'disabled':''} required><option value="">Choose a rating</option>${Array.from({length:10},(_,i)=>i+1).map(value=>`<option value="${value}" ${Number(energy)===value?'selected':''}>${value}${value===1?' — Very low':value===10?' — Very high':''}</option>`).join('')}</select></label><button class="button primary" type="submit" ${ctx.journalUI?.savingCheckin?'disabled':''}>${ctx.journalUI?.savingCheckin?'Saving…':saved?'Update check-in':'Save check-in'}</button></form><p class="journal-save-status" role="status">${esc(ctx.journalUI?.message||'Saved check-ins appear in your timeline and energy trend.')}</p></section>`;
}

export const readingLabel=kind=>({heart_rate:'Heart rate',blood_pressure:'Blood pressure',pulse_oximeter:'Oxygen saturation'})[kind]||'Device reading';
const numeric=value=>Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:1}):'Not available';
export function readingValue(sample) {
  if(sample.kind==='blood_pressure')return `${numeric(sample.systolic)} / ${numeric(sample.diastolic)} ${sample.unit}`;
  if(sample.kind==='pulse_oximeter')return `${numeric(sample.spo2)} %${sample.pulseRate==null?'':` · Pulse ${numeric(sample.pulseRate)} bpm`}`;
  return `${numeric(sample.bpm)} bpm`;
}
export function scopedDeviceReadings(ctx) {
  if(ctx.state.metricKey!=='all'||!ctx.state.sourceIds.includes('bluetooth'))return [];
  return (ctx.workspace?.deviceReadings||[]).filter(record=>{const day=civilDate(record.sample.timestamp);return day>=ctx.state.from&&day<=ctx.state.to;}).sort((a,b)=>b.sample.timestamp.localeCompare(a.sample.timestamp));
}
export function renderDeviceHistory(ctx,{printable=false}={}) {
  const allRows=scopedDeviceReadings(ctx);
  const page=Math.max(0,Math.min(ctx.journalUI?.devicePage||0,Math.max(0,Math.ceil(allRows.length/100)-1)));
  const rows=printable?allRows:allRows.slice(page*100,page*100+100);
  if(!rows.length)return '';
  return `<section class="device-history" aria-labelledby="saved-device-title"><div class="section-title"><div><h2 id="saved-device-title">Saved device readings</h2><p class="muted">${allRows.length} readings in scope. Device measurements remain separate from daily resting heart rate.</p></div>${printable?'':'<button class="button" data-screen="connect">Connect a device '+icon('connect',16)+'</button>'}</div><div class="table-wrap" role="region" aria-label="Saved device readings" tabindex="0"><table class="evidence-table"><thead><tr><th>Recorded</th><th>Measurement</th><th>Value</th><th>Device</th><th>Details</th></tr></thead><tbody>${rows.map(record=>`<tr><td>${esc(formatDate(record.sample.timestamp,{short:true,time:true}))}</td><th scope="row">${esc(readingLabel(record.sample.kind))}</th><td>${esc(readingValue(record.sample))}</td><td>${esc(record.deviceName)}</td><td><details ${printable?'open':''}><summary>Source and quality</summary><p>Record: ${esc(record.id)}</p><p>Saved ${esc(formatDate(record.receivedAt,{short:true,time:true}))}</p>${record.sample.deviceTimestamp?`<p>Device clock: ${esc(record.sample.deviceTimestamp)} (timezone not supplied)</p>`:''}${(record.sample.qualityWarnings||[]).map(note=>`<p class="sensor-note">${esc(note)}</p>`).join('')}${record.sample.measurementStatus==null?'':`<p>Measurement status: ${esc(record.sample.measurementStatus)}</p>`}${record.sample.deviceSensorStatus==null?'':`<p>Sensor status: ${esc(record.sample.deviceSensorStatus)}</p>`}</details></td></tr>`).join('')}</tbody></table></div>${!printable&&allRows.length>100?`<nav class="reading-pagination" aria-label="Device reading pages"><button class="button" data-reading-page="${page-1}" ${page===0?'disabled':''}>Previous</button><span>Showing ${page*100+1}–${Math.min(page*100+100,allRows.length)} of ${allRows.length}</span><button class="button" data-reading-page="${page+1}" ${(page+1)*100>=allRows.length?'disabled':''}>Next</button></nav>`:''}</section>`;
}
