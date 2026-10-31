import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdirSync, openSync, closeSync, chmodSync, lstatSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readWorkspace, WorkspaceError, DEFAULT_DATABASE_PATH} from './local-workspace.mjs';
import {validDate, civilDate, offsetDate, TIME_ZONE} from '../dist/data/metrics.js';
import * as workspaceData from '../dist/data/workspace-data.js';

export const DEFAULT_JOURNAL_PATH=fileURLToPath(new URL('../.local/aethriva.sqlite',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,32);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const invalid=message=>new WorkspaceError('INVALID_INPUT',message,400);
const journalFailure=()=>new WorkspaceError('JOURNAL_UNAVAILABLE','Your local journal is unavailable. Check its location and permissions; existing provider history has not been changed.',503);
const journalFile=provided=>provided||process.env.AETHRIVA_JOURNAL_PATH||DEFAULT_JOURNAL_PATH;

function withJournal(options,callback) {
  const filename=path.resolve(journalFile(options.journalPath));
  const provider=path.resolve(options.databasePath||process.env.AETHRIVA_DB_PATH||DEFAULT_DATABASE_PATH);
  let db;
  try {
    if(filename===provider)throw journalFailure();
    mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
    try {const fd=openSync(filename,'wx',0o600);closeSync(fd);}catch(error){if(error.code!=='EEXIST')throw error;}
    const journalStat=lstatSync(filename);
    if(!journalStat.isFile()||journalStat.isSymbolicLink())throw journalFailure();
    // A configured alias or hard link must never turn the provider cache into our journal.
    let providerStat;try{providerStat=statSync(provider);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(providerStat&&providerStat.dev===journalStat.dev&&providerStat.ino===journalStat.ino)throw journalFailure();
    chmodSync(filename,0o600);
    db=new DatabaseSync(filename);db.exec('PRAGMA busy_timeout=2000; PRAGMA journal_mode=DELETE;');
    db.exec(`CREATE TABLE IF NOT EXISTS checkins(date TEXT PRIMARY KEY,energy INTEGER NOT NULL CHECK(energy BETWEEN 1 AND 10),created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS device_readings(id TEXT PRIMARY KEY,device_name TEXT NOT NULL,received_at TEXT NOT NULL,sample_json TEXT NOT NULL);`);
    return callback(db);
  }catch(error){if(error instanceof WorkspaceError)throw error;throw journalFailure();}
  finally {db?.close();}
}

function validJournalDate(date,now) {
  const today=civilDate(now);
  return validDate(date)&&date<=today&&date>=offsetDate(today,-3659);
}

export function saveCheckin(input,options={}) {
  const now=options.now||new Date();
  if(!object(input)||!validJournalDate(input.date,now)||!Number.isInteger(input.energy)||input.energy<1||input.energy>10)throw invalid('Choose a valid date within the last ten years and an integer energy rating from 1 to 10.');
  const date=input.date,energy=input.energy,time=now.toISOString();
  return withJournal(options,db=>{
    db.prepare('INSERT INTO checkins(date,energy,created_at,updated_at) VALUES(?,?,?,?) ON CONFLICT(date) DO UPDATE SET energy=excluded.energy,updated_at=excluded.updated_at').run(date,energy,time,time);
    return {id:`checkin_${date}`,date,energy};
  });
}

export function saveDeviceReadings(input,options={}) {
  const now=options.now||new Date();
  if(!object(input)||!object(input.device)||typeof input.device.name!=='string'||!input.device.name.trim()||input.device.name.length>200||/[\u0000-\u001f\u007f]/.test(input.device.name)||!Array.isArray(input.samples)||input.samples.length<1||input.samples.length>120)throw invalid('Provide a device name and between 1 and 120 accepted readings.');
  const deviceName=input.device.name.trim(),receivedAt=now.toISOString();
  let records;
  try {
    records=input.samples.map(sample=>{
      if(!object(sample)||!validJournalDate(civilDate(sample.timestamp),now)||Date.parse(sample.timestamp)>now.getTime())throw invalid('Device readings must have a valid received time within the last ten years.');
      const result=workspaceData.validateDeviceReading({id:'pending',sourceId:'bluetooth',deviceName,receivedAt,sample});
      // Canonical copied samples have a fixed field order, so retries are content-addressed.
      result.id=`device_${hash(JSON.stringify([deviceName,result.sample]))}`;
      return result;
    });
  }catch(error){if(error instanceof WorkspaceError)throw error;throw invalid('A device reading has invalid values, units, time, or rejected measurement status.');}
  return withJournal(options,db=>{
    db.exec('BEGIN IMMEDIATE');
    try {
      const insert=db.prepare('INSERT OR IGNORE INTO device_readings(id,device_name,received_at,sample_json) VALUES(?,?,?,?)');
      let inserted=0;
      for(const record of records)inserted+=Number(insert.run(record.id,record.deviceName,record.receivedAt,JSON.stringify(record.sample)).changes);
      db.exec('COMMIT');
      return {accepted:records.length,inserted,duplicates:records.length-inserted};
    }catch(error){db.exec('ROLLBACK');throw error;}
  });
}

function readJournal(options) {
  return withJournal(options,db=>({
    checkins:db.prepare('SELECT date,energy,created_at,updated_at FROM checkins ORDER BY date').all(),
    deviceReadings:db.prepare('SELECT id,device_name,received_at,sample_json FROM device_readings ORDER BY received_at DESC,id DESC LIMIT 10000').all().map(row=>workspaceData.validateDeviceReading({id:row.id,sourceId:'bluetooth',deviceName:row.device_name,receivedAt:row.received_at,sample:JSON.parse(row.sample_json)})),
  }));
}

function cacheSnapshot(options) {
  try{return {workspace:readWorkspace(options),available:true,error:null};}
  catch(error){if(!(error instanceof WorkspaceError))throw error;return {workspace:null,available:false,error};}
}

export function readCombinedWorkspace(options={}) {
  const now=options.now||new Date(),cache=cacheSnapshot({...options,now}),journal=readJournal(options);
  const current=civilDate(now);
  const workspace=cache.workspace||{version:1,mode:'local',profile:{name:'Your health',initials:'YH'},sources:[],events:[],workouts:[],range:{from:offsetDate(current,-29),to:current},importedAt:now.toISOString(),notices:[]};
  const oldest=offsetDate(current,-3659),inWindow=date=>date>=oldest&&date<=current;
  const previousCount=workspace.events.length+workspace.workouts.length+journal.checkins.length+journal.deviceReadings.length;
  workspace.events=workspace.events.filter(event=>inWindow(event.metadata?.civilDate||civilDate(event.observedAt)));
  workspace.workouts=workspace.workouts.filter(workout=>inWindow(workout.date));
  journal.checkins=journal.checkins.filter(row=>row.date>=oldest);
  journal.deviceReadings=journal.deviceReadings.filter(record=>inWindow(civilDate(record.sample.timestamp)));
  if(previousCount!==workspace.events.length+workspace.workouts.length+journal.checkins.length+journal.deviceReadings.length)workspace.notices.push('This workspace shows the most recent ten years through today. Older saved records are retained in their original storage.');
  workspace.timezone=TIME_ZONE;workspace.available=true;
  workspace.cache={available:cache.available};workspace.journal={available:true};
  if(!cache.available)workspace.notices.push(`Provider history is unavailable. ${cache.error.message} Your separately saved local records remain available.`);
  workspace.notices=workspace.notices.filter(note=>!note.startsWith('Self-reported energy has no saved observations.'));
  workspace.sources.push({id:'checkins',name:'Personal check-ins',sourceType:'manual',status:'ready',isSynthetic:false,metricKeys:['energy'],lastSyncedAt:journal.checkins.at(-1)?.updated_at||null,syncStatus:'complete',description:'Self-reported daily energy saved in your private local journal. One rating per Pacific calendar day.'});
  workspace.sources.push({id:'bluetooth',name:'Bluetooth monitors',sourceType:'clinical',status:'ready',isSynthetic:false,metricKeys:[],lastSyncedAt:journal.deviceReadings[0]?.receivedAt||null,syncStatus:'complete',description:'Accepted monitor readings saved locally. Live heart rate is distinct from resting heart rate; device clock time has no assumed time zone.'});
  for(const row of journal.checkins){
    if(!validJournalDate(row.date,now)||!Number.isInteger(row.energy)||row.energy<1||row.energy>10)throw journalFailure();
    workspace.events.push({id:`evt_energy_${row.date}`,userId:null,sourceId:'checkins',sourceRecordId:`checkin_${row.date}`,metricKey:'energy',metricLabel:'Self-reported energy',category:'wellness_checkin',value:row.energy,unit:'/10',originalValue:row.energy,originalUnit:'/10',observedAt:`${row.date}T20:00:00.000Z`,importedAt:now.toISOString(),timezone:TIME_ZONE,quality:'valid',provenance:{sourceName:'Personal check-ins',sourceType:'manual',importBatchId:'local-checkins',transformationVersion:'local-checkin-v1'},metadata:{isSynthetic:false,civilDate:row.date,aggregate:true,timestampPrecision:'day',checkInId:`checkin_${row.date}`}});
  }
  workspace.deviceReadings=journal.deviceReadings;
  const dates=[...workspace.events.map(event=>event.metadata?.civilDate||civilDate(event.observedAt)),...workspace.workouts.map(workout=>workout.date),...journal.deviceReadings.map(record=>civilDate(record.sample.timestamp))].sort();
  workspace.range={from:dates[0]||offsetDate(current,-29),to:current};
  return workspace;
}

export function readOperationalStatus(options={}) {
  const cache=cacheSnapshot(options);
  let journalAvailable=true;
  try{withJournal(options,db=>db.prepare('SELECT 1').get());}catch{journalAvailable=false;}
  return {status:cache.available&&journalAvailable?'ready':'degraded',cache:{available:cache.available},journal:{available:journalAvailable},capabilities:{checkins:journalAvailable,deviceReadings:journalAvailable,providerRefresh:cache.available,providerSync:false}};
}
