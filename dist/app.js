import {sources, demoProfile, metrics} from './data/demo-data.js';
import {selectEvents, summarize, comparePeriods, buildInsights, answerQuestion, resolveEvidence} from './data/demo-service.js';
import {createInitialState, normalizeState, stateFromSearch, searchFromState, rangeState, toggleSource, scopeFromEvidence} from './demo-state.js';
import {escapeHtml as esc, icon, formatDate, formatMetric, metricLabel, evidenceButton} from './ui.js';
import {renderOverview, renderRecovery} from './pages/experience.js';
import {renderConnect, renderInsights, renderTimeline, renderReports, renderAbout} from './pages/workspace.js';

const root = document.getElementById('app');
const loadedSources = sources.filter(source => source.status === 'demo_loaded');
const labels = {overview:'Overview',connect:'Connect',recovery:'Recovery',insights:'Insights',timeline:'Timeline',intelligence:'Intelligence',reports:'Reports',about:'About'};
const titles = {overview:'Your health, in context.',connect:'One connected history.',recovery:'See your days together.',insights:'Patterns, with perspective.',timeline:'Every observation, in view.',intelligence:'Understand the story behind your data.',reports:'Bring a clearer picture.',about:'Clarity you can trace.'};
const descriptions = {overview:'A little distance. A clearer picture of your days.',connect:'Different sources. A shared timeline. The detail stays with every record.',recovery:'Sleep, movement, and how you felt — considered together, measured separately.',insights:'Transparent calculations, visible evidence, and room for uncertainty.',timeline:'Explore the observations behind every chart and explanation.',intelligence:'Explore recorded patterns, then follow each finding back to its source.',reports:'A neutral summary of the selected records, ready to review or print.',about:'A personal intelligence workspace built around recorded information.'};
const questions = ['Summarize sleep and activity patterns over the last 30 days.','Compare the first and second halves of this month.','What was different on days with lower self-reported energy?','Show the records behind the sleep trend.','Prepare a neutral summary I can discuss with a healthcare professional.'];
let state = stateFromSearch(location.search), renderedContext = null, version = 0;
let conversation = [], draft = '', sending = false, requestVersion = 0, evidence = null, evidenceTrigger = null;
let motion = 'on';
try {motion = localStorage.getItem('aethriva-motion') || 'on';} catch {}
document.documentElement.dataset.motion = motion;
const scope = value => ({from:value.from,to:value.to,sourceIds:[...value.sourceIds],...(value.metricKey !== 'all' ? {metricKey:value.metricKey} : {})});
const periodLabel = filters => `${formatDate(filters.from, {short:true})}–${formatDate(filters.to, {short:true})}, 2026`;
function toast(text) {const node = document.getElementById('toast');node.textContent=text;node.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>{node.hidden=true;},4500);}
function writeUrl(replace = false) {history[replace ? 'replaceState' : 'pushState']({aethriva:true},'',`${location.pathname}${searchFromState(state)}`);}
function focusDescriptor() {
  const active=document.activeElement;
  if (!active || active===document.body) return null;
  return {id:active.id,day:active.dataset.day,screen:active.dataset.screen,range:active.dataset.range,metric:active.dataset.metric,source:active.name==='source'?active.value:null,label:active.getAttribute('aria-label'),figure:active.closest('figure')?.getAttribute('aria-labelledby'),article:active.closest('article')?.querySelector('h3')?.textContent};
}
function restoreFocus(descriptor) {
  if(!descriptor)return;
  let target=descriptor.id?document.getElementById(descriptor.id):null;
  for(const key of ['day','screen','range','metric'])if(!target&&descriptor[key])target=[...document.querySelectorAll(`[data-${key}]`)].find(node=>node.dataset[key]===descriptor[key]&&(!descriptor.figure||node.closest('figure')?.getAttribute('aria-labelledby')===descriptor.figure)&&(!descriptor.label||node.getAttribute('aria-label')===descriptor.label));
  if(!target&&descriptor.source)target=[...document.querySelectorAll('input[name="source"]')].find(node=>node.value===descriptor.source&&(!descriptor.article||node.closest('article')?.querySelector('h3')?.textContent===descriptor.article));
  target?.focus({preventScroll:true});
}
function header() {
  return `<header class="app-header"><button class="brand" data-screen="overview" aria-label="AETHRIVA overview">${icon('activity',25)}<span>aethriva<span class="brand-dot">.</span></span></button>
    <nav class="primary-nav" aria-label="Primary navigation">${Object.entries(labels).filter(([key])=>key!=='about').map(([key,label])=>`<button class="nav-button ${state.screen===key?'selected':''}" data-screen="${key}" ${state.screen===key?'aria-current="page"':''}>${icon(key,17)}<span>${label}</span></button>`).join('')}</nav>
    <div class="header-actions"><button class="avatar" data-screen="about" aria-label="About this fictional workspace">${esc(demoProfile.initials)}</button></div></header>`;
}
function toolbar() {
  const count=state.sourceIds.length,days=Math.round((Date.parse(state.to)-Date.parse(state.from))/86400000)+1;
  return `<div class="scope-toolbar"><div class="range-tabs" role="group" aria-label="Date range">${[7,14,30].map(n=>`<button class="${days===n&&state.to==='2026-10-30'?'selected':''}" data-range="${n}" aria-pressed="${days===n&&state.to==='2026-10-30'}">${n} days</button>`).join('')}</div>
    <details class="source-filter"><summary>${icon('source',15)}${count===loadedSources.length?'All sources':`${count} source${count===1?'':'s'}`}</summary><div class="source-options">${loadedSources.map(source=>`<label><input type="checkbox" name="source" value="${esc(source.id)}" ${state.sourceIds.includes(source.id)?'checked':''}>${esc(source.name)}</label>`).join('')}</div></details>
    <details class="date-filter"><summary>${icon('calendar',15)}${periodLabel(state)}</summary><form id="custom-range" class="date-range-form"><label>From<input type="date" name="from" min="2026-10-01" max="2026-10-30" value="${state.from}" required></label><label>To<input type="date" name="to" min="2026-10-01" max="2026-10-30" value="${state.to}" required></label><button class="button primary" type="submit">Apply range</button></form></details>
    ${state.metricKey!=='all'?`<button class="pill active-filter" data-metric="all">${esc(metricLabel(state.metricKey))}${icon('close',12)}</button>`:''}
    <span class="scope-spacer"></span><button class="button subtle" data-reset title="Restore the original demo">${icon('reset',14)}Reset demo</button></div>`;
}
const prose = value => String(value||'').split(/\n\n+/).filter(Boolean).map(p=>`<p>${esc(p).replaceAll('\n','<br>')}</p>`).join('');
function answerHtml(entry,index) {
  const response=entry.response;
  const ids=[...new Set(response.findings.flatMap(f=>[...(f.evidenceRecordIds||[]),...(f.calculationId?[f.calculationId]:[])]))];
  return `<article class="conversation-turn" data-answer-index="${index}"><div class="message user"><span class="message-author">You</span><p>${esc(entry.question)}</p></div><div class="message assistant"><div class="answer-heading"><span class="analyst-mark">${icon('intelligence',18)}</span><span>Aethriva analyst</span><span class="pill">${response.responseType==='supported'?'Evidence-backed':response.responseType==='out_of_scope'?'Outside scope':'Insufficient evidence'}</span></div><div class="answer-prose">${prose(response.answer)}</div>
    ${response.findings.length?`<div class="answer-findings">${response.findings.map(f=>`<div class="answer-finding"><strong>${esc(f.label)}</strong>${f.value?`<span class="finding-value">${esc(f.value)}</span>`:''}<p>${esc(f.explanation)}</p>${evidenceButton([...(f.evidenceRecordIds||[]),...(f.calculationId?[f.calculationId]:[])],'Trace this finding')}</div>`).join('')}</div>`:''}
    <div class="answer-footer"><span>${esc(periodLabel(entry.filters))} · ${entry.filters.sourceIds.length} sources</span>${ids.length?evidenceButton(ids,'Explore supporting evidence'):''}</div>
    ${response.limitations.length?`<details class="answer-limitations"><summary>Scope and limitations</summary><ul>${response.limitations.map(note=>`<li>${esc(note)}</li>`).join('')}</ul></details>`:''}</div></article>`;
}
function renderIntelligence() {
  return `<div class="intelligence-workspace"><div class="analyst-status"><span class="status-dot"></span>Calculated locally · synthetic demo<span class="muted">Your question stays in this browser.</span></div>
  ${!conversation.length?`<section class="analyst-welcome"><div class="analyst-orbit">${icon('intelligence',34)}</div><h2>A good question brings<br>the picture into focus.</h2><p>Compare your days. Explore a pattern.<br>See exactly what supports the answer.</p><div class="question-grid">${questions.slice(0,4).map((q,i)=>`<button class="question-card" data-question="${esc(q)}"><span>${['Your month, in perspective','What changed over time','Sleep, movement, and energy','Follow a sleep trend'][i]}</span><strong>${esc(q)}</strong>${icon('arrow',17)}</button>`).join('')}</div></section>`:`<div class="chat-messages" role="log" aria-label="Conversation">${conversation.map(answerHtml).join('')}</div>`}
  ${sending?`<div class="analyst-pending" role="status">${icon('intelligence',17)}Reading the selected records…</div>`:''}
  <form class="composer" id="question-form"><label class="sr-only" for="question-input">Ask about the synthetic records</label><textarea id="question-input" rows="2" maxlength="2000" placeholder="Ask what changed, or what’s behind a pattern…" ${sending?'disabled':''}>${esc(draft)}</textarea><div class="composer-bottom"><span>${icon('source',13)}${esc(periodLabel(state))} · ${state.sourceIds.length} sources</span><button class="button primary" type="submit" ${sending?'disabled':''}>${sending?'Calculating…':'Ask Aethriva'}${icon('arrow',16)}</button></div></form>
  <div class="suggestions"><button data-question="${esc(questions[4])}">${icon('reports',14)}Prepare a neutral summary</button>${conversation.length?`<button data-new-chat>New conversation</button>`:''}</div><p class="analyst-note">An explanation of recorded wellness data. No diagnosis, treatment, or readiness score.</p></div>`;
}
function evidenceHtml() {
  if(!evidence)return '';
  const sourceMap=new Map(sources.map(s=>[s.id,s]));
  return `<section class="evidence-section panel" id="evidence" tabindex="-1" aria-labelledby="evidence-title"><div class="evidence-heading"><div><span class="page-kicker">The records behind the finding</span><h2 id="evidence-title">Follow the evidence.</h2><p class="muted">${esc(periodLabel(evidence.filters))} · ${evidence.records.length} supporting records · Synthetic data</p></div><button class="button subtle" data-close-evidence aria-label="Close evidence">${icon('close',18)}</button></div>
    ${evidence.calculations.length?`<div class="calculation-list">${evidence.calculations.map(calc=>`<details class="calculation-details"><summary>${esc(calc.method)}<span>${esc(calc.id)}</span></summary><p>${esc(calc.periodStart)} to ${esc(calc.periodEnd)} · ${calc.sourceRecordIds.length} input records</p><dl>${Object.entries(calc.values).map(([label,value])=>`<div><dt>${esc(label.replace(/([A-Z])/g,' $1'))}</dt><dd>${value==null?'Not available':esc(typeof value==='number'?value.toLocaleString('en-US',{maximumFractionDigits:4}):value)}</dd></div>`).join('')}</dl>${calc.limitations.length?`<ul>${calc.limitations.map(note=>`<li>${esc(note)}</li>`).join('')}</ul>`:''}</details>`).join('')}</div>`:''}
    <div class="table-wrap evidence-records"><table class="evidence-table"><caption class="sr-only">All underlying records for this evidence selection</caption><thead><tr><th>Observation</th><th>Value</th><th>Recorded</th><th>Source</th><th>Record</th></tr></thead><tbody>${evidence.records.map(record=>`<tr><td>${esc(record.metricLabel)}</td><td>${esc(formatMetric(record.value,record.metricKey))}</td><td>${esc(formatDate(record.observedAt,{short:true,time:true}))}</td><td>${esc(sourceMap.get(record.sourceId)?.name||record.provenance.sourceName)}</td><td><details><summary>${esc(record.id)}</summary><p>Source record: ${esc(record.sourceRecordId)}</p><p>Original: ${esc(record.originalValue)} ${esc(record.originalUnit)}</p><p>Imported: ${esc(formatDate(record.importedAt,{short:true,time:true}))}</p><p>Batch: ${esc(record.provenance.importBatchId)}<br>Transformation: ${esc(record.provenance.transformationVersion)}</p></details></td></tr>`).join('')}</tbody></table></div><p class="chart-note">These are the complete inputs, not a selection of examples. Associations describe this fictional sample and do not establish causation.</p></section>`;
}
async function render({navigation=false,focus=null}={}) {
  const token=++version, snapshot=normalizeState({...state}), filters=scope(snapshot);
  const openMenus=navigation?[]:[...root.querySelectorAll('.scope-toolbar details[open]')].map(node=>node.className);
  try {
    const [summary,comparison,insights,events]=await Promise.all([summarize(filters),comparePeriods(filters),buildInsights(filters),selectEvents(filters)]);
    if(token!==version)return;
    const ctx={state:snapshot,filters,summary,comparison,insights,sources,events};
    const renderers={overview:renderOverview,connect:renderConnect,recovery:renderRecovery,insights:renderInsights,timeline:renderTimeline,reports:renderReports,about:renderAbout};
    const content=snapshot.screen==='intelligence'?renderIntelligence():await renderers[snapshot.screen](ctx);
    if(token!==version)return;
    renderedContext=ctx;
    root.innerHTML=`<div class="app-shell">${header()}<div class="demo-banner"><span><i></i>Demo workspace — all records are synthetic.</span><button data-screen="about">How it works${icon('arrow',12)}</button></div><main class="workspace" id="main-content"><header class="page-header"><div><p class="page-kicker">${snapshot.screen==='overview'?`A fictional month with ${esc(demoProfile.name.split(' ')[0])}`:'AETHRIVA '+labels[snapshot.screen]}<span>October 2026</span></p><h1 tabindex="-1" id="page-title">${titles[snapshot.screen]}</h1><p class="page-description">${descriptions[snapshot.screen]}</p></div>${snapshot.screen==='overview'?`<button class="button primary" data-screen="intelligence">Explore your patterns${icon('arrow',15)}</button>`:''}</header>${toolbar()}<div class="page-content">${content}</div>${evidenceHtml()}<footer class="app-footer"><span>Connected information. Clearer understanding.</span><div><button data-motion>Motion ${motion==='on'?'on':'off'}</button><button data-screen="about">Privacy & limitations</button><a href="https://github.com/coderarush/AETHRIVA" target="_blank" rel="noopener noreferrer">GitHub${icon('arrow',12)}</a></div></footer></main></div>`;
    document.title=`${labels[snapshot.screen]} · AETHRIVA`;
    document.documentElement.dataset.screen=snapshot.screen;
    for(const menu of root.querySelectorAll('.scope-toolbar details'))if(openMenus.includes(menu.className))menu.open=true;
    if(navigation){document.getElementById('page-title').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}else restoreFocus(focus);
  } catch(error) {
    if(token!==version)return;
    console.error(error);
    root.innerHTML=`<div class="app-shell">${header()}<main class="workspace"><section class="panel empty-state"><h1>Let’s bring the workspace back.</h1><p>The selected view could not be prepared. Your demo records are unchanged.</p><button class="button primary" data-reset>Reset demo</button><details><summary>Technical detail</summary><p>${esc(error.message)}</p></details></section></main></div>`;
  }
}
async function update(next,{navigation=false,replace=false}={}) {
  const focus=focusDescriptor();
  state=normalizeState({...state,...next});evidence=null;writeUrl(replace);
  await render({navigation,focus});
}
async function ask(question) {
  const value=question.trim();if(!value||sending)return;
  draft=value;state=normalizeState({...state,screen:'intelligence'});evidence=null;writeUrl();sending=true;
  const filters=scope(state),token=++requestVersion;
  await render();
  try {
    const response=await answerQuestion(value,filters);
    if(token!==requestVersion)return;
    const calculationIds=[...new Set(response.findings.map(f=>f.calculationId).filter(Boolean))];
    const resolved=calculationIds.length?await resolveEvidence(calculationIds):{calculations:[]};
    if(token!==requestVersion)return;
    conversation.push({question:value,response,filters:scopeFromEvidence(filters,resolved)});draft='';
  } catch(error) {if(token===requestVersion)toast(`Could not prepare that answer: ${error.message}`);}
  finally {if(token===requestVersion){sending=false;await render();document.getElementById('question-input')?.focus({preventScroll:true});document.querySelector('.conversation-turn:last-child')?.scrollIntoView({behavior:motion==='off'?'instant':'smooth',block:'start'});}}
}
async function openEvidence(button) {
  try {
    const ids=JSON.parse(button.dataset.evidence),turn=button.closest('[data-answer-index]');
    const filters=turn?conversation[Number(turn.dataset.answerIndex)].filters:renderedContext.filters;
    const result=await resolveEvidence(ids);
    evidence={...result,filters};evidenceTrigger=ids;
    await render();const section=document.getElementById('evidence');section?.focus({preventScroll:true});section?.scrollIntoView({behavior:motion==='off'?'instant':'smooth',block:'start'});
  } catch(error) {toast(`Evidence is unavailable: ${error.message}`);}
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.screen)await update({screen:button.dataset.screen},{navigation:true});
  else if(button.dataset.viewDay)await update({screen:'timeline',from:button.dataset.viewDay,to:button.dataset.viewDay,selectedDate:button.dataset.viewDay},{navigation:true});
  else if(button.dataset.day)await update({selectedDate:button.dataset.day});
  else if(button.dataset.metric)await update({metricKey:button.dataset.metric});
  else if(button.dataset.range)await update(rangeState(state,Number(button.dataset.range)));
  else if(button.dataset.viewSource)await update({sourceIds:[button.dataset.viewSource],screen:'timeline'},{navigation:true});
  else if(button.dataset.ask||button.dataset.question)await ask(button.dataset.ask||button.dataset.question);
  else if(button.hasAttribute('data-evidence'))await openEvidence(button);
  else if(button.hasAttribute('data-close-evidence')){evidence=null;await render();[...document.querySelectorAll('[data-evidence]')].find(node=>node.dataset.evidence===JSON.stringify(evidenceTrigger))?.focus({preventScroll:true});}
  else if(button.hasAttribute('data-reset')){requestVersion++;sending=false;conversation=[];draft='';evidence=null;await update(createInitialState(),{navigation:true});toast('Demo restored. Back to a fresh October.');}
  else if(button.hasAttribute('data-clear-filters'))await update({...createInitialState(),screen:state.screen});
  else if(button.hasAttribute('data-new-chat')){requestVersion++;conversation=[];draft='';sending=false;evidence=null;await render();document.getElementById('question-input')?.focus();}
  else if(button.hasAttribute('data-print'))window.print();
  else if(button.hasAttribute('data-motion')){motion=motion==='on'?'off':'on';document.documentElement.dataset.motion=motion;try{localStorage.setItem('aethriva-motion',motion);}catch{}await render();}
});
document.addEventListener('change',async event=>{
  if(event.target.matches('input[name="source"]'))await update(toggleSource(state,event.target.value,event.target.checked));
});
document.addEventListener('input',event=>{if(event.target.id==='question-input')draft=event.target.value;});
document.addEventListener('submit',async event=>{
  if(event.target.id==='question-form'){event.preventDefault();await ask(document.getElementById('question-input').value);}
  if(event.target.id==='custom-range'){event.preventDefault();const form=new FormData(event.target),from=form.get('from'),to=form.get('to');if(from>to){toast('Choose an end date on or after the start date.');return;}await update({from,to});}
});
document.addEventListener('keydown',event=>{
  if(event.target.id==='question-input'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();ask(event.target.value);}
  if(event.key==='Escape'&&evidence)document.querySelector('[data-close-evidence]')?.click();
});
window.addEventListener('popstate',()=>{state=stateFromSearch(location.search);evidence=null;render({navigation:true});});
writeUrl(true);
render();
