import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';

const fixturePath = new URL('../dist/data/demo-data.js', import.meta.url);
test('canonical fixture exposes complete validated provenance and one energy event per checkin', async () => {
  assert.ok(existsSync(fixturePath), 'canonical fixture must exist');
  const {events, checkins, sources, validateFixture} = await import(fixturePath);
  assert.equal(validateFixture(), true);
  assert.equal(sources.filter(s => s.status === 'demo_loaded').length, 3);
  assert.ok(checkins.length >= 24);
  for (const c of checkins) {
    assert.equal(events.filter(e => e.metadata.checkInId === c.id).length, 1);
  }
  assert.ok(events.some(e => e.metricKey === 'steps' && e.value === 0));
  const broken = structuredClone(events); delete broken[0].provenance.importBatchId;
  assert.throws(() => validateFixture({events:broken, sources, checkins}), /provenance/i);
});

const analyticsPath = new URL('../dist/data/analytics.js', import.meta.url);
test('summary retains zeros, deliberate gaps, source scope and metric scope', async () => {
  assert.ok(existsSync(analyticsPath), 'analytics must exist');
  const a = await import(analyticsPath);
  const {events} = await import(fixturePath);
  const summary = a.summarizeRecords(events, {from:'2026-10-01',to:'2026-10-30'});
  assert.equal(summary.coverage.records,110);
  assert.equal(summary.coverage.sources,3);
  assert.equal(summary.coverage.daysWithCheckins,28);
  assert.equal(summary.coverage.metrics.steps.observedDays,28);
  assert.equal(summary.coverage.metrics.steps.missingDays,2);
  assert.equal(summary.seriesByMetric.steps[3].value,0);
  assert.equal(summary.seriesByMetric.steps[10].value,null);
  assert.equal(a.summarizeRecords(events,{sourceIds:[]}).coverage.records,0);
  assert.equal(a.summarizeRecords(events,{metricKey:'steps'}).coverage.records,28);
  assert.equal(a.summarizeRecords(events,{sourceIds:['wearable']}).coverage.records,54);
  assert.throws(()=>a.selectRecords(events,{sourceIds:['unknown']}),/source/i);
  assert.throws(()=>a.selectRecords(events,{metricKey:'bad'}),/metric/i);
  assert.throws(()=>a.selectRecords(events,{from:'2026-02-30'}),/date/i);
});

function record(day, metricKey, value) {
  return {id:`evt_${metricKey}_${day}`,metricKey,value,sourceId:metricKey==='energy'?'checkin':'wearable',observedAt:`2026-10-${String(day).padStart(2,'0')}T20:00:00-07:00`};
}
test('periods use adjacent equal windows anchored to end, odd dates excluded and zero baseline is undefined', async () => {
  assert.ok(existsSync(analyticsPath),'analytics must exist');
  const a = await import(analyticsPath);
  const data=[record(1,'steps',999),record(2,'steps',0),record(3,'steps',0),record(4,'steps',4),record(5,'steps',6)];
  const c=a.compareRecords(data,{from:'2026-10-01',to:'2026-10-05'});
  assert.deepEqual(c.previousRange,{from:'2026-10-02',to:'2026-10-03'});
  assert.deepEqual(c.currentRange,{from:'2026-10-04',to:'2026-10-05'});
  assert.deepEqual(c.excludedDates,['2026-10-01']);
  const calc=c.calculations.find(c=>c.metricKeys[0]==='steps');
  assert.deepEqual(calc.values,{previousMean:0,currentMean:5,delta:5,percentageChange:null,previousCount:2,currentCount:2,previousMissingDays:0,currentMissingDays:0});
  assert.equal(calc.sourceRecordIds.length,4);
  assert.equal(a.compareRecords(data,{from:'2026-10-01',to:'2026-10-01'}).status,'insufficient_data');
});

