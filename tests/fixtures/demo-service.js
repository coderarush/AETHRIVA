import {events,metrics,DEMO_START,DEMO_END,AS_OF} from './demo-data.js';
import {normalizeFilters,selectRecords,summarizeRecords,compareRecords,associateRecords,lowEnergyRecords,BASE_LIMITATIONS} from './analytics.js';
/** @typedef {{id:string,type:'trend'|'period_change'|'descriptive_association'|'coverage_note',title:string,summary:string,periodStart:string,periodEnd:string,evidenceRecordIds:string[],calculationId?:string,limitations:string[],generatedAt:string,isSyntheticDemo:boolean}} Insight */
/** @typedef {{answer:string,findings:Array<{label:string,value?:string,explanation:string,evidenceRecordIds:string[],calculationId?:string}>,evidence:Array<{recordId:string,metricLabel:string,value:string,observedAt:string,sourceName:string}>,limitations:string[],responseType:'supported'|'insufficient_data'|'out_of_scope'}} IntelligenceResponse */
const calculations = new Map();
const recordMap = new Map(events.map(e=>[e.id,e]));
const copy=value=>structuredClone(value);
function register(calc) {
  if (!calc.id?.startsWith('calc_') || !Array.isArray(calc.sourceRecordIds) || calc.sourceRecordIds.some(id=>!recordMap.has(id)) || !calc.method || !calc.periodStart || !calc.periodEnd || !Object.values(calc.values).every(v=>v===null||typeof v==='string'||(typeof v==='number'&&Number.isFinite(v)))) throw new Error('Invalid calculation evidence');
  calculations.set(calc.id,copy(calc)); return calc;
}
export async function selectEvents(filters={}) { return copy(selectRecords(events,filters)); }
export async function summarize(filters={}) { const result=summarizeRecords(events,filters); result.calculations.forEach(register); return result; }
export async function comparePeriods(filters={}) { const result=compareRecords(events,filters);result.calculations.forEach(register);return result; }
const number=(value,digits=1)=>value===null?'not observed':value.toLocaleString('en-US',{maximumFractionDigits:digits});
const unit=key=>metrics[key].unit;
function insight(calc,type,title,summary) {
  return {id:`insight_${calc.id}`,type,title,summary,periodStart:calc.periodStart,periodEnd:calc.periodEnd,evidenceRecordIds:[...calc.sourceRecordIds],calculationId:calc.id,limitations:[...calc.limitations],generatedAt:AS_OF,isSyntheticDemo:true};
}
/** @returns {Promise<Insight[]>} */
export async function buildInsights(filters={}) {
  const f=normalizeFilters(filters),summary=await summarize(f),comparison=await comparePeriods(f),result=[];
  if(!summary.coverage.records)return result;
  for(const calc of comparison.calculations.filter(c=>c.values.delta!==null)) {
    const key=calc.metricKeys[0],v=calc.values;
    result.push(insight(calc,'period_change',`${metrics[key].label}: period comparison`,`${metrics[key].label} averaged ${number(v.currentMean)} ${unit(key)} in the later window and ${number(v.previousMean)} ${unit(key)} in the earlier window (${v.delta>=0?'+':''}${number(v.delta)} ${unit(key)}).`));
  }
  for(const key of ['sleep_duration','steps']) {
    const association=associateRecords(events,key,'energy',f);register(association.calculation);
    if(association.status==='supported') {
      const c=association.calculation;
      result.push(insight(c,'descriptive_association',`${metrics[key].label} and self-reported energy`,`${c.pairedSampleCount} same-date pairs had a Pearson correlation of ${number(c.values.correlation,2)}. This describes the synthetic sample and does not establish causation.`));
    }
  }
  const coverage=summary.calculations.find(c=>c.values.observedDays>0);
  if(coverage) result.push(insight(coverage,'coverage_note',`${metrics[coverage.metricKeys[0]].label} coverage`,`${coverage.values.observedDays} observed days and ${coverage.values.missingDays} missing days in the selected range. Missing observations are excluded from the average.`));
  return result;
}
export async function resolveEvidence(ids) {
  if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'))throw new Error('Evidence IDs must be an array of strings');
  const selectedCalculations=[],recordIds=new Set();
  for(const id of new Set(ids)) {
    if(recordMap.has(id))recordIds.add(id);
    else if(calculations.has(id)) {const calc=calculations.get(id);selectedCalculations.push(calc);calc.sourceRecordIds.forEach(r=>recordIds.add(r));}
    else throw new Error(`Unknown evidence ID: ${id}`);
  }
  return copy({records:[...recordIds].map(id=>recordMap.get(id)),calculations:selectedCalculations});
}
function queryScope(question,filters) {
  const f=normalizeFilters(filters);
  let text=question.toLowerCase().trim().replace(/[?.!]+$/,'');
  const iso=text.match(/\b(\d{4}-\d{2}-\d{2})(?:\s+(?:to|through|–)\s+(\d{4}-\d{2}-\d{2}))?\b/);
  const range=text.match(/\b(?:october|oct\.?)\s+(\d{1,2})(?!\d)(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\s*(?:to|through|–|-)\s*(?:(?:october|oct\.?)\s*)?(\d{1,2})(?!\d)(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/);
  const day=text.match(/\b(?:october|oct\.?)\s+(\d{1,2})(?!\d)(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/);
  const relative=text.match(/\b(?:last|past)\s+(\d+)\s+days\b/);
  const month=text.match(/\b(?:this month|(?:october|oct\.?)(?:\s+(\d{4}))?)(?!\w)/);
  const explicit=iso||range||day||relative||month;
  if(explicit) {
    if(iso) { f.from=iso[1];f.to=iso[2]||iso[1]; }
    else if(range||day) {
      const match=range||day;
      if((match[2]&&match[2]!=='2026')||(range?.[4]&&range[4]!=='2026'))throw new Error('Unavailable year');
      f.from=`2026-10-${match[1].padStart(2,'0')}`;
      f.to=range?`2026-10-${range[3].padStart(2,'0')}`:f.from;
    } else if(relative) {
      const n=Number(relative[1]);if(n<1||n>30)throw new Error('Unavailable relative date range');
      f.to=DEMO_END;f.from=new Date(Date.parse(`${DEMO_END}T12:00:00Z`)-(n-1)*86400000).toISOString().slice(0,10);
    } else {
      if(month[1]&&month[1]!=='2026')throw new Error('Unavailable year');
      f.from=DEMO_START;f.to=DEMO_END;
    }
    text=text.replace(explicit[0],'').trim();
    if(f.from<DEMO_START||f.to>DEMO_END)throw new Error('Dates outside the demo');
  }
  // Unconsumed date language must never silently fall back to the selected range.
  if(/\b(?:january|february|march|april|may|june|july|august|september|october|oct|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|nov|dec|today|tomorrow|yesterday|tonight|next|last|past|this|previous|week|weeks|month|months|year|years|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4})\b/.test(text))throw new Error('Unrecognized requested dates');
  text=text.replace(/\s+(?:on|in|during|over|for|from|of)(?: the)?\s*$/,'').trim();
  return {filters:normalizeFilters(f),text};
}
function finding(calc,label,value,explanation) {return {label,value,explanation,evidenceRecordIds:[...calc.sourceRecordIds],calculationId:calc.id};}
function response(answer,findings,responseType='supported',extraLimitations=[]) {
  const ids=[...new Set(findings.flatMap(f=>f.evidenceRecordIds))];
  for(const f of findings) {
    const c=calculations.get(f.calculationId);
    if(!c || f.evidenceRecordIds.some(id=>!c.sourceRecordIds.includes(id)) || c.sourceRecordIds.some(id=>!f.evidenceRecordIds.includes(id)))throw new Error('Response contains invalid evidence');
  }
  const evidence=ids.map(id=>{const e=recordMap.get(id);if(!e)throw new Error('Unknown response record');return {recordId:id,metricLabel:e.metricLabel,value:`${number(e.value)} ${e.unit}`,observedAt:e.observedAt,sourceName:e.provenance.sourceName};});
  return {answer,findings,evidence,limitations:[...new Set([...BASE_LIMITATIONS,...extraLimitations,...findings.flatMap(f=>calculations.get(f.calculationId).limitations)])],responseType};
}
const insufficient=(message='There is not enough selected data to answer this question.')=>response(message,[],'insufficient_data');
function classify(question) {
  if(/\b(diagnos\w*|medicat\w*|treatment\w*|supplement\w*|disease|emergency|chest pain|urgent medical|should i (?:take|stop|increase|decrease)|do i have|dangerous|medical advice|symptoms|heart attack|chest pain)\b/i.test(question))return 'clinical';
  // Full supported subjects prevent unknown or mixed measurements from being replaced with all metrics.
  const metric='(?:sleep(?: duration)?|activity|(?:daily )?steps|resting heart rate|(?:self[- ]reported )?energy)';
  const subject=`${metric}(?:\\s*(?:,|and|&)\\s*${metric})*(?: (?:patterns|trends|records|data))?`;
  if(/^(?:prepare|create|give me|show me) (?:a )?neutral (?:wellness |record )?summary(?: i can discuss with (?:a )?(?:healthcare professional|clinician|doctor))?$/.test(question))return 'appointment';
  if(/^(?:what was different on days with (?:low|lower|less) (?:self[- ]reported )?energy|what patterns appear on (?:low|lower)[- ]energy days)$/.test(question))return 'low_energy';
  if(/^(?:show|show me) (?:the )?(?:records|evidence) (?:behind|for) (?:the |my )?sleep(?: trend)?$/.test(question))return 'sleep_evidence';
  if(new RegExp(`^compare (?:my |the )?(?:${subject}|(?:first and second|earlier and later) (?:halves|periods)|periods)$`).test(question))return 'comparison';
  if(new RegExp(`^(?:please )?(?:summari[sz]e|(?:give me|show me|show) (?:a )?summary of) (?:my |the |recorded )?(?:${subject}|(?:selected )?records|wellness|wellness patterns|recorded data)$`).test(question))return 'summary';
  if(new RegExp(`^(?:my |the )?${subject} summary$`).test(question))return 'summary';
  return null;
}
function requestedMetrics(question) {
  return Object.keys(metrics).filter(key=>({sleep_duration:/\bsleep\b/,steps:/\b(?:activity|steps)\b/,resting_heart_rate:/\bresting heart rate\b/,energy:/\benergy\b/})[key].test(question));
}
/** All answers are deterministic descriptions; no model, network, or live clock is used. @returns {Promise<IntelligenceResponse>} */
export async function answerQuestion(question,filters={}) {
  normalizeFilters(filters); // Invalid source/metric filters always reject explicitly.
  if(typeof question!=='string'||!question.trim())return insufficient('Choose a supported question about the selected records.');
  if(classify(question)==='clinical')return response('AETHRIVA can organize recorded information, but cannot diagnose or recommend treatment. Discuss clinical concerns with a qualified healthcare professional. For an immediate emergency, use local emergency services.',[],'out_of_scope');
  let scope;
  try { scope=queryScope(question,filters); } catch { return insufficient('The requested dates could not be resolved. Use valid demo dates in October 2026.'); }
  const {filters:f,text}=scope,intent=classify(text);
  if(!intent)return insufficient('This demo supports only sleep, steps/activity, resting heart rate, and self-reported energy: choose a summary, period comparison, lower-energy comparison, sleep evidence, or neutral appointment summary. Other measurements or question subjects are unavailable.');
  const requested=requestedMetrics(text),desired=requested.length?requested:Object.keys(metrics);
  const summary=await summarize(f);
  if(!summary.coverage.records)return insufficient();
  const findings=[];
  let extra=[];
  if(intent==='low_energy') {
    for(const key of ['sleep_duration','steps']) {
      const r=lowEnergyRecords(events,key,f);register(r.calculation);extra.push(...r.calculation.limitations);
      if(r.status==='supported') {
        const c=r.calculation,v=c.values;
        findings.push(finding(c,`${metrics[key].label} by self-reported energy`,`${number(v.delta)} ${unit(key)} difference`,`Energy ≤4 days averaged ${number(v.lowEnergyMean)} ${unit(key)} (${v.lowEnergyCount} days); energy ≥5 days averaged ${number(v.higherEnergyMean)} ${unit(key)} (${v.higherEnergyCount} days). This is descriptive, not causal.`));
      }
    }
  } else if(intent==='comparison') {
    const comparison=await comparePeriods(f);extra.push(...comparison.limitations);
    for(const c of comparison.calculations.filter(c=>desired.includes(c.metricKeys[0])&&c.values.delta!==null)) {
      const key=c.metricKeys[0],v=c.values;
      findings.push(finding(c,metrics[key].label,`${v.delta>=0?'+':''}${number(v.delta)} ${unit(key)}`,`${comparison.previousRange.from}–${comparison.previousRange.to}: ${number(v.previousMean)} ${unit(key)} (${v.previousCount} observed days). ${comparison.currentRange.from}–${comparison.currentRange.to}: ${number(v.currentMean)} ${unit(key)} (${v.currentCount} observed days). ${v.percentageChange===null?'Percentage change is undefined for a zero baseline.':`${number(v.percentageChange)}% change relative to the earlier mean.`}`));
    }
  } else {
    for(const c of summary.calculations.filter(c=>desired.includes(c.metricKeys[0])&&c.values.observedDays>0)) {
      const key=c.metricKeys[0],v=c.values;
      findings.push(finding(c,metrics[key].label,`${number(v.mean)} ${unit(key)} average`,`${v.observedDays} observed days; ${v.missingDays} missing days. Recorded daily range ${number(v.min)}–${number(v.max)} ${unit(key)}.${key==='steps'?` Total: ${number(v.total,0)} steps.`:''}`));
    }
    if(intent==='appointment')extra.push('This is an informational summary of recorded wellness data, not a medical assessment.');
  }
  if(!findings.length)return response('There is insufficient complete selected data for this comparison. Try a wider date range or include the relevant sources.',[],'insufficient_data',extra);
  const answers={summary:`Recorded measurement summary for ${f.from}–${f.to}.`,comparison:`Comparison of equal adjacent windows within ${f.from}–${f.to}.`,low_energy:`On complete paired days in ${f.from}–${f.to}, lower self-reported energy coincided with the recorded differences below. These differences do not establish causation.`,sleep_evidence:`The sleep summary for ${f.from}–${f.to} is calculated directly from the cited records.`,appointment:`Neutral record summary for ${f.from}–${f.to}. This is an informational summary of recorded wellness data, not a medical assessment.`};
  return response(answers[intent],findings,'supported',extra);
}
