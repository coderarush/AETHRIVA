import {saveCheckin,saveDeviceReadings} from './data/journal-client.js';
import {metrics} from './data/metrics.js';
import {loadWorkspace,emptyWorkspace} from './data/workspace-data.js';
import {createHealthService} from './data/health-service.js';
import {createWorkspaceState} from './workspace-state.js';
import {createBluetoothController} from './connections/bluetooth.js';
import {deviceCatalog} from './connections/catalog.js';
import {escapeHtml as esc, icon, formatDate, formatMetric, metricLabel, evidenceButton} from './ui.js';
import {renderOverview, renderRecovery} from './pages/experience.js';
import {renderConnect, renderInsights, renderTimeline, renderReports, renderAbout} from './pages/workspace.js';

const root = document.getElementById('app');
const isLocalWorkspace=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
let workspace=isLocalWorkspace?await loadWorkspace():emptyWorkspace();
let sources,loadedSources,profile,service,stateModel;
let selectEvents,summarize,comparePeriods,buildInsights,answerQuestion,resolveEvidence;
let createInitialState,normalizeState,stateFromSearch,searchFromState,rangeState,toggleSource,scopeFromEvidence;
function configureWorkspace(next) {
  workspace=next;sources=next.sources;profile=next.profile;service=createHealthService(next);stateModel=createWorkspaceState(next);
  loadedSources=sources.filter(source=>stateModel.sourceIds.includes(source.id));
  ({selectEvents,summarize,comparePeriods,buildInsights,answerQuestion,resolveEvidence}=service);
  ({createInitialState,normalizeState,stateFromSearch,searchFromState,rangeState,toggleSource,scopeFromEvidence}=stateModel);
}
configureWorkspace(workspace);
const journalUI={savingCheckin:false,savingDevice:false,checkinDraft:null,message:''};
const connectionUI={query:'',category:'all',selectedDevice:null,refreshing:false,bluetooth:null};
let bluetoothReady=false,bluetoothRender=null;
const bluetooth=createBluetoothController({onChange:snapshot=>{
  connectionUI.bluetooth=snapshot;
  if(bluetoothReady&&state.screen==='connect'){
    clearTimeout(bluetoothRender);
    bluetoothRender=setTimeout(()=>render({focus:focusDescriptor()}),150);
  }
}});
connectionUI.bluetooth=bluetooth.getSnapshot();