test('Pearson pairs by Pacific date and enforces 6/7/13/14 thresholds and variance', async () => {
  assert.ok(existsSync(analyticsPath),'analytics must exist');
  const a=await import(analyticsPath);
  for (const [n,status,warning] of [[6,'insufficient_data',false],[7,'supported',true],[13,'supported',true],[14,'supported',false]]) {
    const data=Array.from({length:n},(_,i)=>[record(i+1,'sleep_duration',i+1),record(i+1,'energy',(i+1)*2)]).flat();
    const r=a.associateRecords(data,'sleep_duration','energy',{});
    assert.equal(r.status,status);
    assert.equal(r.calculation.pairedSampleCount,n);
    assert.equal(r.calculation.values.correlation,n<7?null:1);
    assert.equal(r.calculation.limitations.some(l=>/small.sample/i.test(l)),warning);
    assert.equal(r.calculation.sourceRecordIds.length,n*2);
  }
  const constant=Array.from({length:14},(_,i)=>[record(i+1,'sleep_duration',7),record(i+1,'energy',i+1)]).flat();
  assert.equal(a.associateRecords(constant,'sleep_duration','energy',{}).status,'insufficient_data');
  const crossMidnight=[record(1,'sleep_duration',6),{...record(2,'energy',4),observedAt:'2026-10-02T02:00:00Z'}];
  assert.equal(a.associateRecords(crossMidnight,'sleep_duration','energy',{}).calculation.pairedSampleCount,1);
});

test('low-energy contrasts compare complete sleep/steps pairs independently and require each group', async () => {
  assert.ok(existsSync(analyticsPath),'analytics must exist');
  const a=await import(analyticsPath);
  const records=Array.from({length:7},(_,i)=>[record(i+1,'energy',i<3?4:5),record(i+1,'sleep_duration',i<3?6:8)]).flat();
  const r=a.lowEnergyRecords(records,'sleep_duration',{});
  assert.equal(r.status,'supported');
  assert.equal(r.calculation.values.lowEnergyMean,6);
  assert.equal(r.calculation.values.higherEnergyMean,8);
  assert.equal(r.calculation.values.delta,-2);
  assert.equal(r.calculation.values.lowEnergyCount,3);
  assert.equal(a.lowEnergyRecords(records,'steps',{}).status,'insufficient_data');
  assert.equal(a.lowEnergyRecords(records.filter(e=>e.id!=='evt_energy_1'),'sleep_duration',{}).status,'insufficient_data');
});

const servicePath = new URL('../dist/data/demo-service.js',import.meta.url);
test('all six service methods are async and citations resolve complete scoped calculation inputs',async()=>{
  assert.ok(existsSync(servicePath),'demo service must exist');
  const s=await import(servicePath);
  const f={from:'2026-10-01',to:'2026-10-30'};
  assert.equal((await s.selectEvents(f)).length,110);
  const summary=await s.summarize(f),comparison=await s.comparePeriods(f),insights=await s.buildInsights(f);
  assert.equal(summary.calculations.find(c=>c.metricKeys[0]==='sleep_duration').values.min,342);
  for(const c of [...summary.calculations,...comparison.calculations]) {
    const resolved=await s.resolveEvidence([c.id]);
    assert.equal(resolved.calculations.length,1);
    assert.deepEqual(new Set(resolved.records.map(e=>e.id)),new Set(c.sourceRecordIds));
  }
  assert.ok(insights.some(i=>i.type==='period_change'));
  assert.ok(insights.some(i=>i.type==='descriptive_association'));
  assert.ok(insights.some(i=>i.type==='coverage_note'));
  for(const i of insights) {
    assert.ok(i.calculationId);
    const evidence=await s.resolveEvidence([i.calculationId,...i.evidenceRecordIds]);
    assert.ok(evidence.calculations[0].sourceRecordIds.every(id=>evidence.records.some(e=>e.id===id)));
  }
  await assert.rejects(s.resolveEvidence(['evt_fake']),/unknown/i);
  await assert.rejects(s.resolveEvidence(['calc_fake']),/unknown/i);
  await assert.rejects(s.selectEvents({sourceIds:['fake']}),/source/i);
  const changed=await s.summarize({...f,sourceIds:['wearable']});
  assert.notEqual(changed.calculations[0].id,summary.calculations[0].id);
  assert.equal((await s.summarize(f)).calculations[0].id,summary.calculations[0].id);
});

test('five supported query intents are calculated, source-scoped, and evidence-linked',async()=>{
  assert.ok(existsSync(servicePath),'demo service must exist');
  const s=await import(servicePath);
  const questions=[
    'Summarize sleep and activity patterns over the last 30 days.',
    'Compare the first and second halves of this month.',
    'What was different on days with lower self-reported energy?',
    'Show the records behind the sleep trend.',
    'Prepare a neutral summary I can discuss with a healthcare professional.',
  ];
  for(const question of questions) {
    const r=await s.answerQuestion(question,{});
    assert.equal(r.responseType,'supported',question);
    assert.ok(r.findings.length,question);
    assert.ok(r.limitations.some(l=>/synthetic/i.test(l)));
    assert.ok(r.limitations.some(l=>/missing/i.test(l)));
    for(const finding of r.findings) {
      assert.ok(finding.calculationId);
      const e=await s.resolveEvidence([finding.calculationId,...finding.evidenceRecordIds]);
      assert.ok(e.calculations[0].sourceRecordIds.every(id=>finding.evidenceRecordIds.includes(id)));
      assert.ok(finding.evidenceRecordIds.every(id=>r.evidence.some(x=>x.recordId===id)));
    }
    assert.equal((await s.answerQuestion(question,{sourceIds:[]})).responseType,'insufficient_data');
  }
  const sleep=await s.answerQuestion(questions[0],{sourceIds:['wearable']});
  assert.ok(sleep.evidence.every(e=>e.sourceName==='Wearable export'));
  const dated=await s.answerQuestion('Summarize sleep from 2026-10-10 to 2026-10-16',{});
  assert.equal(dated.responseType,'supported');
  assert.ok(dated.evidence.every(e=>e.observedAt.slice(0,10)>='2026-10-10'&&e.observedAt.slice(0,10)<='2026-10-16'));
  assert.equal((await s.answerQuestion('Predict tomorrow’s marathon time',{})).responseType,'insufficient_data');
  assert.equal((await s.answerQuestion('Should I change medication?',{})).responseType,'out_of_scope');
  assert.equal((await s.answerQuestion('Do I have heart disease?',{})).responseType,'out_of_scope');
  assert.equal((await s.answerQuestion(questions[2],{metricKey:'steps'})).responseType,'insufficient_data');
});

test('unrelated comparisons stay unsupported and explicit single-day demo dates resolve',async()=>{
  const s=await import(servicePath);
  assert.equal((await s.answerQuestion('Compare pizza toppings',{})).responseType,'insufficient_data');
  const single=await s.answerQuestion('Summarize sleep on October 10',{});
  assert.equal(single.responseType,'supported');
  assert.equal(single.evidence.length,1);
  assert.equal(single.evidence[0].observedAt.slice(0,10),'2026-10-10');
  assert.equal((await s.answerQuestion('Is my resting heart rate dangerous?',{})).responseType,'out_of_scope');
});

test('fixture validation rejects malformed categories, checkins, source references and provenance',async()=>{
  const d=await import(fixturePath);
  for(const mutate of [
    f=>{f.events[0].category='bad';},
    f=>{f.checkins[0].stress=Infinity;},
    f=>{f.checkins[0].energy=null;},
    f=>{f.events[0].sourceId='missing';},
    f=>{f.events[0].metricLabel='Incorrect label';},
    f=>{f.events[0].observedAt='2026-10-99T07:00:00-07:00';},
    f=>{f.events[0].importedAt='2026-09-30T00:00:00-07:00';},
  ]) {
    const f=structuredClone({events:d.events,sources:d.sources,checkins:d.checkins});mutate(f);
    assert.throws(()=>d.validateFixture(f));
  }
});

test('metric validation rejects inherited object properties and explicit invalid query scopes',async()=>{
  const s=await import(servicePath);
  for(const metricKey of ['constructor','toString','__proto__']) {
    await assert.rejects(s.selectEvents({metricKey}),/metric/i);
    await assert.rejects(s.answerQuestion('Summarize sleep',{metricKey}),/metric/i);
  }
  const r=await s.answerQuestion('Summarize sleep on 2026-02-30',{});
  assert.equal(r.responseType,'insufficient_data');
});