const labels = {overview:'Overview',connect:'Connections',recovery:'Recovery',insights:'Insights',timeline:'Timeline',intelligence:'Intelligence',reports:'Reports',about:'About'};
const titles = {...labels};
const descriptions = {overview:'Start with a day. See what surrounds it. Follow every reading to its source.',connect:'Your apps, your devices, and the records that bring them together.',recovery:'Four separate measurements. One shared date. Explore the changes together.',insights:'What changed, what moved together, and what the records can’t tell us.',timeline:'The original observations behind every chart and explanation.',intelligence:'Ask about sleep, steps, resting heart rate, or self-reported energy.',reports:'A neutral summary of the selected records, ready to review or print.',about:'A wellness workspace built around recorded information and transparent calculations.'};
const questions = ['Summarize sleep and activity patterns.','Compare the earlier and later halves.','What was different on days with lower self-reported energy?','Show the records behind the sleep trend.','Prepare a neutral summary I can discuss with a healthcare professional.'];
const openingSearch=new URLSearchParams(location.search);
if(!openingSearch.has('screen')&&!workspace.events.length&&!workspace.workouts.length&&!workspace.deviceReadings?.length)openingSearch.set('screen','connect');
let state = stateFromSearch(openingSearch.toString()), renderedContext = null, version = 0;
let conversation = [], draft = '', sending = false, requestVersion = 0, evidence = null, evidenceTrigger = null;
let motion = 'on';
try {motion = localStorage.getItem('aethriva-motion') || 'on';} catch {}
document.documentElement.dataset.motion = motion;
const scope = value => ({from:value.from,to:value.to,sourceIds:[...value.sourceIds],...(value.metricKey !== 'all' ? {metricKey:value.metricKey} : {})});
const periodLabel = filters => `${formatDate(filters.from,{short:true})}${filters.from.slice(0,4)!==filters.to.slice(0,4)?`, ${filters.from.slice(0,4)}`:''}–${formatDate(filters.to,{short:true})}, ${filters.to.slice(0,4)}`;
const sourceNames = filters => filters.sourceIds.length ? filters.sourceIds.map(id=>sources.find(source=>source.id===id)?.name || id).join(', ') : 'No sources selected';
const metricScope = filters => filters.metricKey && filters.metricKey!=='all' ? metricLabel(filters.metricKey) : 'All four metrics';
const scrollBehavior = () => motion==='off'||window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
const announce = text => {document.getElementById('workspace-status').textContent=text;};
function toast(text) {const node = document.getElementById('toast');node.textContent=text;node.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>{node.hidden=true;},4500);}
function writeUrl(replace = false) {history[replace ? 'replaceState' : 'pushState']({aethriva:true},'',`${location.pathname}${searchFromState(state)}`);}
function focusDescriptor(active=document.activeElement) {
  if (!active || active===document.body) return null;
  return {id:active.id,day:active.dataset.day,screen:active.dataset.screen,range:active.dataset.range,metric:active.dataset.metric,plotMetric:active.dataset.plotMetric,source:active.name==='source'?active.value:null,label:active.getAttribute('aria-label'),figure:active.closest('figure')?.getAttribute('aria-labelledby'),article:active.closest('article')?.querySelector('h3')?.textContent,sourceMenu:active.closest('.source-options')!=null,evidence:active.dataset.evidence,evidenceIndex:active.hasAttribute('data-evidence')?[...document.querySelectorAll('[data-evidence]')].indexOf(active):null};
}
function restoreFocus(descriptor) {
  if(!descriptor)return;
  let target=descriptor.id?document.getElementById(descriptor.id):null;
  for(const key of ['day','screen','range','metric','plotMetric'])if(!target&&descriptor[key])target=[...document.querySelectorAll(`[data-${key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase())}]`)].find(node=>node.dataset[key]===descriptor[key]&&(!descriptor.figure||node.closest('figure')?.getAttribute('aria-labelledby')===descriptor.figure)&&(!descriptor.label||node.getAttribute('aria-label')===descriptor.label));
  if(!target&&descriptor.source)target=[...document.querySelectorAll('input[name="source"]')].find(node=>node.value===descriptor.source&&(node.closest('.source-options')!=null)===descriptor.sourceMenu&&(!descriptor.article||node.closest('article')?.querySelector('h3')?.textContent===descriptor.article));
  if(!target&&descriptor.evidence){const candidates=[...document.querySelectorAll('[data-evidence]')];target=candidates[descriptor.evidenceIndex]?.dataset.evidence===descriptor.evidence?candidates[descriptor.evidenceIndex]:candidates.find(node=>node.dataset.evidence===descriptor.evidence);}
  if(target?.disabled&&['previous-day','next-day'].includes(target.id))target=document.getElementById('selected-day-input');
  target?.focus({preventScroll:true});
  return target;
}
function closeScopeMenus() {root.querySelectorAll('.scope-toolbar details[open]').forEach(menu=>{menu.open=false;});}
function scrollKey(node,index) {return node.dataset.chartScroll||node.getAttribute('aria-label')||node.className+'-'+index;}
function restoreHorizontalScroll(offsets) {
  const selectors='.primary-nav,.day-strip,[data-chart-scroll],.table-wrap';
  root.querySelectorAll(selectors).forEach((node,index)=>{node.scrollLeft=offsets.get(scrollKey(node,index))||0;});
  root.querySelectorAll('.primary-nav,.day-strip,[data-chart-scroll]').forEach(container=>{
    const selected=container.querySelector('[aria-current="page"],[aria-pressed="true"]');
    if(!selected||container.scrollWidth<=container.clientWidth)return;
    const box=container.getBoundingClientRect(),point=selected.getBoundingClientRect();
    if(point.left<box.left+12||point.right>box.right-12)container.scrollLeft+=point.left-box.left-(container.clientWidth-point.width)/2;
  });
}
function header() {
  return `<header class="app-header"><button class="brand" data-screen="overview" aria-label="AETHRIVA overview">${icon('activity',25)}<span>aethriva<span class="brand-dot">.</span></span></button>
    <nav class="primary-nav" aria-label="Primary navigation">${Object.entries(labels).filter(([key])=>key!=='about').map(([key,label])=>`<button class="nav-button ${state.screen===key?'selected':''}" data-screen="${key}" ${state.screen===key?'aria-current="page"':''}>${icon(key,17)}<span>${label}</span></button>`).join('')}</nav>
    <div class="header-actions"><button class="profile-button" data-screen="about" aria-label="About your workspace"><span class="avatar">${esc(profile.initials)}</span><span class="profile-copy"><strong>${esc(profile.name)}</strong><small>${workspace.mode==='local'?'On this computer':'Your workspace'}</small></span></button></div></header>`;
}
function toolbar() {
  const count=state.sourceIds.length,days=Math.round((Date.parse(state.to)-Date.parse(state.from))/86400000)+1;
  return `<div class="scope-toolbar"><div class="range-tabs" role="group" aria-label="Date range">${[7,14,30].map(n=>`<button class="${days===n&&state.to===workspace.range.to?'selected':''}" data-range="${n}" aria-pressed="${days===n&&state.to===workspace.range.to}">${n} days</button>`).join('')}</div>
    <details class="source-filter"><summary id="source-toggle">${icon('source',15)}${count===loadedSources.length?'All sources':`${count} source${count===1?'':'s'}`}</summary><div class="source-options">${loadedSources.map(source=>`<label><input type="checkbox" name="source" value="${esc(source.id)}" ${state.sourceIds.includes(source.id)?'checked':''}>${esc(source.name)}</label>`).join('')}</div></details>
    <details class="date-filter"><summary id="date-toggle">${icon('calendar',15)}${periodLabel(state)}</summary><form id="custom-range" class="date-range-form"><label>From<input type="date" name="from" min="${workspace.range.from}" max="${workspace.range.to}" value="${state.from}" required></label><label>To<input type="date" name="to" min="${workspace.range.from}" max="${workspace.range.to}" value="${state.to}" required></label><button class="button primary" type="submit">Apply range</button></form></details>
    ${state.metricKey!=='all'?`<button class="pill active-filter" data-metric="all" aria-label="Show all metrics; currently ${esc(metricLabel(state.metricKey))} only">${esc(metricLabel(state.metricKey))} only${icon('close',12)}</button>`:''}
    <span class="scope-spacer"></span><button class="button subtle" data-reset aria-label="Reset view" title="Restore the latest available range and all sources">${icon('reset',14)}Reset view</button></div>`;
}
const prose = value => String(value||'').split(/\n\n+/).filter(Boolean).map(p=>`<p>${esc(p).replaceAll('\n','<br>')}</p>`).join('');
function answerHtml(entry,index) {
  const response=entry.response;
  const ids=[...new Set(response.findings.flatMap(f=>[...(f.evidenceRecordIds||[]),...(f.calculationId?[f.calculationId]:[])]))];
  return `<article class="conversation-turn" data-answer-index="${index}"><div class="message user"><span class="message-author">You</span><p>${esc(entry.question)}</p></div><div class="message assistant"><div class="answer-heading"><span class="analyst-mark">${icon('intelligence',18)}</span><span>Aethriva analyst</span><span class="pill">${response.responseType==='supported'?'Evidence-backed':response.responseType==='out_of_scope'?'Outside scope':'Insufficient evidence'}</span></div><div class="answer-prose">${prose(response.answer)}</div>
    ${response.findings.length?`<div class="answer-findings">${response.findings.map(f=>`<div class="answer-finding"><strong>${esc(f.label)}</strong>${f.value?`<span class="finding-value">${esc(f.value)}</span>`:''}<p>${esc(f.explanation)}</p>${evidenceButton([...(f.evidenceRecordIds||[]),...(f.calculationId?[f.calculationId]:[])],'Trace this finding')}</div>`).join('')}</div>`:''}
    ${response.limitations.filter(note=>/small.sample|fewer than 14/i.test(note)).map(note=>`<p class="answer-warning">${esc(note)}</p>`).join('')}
    <div class="answer-footer"><div class="answer-scope"><strong>Based on ${esc(periodLabel(entry.filters))}</strong><span>${esc(sourceNames(entry.filters))}</span><span>${esc(metricScope(entry.filters))} · Scope saved with this answer</span></div>${ids.length?evidenceButton(ids,'Explore supporting evidence'):''}</div>
    ${response.limitations.length?`<details class="answer-limitations"><summary>Scope and limitations</summary><ul>${response.limitations.map(note=>`<li>${esc(note)}</li>`).join('')}</ul></details>`:''}</div></article>`;
}
function renderIntelligence() {
  const questionLabels=['Summarize sleep and activity','Compare earlier and later periods','Explore lower-energy days','See the records behind sleep','Prepare an appointment summary'];
  const questionIcons=['overview','insights','energy','sleep','reports'];
  return `<div class="intelligence-workspace"><div class="analyst-status"><span class="status-dot"></span>Calculated locally · Your selected records<span class="muted">Your question stays in this browser.</span></div>
  ${conversation.length?`<div class="chat-messages" role="log" aria-label="Conversation">${conversation.map(answerHtml).join('')}</div>`:''}
  ${sending?`<div class="analyst-pending" role="status">${icon('intelligence',17)}Reading the selected records…</div>`:''}
  <form class="composer" id="question-form"><label class="composer-label" for="question-input">${conversation.length?'Ask another question':'What would you like to understand?'}</label><textarea id="question-input" rows="2" maxlength="2000" required placeholder="What was different on days with lower energy?" aria-describedby="question-hint" ${sending?'disabled':''}>${esc(draft)}</textarea><div class="composer-bottom"><span>${icon('source',14)}${esc(periodLabel(state))}<br>${esc(sourceNames(state))}<br>${esc(metricScope(state))}</span><button class="button primary" id="ask-button" type="submit" ${sending||!draft.trim()?'disabled':''}>${sending?'Calculating…':'Ask Aethriva'}${icon('arrow',16)}</button></div><p class="composer-hint" id="question-hint">Enter to ask · Shift + Enter for a new line</p></form>
  ${!conversation.length?`<section class="analyst-welcome"><div class="question-heading"><h2>Five ways to explore</h2><p>Choose a question to get started.</p></div><div class="question-grid">${questions.map((q,i)=>`<button class="question-card" data-question="${esc(q)}" ${sending?'disabled':''}><span>${icon(questionIcons[i],22)}</span><strong>${esc(questionLabels[i])}</strong>${icon('arrow',18)}</button>`).join('')}</div></section>`:`<div class="suggestions"><button data-question="${esc(questions[4])}">${icon('reports',16)}Prepare an appointment summary</button><button data-new-chat id="new-conversation">New conversation</button></div>`}
  <p class="analyst-note">Answers describe recorded patterns and include their supporting records. AETHRIVA does not provide diagnoses, treatment, or a readiness score.</p></div>`;
}
function evidenceHtml() {
  if(!evidence)return '';
  const sourceMap=new Map(sources.map(s=>[s.id,s]));
  return `<section class="evidence-section panel" id="evidence" tabindex="-1" aria-labelledby="evidence-title"><div class="evidence-heading"><div><h2 id="evidence-title">The records behind the finding.</h2><p class="muted">${esc(periodLabel(evidence.filters))} · ${evidence.records.length} supporting records</p><p class="evidence-scope">${esc(sourceNames(evidence.filters))}<br>${esc(metricScope(evidence.filters))}</p></div><button class="button subtle" data-close-evidence aria-label="Close evidence">${icon('close',18)}</button></div>
    ${evidence.calculations.length?`<div class="calculation-list">${evidence.calculations.map(calc=>`<details class="calculation-details"><summary>${esc(calc.method)}<span>${esc(calc.id)}</span></summary><p>${esc(calc.periodStart)} to ${esc(calc.periodEnd)} · ${calc.sourceRecordIds.length} input records</p><dl>${Object.entries(calc.values).map(([label,value])=>`<div><dt>${esc(label.replace(/([A-Z])/g,' $1'))}</dt><dd>${value==null?'Not available':esc(typeof value==='number'?value.toLocaleString('en-US',{maximumFractionDigits:4}):value)}</dd></div>`).join('')}</dl>${calc.limitations.length?`<ul>${calc.limitations.map(note=>`<li>${esc(note)}</li>`).join('')}</ul>`:''}</details>`).join('')}</div>`:''}
    <div class="table-wrap evidence-records" role="region" aria-label="Supporting evidence records" tabindex="0"><table class="evidence-table"><caption class="sr-only">All underlying records for this evidence selection</caption><thead><tr><th scope="col">Observation</th><th scope="col">Value</th><th scope="col">Recorded</th><th scope="col">Source</th><th scope="col">Record details</th></tr></thead><tbody>${evidence.records.map(record=>`<tr><th scope="row">${esc(record.metricLabel)}</th><td>${esc(formatMetric(record.value,record.metricKey))}</td><td>${record.metadata?.timestampPrecision==='day'?esc(formatDate(record.metadata.civilDate,{short:true}))+' · Daily aggregate':esc(formatDate(record.observedAt,{short:true,time:true}))}</td><td>${esc(sourceMap.get(record.sourceId)?.name||record.provenance.sourceName)}</td><td><details><summary>${esc(record.id)}</summary><p>Source record: ${esc(record.sourceRecordId)}</p><p>Original: ${esc(record.originalValue)} ${esc(record.originalUnit)}</p><p>Imported: ${esc(formatDate(record.importedAt,{short:true,time:true}))}</p>${record.metadata?.aggregation?`<p>Aggregation: ${esc(record.metadata.aggregation)}</p>`:''}${record.provenance.inputRecordCount?`<p>Source observations: ${esc(record.provenance.inputRecordCount)}</p>`:''}<p>Batch: ${esc(record.provenance.importBatchId)}<br>Transformation: ${esc(record.provenance.transformationVersion)}</p></details></td></tr>`).join('')}</tbody></table></div><p class="chart-note">These are the complete calculation inputs. Associations describe the selected records and do not establish causation.</p></section>`;
}
async function render({navigation=false,focus=null}={}) {
  const token=++version, snapshot=normalizeState({...state}), filters=scope(snapshot);
  const openMenus=navigation?[]:[...root.querySelectorAll('.scope-toolbar details[open]')].map(node=>node.className);
  const offsets=new Map([...root.querySelectorAll('.primary-nav,.day-strip,[data-chart-scroll],.table-wrap')].map((node,index)=>[scrollKey(node,index),node.scrollLeft]));
  try {
    const [summary,comparison,insights,events]=await Promise.all([summarize(filters),comparePeriods(filters),buildInsights(filters),selectEvents(filters)]);
    if(token!==version)return;
    const ctx={state:snapshot,filters,summary,comparison,insights,sources,events,workspace,connectionUI,journalUI};
    const renderers={overview:renderOverview,connect:renderConnect,recovery:renderRecovery,insights:renderInsights,timeline:renderTimeline,reports:renderReports,about:renderAbout};
    const content=snapshot.screen==='intelligence'?renderIntelligence():await renderers[snapshot.screen](ctx);
    if(token!==version)return;
    renderedContext=ctx;
    root.innerHTML=`<div class="app-shell">${header()}<div class="workspace-banner"><span><i></i>${workspace.mode==='local'?'Your health history · On this computer':'Your workspace · Connect a source to begin'}</span><button data-screen="about">About your workspace${icon('arrow',14)}</button></div><main class="workspace" id="main-content" tabindex="-1"><header class="page-header"><div><h1 tabindex="-1" id="page-title">${titles[snapshot.screen]}</h1><p class="page-description">${descriptions[snapshot.screen]}</p></div>${snapshot.screen==='connect'?`<div class="connections-shortcuts"><button class="button" data-connection-jump="connected-history-title">Your sources ${icon('source',16)}</button><button class="button" data-connection-jump="bluetooth-title">Pair nearby ${icon('connect',16)}</button></div>`:''}</header>${snapshot.screen==='connect'?'':toolbar()}${workspace.cache?.available===false?'<section class="workspace-load-notice provider-unavailable" role="status"><div><strong>Provider history is unavailable.</strong><p>Google Health and Lyfta are not included in this view. Your saved local records remain available.</p></div><a class="button" href="http://localhost:3000" target="_blank" rel="noopener noreferrer">Open Health app</a></section>':''}${workspace.error?`<section class="workspace-load-notice" role="alert"><div><strong>Your history could not be loaded.</strong><p>${esc(workspace.error)}. Your saved records are unchanged.</p></div><button class="button" data-refresh-workspace>Try again</button></section>`:''}<div class="page-content ${navigation?'page-arriving':''}">${content}</div>${evidenceHtml()}<footer class="app-footer"><span>AETHRIVA · Connected information. Clearer understanding.</span><div><button data-motion id="motion-toggle" aria-pressed="${motion==='off'}">${motion==='on'?'Reduce motion':'Motion reduced'}</button><button data-screen="about">Privacy & limitations</button><a href="https://github.com/coderarush/Bodha" target="_blank" rel="noopener noreferrer">GitHub${icon('arrow',12)}</a></div></footer></main></div>`;
    document.title=`${labels[snapshot.screen]} · AETHRIVA`;
    document.documentElement.dataset.screen=snapshot.screen;
    for(const menu of root.querySelectorAll('.scope-toolbar details'))if(openMenus.includes(menu.className))menu.open=true;
    restoreHorizontalScroll(offsets);
    if(navigation){document.getElementById('page-title').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}else restoreFocus(focus);
  } catch(error) {
    if(token!==version)return;
    console.error(error);
    root.innerHTML=`<div class="app-shell">${header()}<main class="workspace"><section class="panel empty-state"><h1>Let’s bring the workspace back.</h1><p>The selected view could not be prepared. Your saved records are unchanged.</p><button class="button primary" data-reset>Reset view</button><details><summary>Technical detail</summary><p>${esc(error.message)}</p></details></section></main></div>`;
  }
}
async function update(next,{navigation=false,replace=false,focus=focusDescriptor()}={}) {
  state=normalizeState({...state,...next});journalUI.devicePage=0;evidence=null;writeUrl(replace);
  await render({navigation,focus});
  if(!navigation){if(next.selectedDate)announce(`${formatDate(state.selectedDate)} selected. Readings updated.`);else if(next.plotMetric)announce(`Showing the ${metricLabel(state.plotMetric).toLowerCase()} trend. All other measurements keep their filters.`);else announce(`${renderedContext?.summary.coverage.records??0} records in the selected scope.`);}
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
  finally {if(token===requestVersion){sending=false;await render();document.getElementById('question-input')?.focus({preventScroll:true});document.querySelector('.conversation-turn:last-child')?.scrollIntoView({behavior:scrollBehavior(),block:'start'});}}
}
async function openEvidence(button) {
  try {
    const ids=JSON.parse(button.dataset.evidence),turn=button.closest('[data-answer-index]');
    const filters=turn?conversation[Number(turn.dataset.answerIndex)].filters:renderedContext.filters;
    const result=await resolveEvidence(ids);
    evidence={...result,filters};evidenceTrigger=focusDescriptor(button);closeScopeMenus();
    await render();const section=document.getElementById('evidence');section?.focus({preventScroll:true});section?.scrollIntoView({behavior:scrollBehavior(),block:'start'});
  } catch(error) {toast(`Evidence is unavailable: ${error.message}`);}
}
let searchTimer=null;
async function refreshWorkspace(){
  if(connectionUI.refreshing)return;
  connectionUI.refreshing=true;await render({focus:{id:'page-title'}});
  const next=isLocalWorkspace?await loadWorkspace():emptyWorkspace();
  connectionUI.refreshing=false;
  if(next.error){workspace={...workspace,error:next.error};await render();toast('History could not be refreshed. Existing records are still available.');return;}
  requestVersion++;sending=false;conversation=[];draft='';evidence=null;
  const currentScreen=state.screen;configureWorkspace(next);state={...createInitialState(),screen:currentScreen};writeUrl(true);
  await render({focus:{id:'page-title'}});toast(next.available?'History refreshed. Previous answers cleared so every finding uses the current records.':'Open your local workspace to load saved health history.');
}
function applyJournalWorkspace(next,{sourceId,date}={}) {
  const previous={...state},previousSources=state.sourceIds;
  configureWorkspace(next);requestVersion++;sending=false;conversation=[];draft='';evidence=null;
  const nextSources=sourceId?[...new Set([...previousSources,sourceId])]:previousSources;
  state=normalizeState({...previous,sourceIds:nextSources,metricKey:'all',...(date?{selectedDate:date,from:[previous.from,date].sort()[0],to:[previous.to,date].sort().at(-1)}:{})});writeUrl(true);
}
async function storeCheckin(form){
  if(journalUI.savingCheckin)return;
  const input=new FormData(form),date=String(input.get('date')),energy=Number(input.get('energy'));
  journalUI.checkinDraft={date,energy};journalUI.savingCheckin=true;journalUI.message='Saving check-in…';await render();
  try{const result=await saveCheckin({date,energy});applyJournalWorkspace(result.workspace,{sourceId:'checkins',date});journalUI.checkinDraft=null;journalUI.message='Check-in saved. Your energy trend and findings have been updated.';toast('Check-in saved. Previous answers cleared to keep the evidence current.');}
  catch(error){journalUI.message=error.message;toast(error.message);}
  finally{journalUI.savingCheckin=false;await render({focus:{id:'checkin-energy'}});}
}
async function storeDeviceReadings(){
  if(journalUI.savingDevice)return;
  const snapshot=bluetooth.getSnapshot();if(!snapshot.samples.length)return;
  journalUI.savingDevice=true;await render();
  try{const result=await saveDeviceReadings({device:{name:snapshot.device?.name||'Bluetooth health monitor'},samples:snapshot.samples});applyJournalWorkspace(result.workspace,{sourceId:'bluetooth'});toast(`${result.inserted} readings saved to your local history${result.duplicates?`; ${result.duplicates} already saved`:''}.`);}
  catch(error){toast(error.message);}
  finally{journalUI.savingDevice=false;await render({focus:{id:'save-device-readings'}});}
}
function downloadReadings(){
  const snapshot=bluetooth.getSnapshot(),samples=snapshot.samples||[];if(!samples.length)return;
  const cell=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  const rows=[['received_at','kind','heart_rate_bpm','systolic','diastolic','mean_pressure','unit','oxygen_saturation_percent','pulse_rate_bpm','device_time_no_timezone','measurement_status','device_sensor_status','contact_detected','rr_intervals_seconds','quality_warnings'],...samples.map(sample=>[sample.timestamp,sample.kind,sample.bpm,sample.systolic,sample.diastolic,sample.meanPressure,sample.unit,sample.spo2,sample.pulseRate,sample.deviceTimestamp,sample.measurementStatus,sample.deviceSensorStatus,sample.contactDetected,sample.rrIntervalsSeconds?.join(';'),sample.qualityWarnings?.join('; ')])];
  const blob=new Blob([rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='aethriva-device-readings.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Readings downloaded to your computer.');
}
// Keep the current result stable between pointer-down and click while a search is pending.
document.addEventListener('pointerdown',event=>{if(event.target.closest('[data-device-id],[data-device-category],[data-device-clear]'))clearTimeout(searchTimer);},{capture:true});
document.addEventListener('click',async event=>{
  const summary=event.target.closest('.scope-toolbar summary');
  if(summary){root.querySelectorAll('.scope-toolbar details[open]').forEach(menu=>{if(menu!==summary.parentElement)menu.open=false;});return;}
  if(!event.target.closest('.scope-toolbar details'))closeScopeMenus();
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.connectionJump){const target=document.getElementById(button.dataset.connectionJump);if(target){target.tabIndex=-1;target.focus();target.scrollIntoView({behavior:scrollBehavior(),block:'start'});}return;}
  if(button.hasAttribute('data-reading-page')){journalUI.devicePage=Math.max(0,Number(button.dataset.readingPage)||0);await render();document.getElementById('saved-device-title')?.scrollIntoView({behavior:scrollBehavior(),block:'start'});return;}
  if(button.hasAttribute('data-refresh-workspace')){await refreshWorkspace();return;}
  if(button.dataset.bluetoothProfile){await bluetooth.connect({profile:button.dataset.bluetoothProfile});return;}
  if(button.hasAttribute('data-bluetooth-connect')){const entry=deviceCatalog.find(item=>item.id===button.dataset.bluetoothConnect);await bluetooth.connect(entry);return;}
  if(button.hasAttribute('data-bluetooth-disconnect')){bluetooth.disconnect();return;}
  if(button.hasAttribute('data-save-device-readings')){await storeDeviceReadings();return;}
  if(button.hasAttribute('data-view-device-readings')){await update({...createInitialState(),screen:'timeline',sourceIds:['bluetooth'],metricKey:'all'},{navigation:true});return;}
  if(button.hasAttribute('data-bluetooth-download')){downloadReadings();return;}
  if(button.dataset.deviceId){connectionUI.selectedDevice=button.dataset.deviceId;await render();const detail=document.getElementById('device-detail');detail?.focus();detail?.scrollIntoView({behavior:scrollBehavior(),block:'center'});return;}
  if(button.hasAttribute('data-device-close')){const id=connectionUI.selectedDevice;connectionUI.selectedDevice=null;await render();root.querySelector(`[data-device-id="${CSS.escape(id)}"]`)?.focus();return;}
  if(button.dataset.deviceCategory){connectionUI.category=button.dataset.deviceCategory;connectionUI.selectedDevice=null;await render();root.querySelector(`[data-device-category="${CSS.escape(connectionUI.category)}"]`)?.focus();return;}
  if(button.hasAttribute('data-device-clear')){connectionUI.query='';connectionUI.category='all';connectionUI.selectedDevice=null;await render();document.getElementById('device-search')?.focus();return;}
  if(button.dataset.screen)await update({screen:button.dataset.screen},{navigation:true});
  else if(button.dataset.viewDay)await update({screen:'timeline',from:button.dataset.viewDay,to:button.dataset.viewDay,selectedDate:button.dataset.viewDay},{navigation:true});
  else if(button.dataset.day)await update({selectedDate:button.dataset.day});
  else if(button.dataset.metric)await update({metricKey:button.dataset.metric});
  else if(button.dataset.plotMetric){await update({plotMetric:button.dataset.plotMetric});if(button.dataset.plotScroll){const heading=document.getElementById('month-title');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});heading.scrollIntoView({behavior:scrollBehavior(),block:'start'});}}}
  else if(button.dataset.range)await update(rangeState(state,Number(button.dataset.range)));
  else if(button.dataset.viewSource)await update({sourceIds:[button.dataset.viewSource],metricKey:'all',screen:'timeline'},{navigation:true});
  else if(button.dataset.ask||button.dataset.question)await ask(button.dataset.ask||button.dataset.question);
  else if(button.hasAttribute('data-evidence'))await openEvidence(button);
  else if(button.hasAttribute('data-close-evidence')){evidence=null;await render();restoreFocus(evidenceTrigger)?.scrollIntoView({behavior:scrollBehavior(),block:'center'});}
  else if(button.hasAttribute('data-reset')){requestVersion++;sending=false;conversation=[];draft='';evidence=null;await update(createInitialState(),{navigation:true});toast('View reset to the latest available records.');}
  else if(button.hasAttribute('data-clear-filters'))await update({...createInitialState(),screen:state.screen});
  else if(button.hasAttribute('data-restore-measurements'))await update({sourceIds:loadedSources.map(source=>source.id),metricKey:'all'},{focus:{id:'page-title'}});
  else if(button.hasAttribute('data-new-chat')){requestVersion++;conversation=[];draft='';sending=false;evidence=null;await render();document.getElementById('question-input')?.focus();}
  else if(button.hasAttribute('data-print'))window.print();
  else if(button.hasAttribute('data-motion')){motion=motion==='on'?'off':'on';document.documentElement.dataset.motion=motion;try{localStorage.setItem('aethriva-motion',motion);}catch{}await render({focus:{id:'motion-toggle'}});announce(motion==='off'?'Motion reduced.':'Standard motion enabled; system preferences are always respected.');}
});
document.addEventListener('change',async event=>{
  if(event.target.matches('input[name="source"]'))await update(toggleSource(state,event.target.value,event.target.checked));
  if(event.target.matches('[data-selected-day]')){if(event.target.validity.valid)await update({selectedDate:event.target.value});else{event.target.reportValidity();}}
});
document.addEventListener('input',event=>{if(['checkin-date','checkin-energy'].includes(event.target.id)){journalUI.checkinDraft={date:document.getElementById('checkin-date').value,energy:document.getElementById('checkin-energy').value};}if(event.target.id==='device-search'){connectionUI.query=event.target.value;connectionUI.selectedDevice=null;const position=event.target.selectionStart;clearTimeout(searchTimer);searchTimer=setTimeout(async()=>{await render({focus:{id:'device-search'}});const input=document.getElementById('device-search');try{input?.setSelectionRange(position,position);}catch{}},120);}if(event.target.id==='question-input'){draft=event.target.value;document.getElementById('ask-button').disabled=sending||!draft.trim();}});
document.addEventListener('submit',async event=>{
  if(event.target.id==='energy-checkin-form'){event.preventDefault();await storeCheckin(event.target);return;}
  if(event.target.id==='question-form'){event.preventDefault();await ask(document.getElementById('question-input').value);}
  if(event.target.id==='custom-range'){event.preventDefault();const form=new FormData(event.target),from=form.get('from'),to=form.get('to');if(from>to){toast('Choose an end date on or after the start date.');return;}closeScopeMenus();await update({from,to},{focus:{id:'date-toggle'}});}
});
document.addEventListener('keydown',event=>{
  if(event.target.id==='question-input'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();ask(event.target.value);}
  if(event.target.matches('.chart-hit')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();const points=[...event.target.closest('[data-chart-keyboard]').querySelectorAll('.chart-hit')],index=points.indexOf(event.target);
    const target=points[event.key==='Home'?0:event.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,index+(event.key==='ArrowLeft'?-1:1)))];
    target.focus({preventScroll:true});target.click();
  }
  if(event.key==='Escape'){const open=root.querySelector('.scope-toolbar details[open]');if(open){event.preventDefault();open.open=false;open.querySelector('summary').focus();}else if(evidence)document.querySelector('[data-close-evidence]')?.click();}
});
window.addEventListener('popstate',()=>{state=stateFromSearch(location.search);evidence=null;render({navigation:true});});
bluetoothReady=true;
writeUrl(true);
render();
