import {validateWorkspace} from './workspace-data.js';

async function write(path,body,{fetchImpl=fetch}={}) {
  const response=await fetchImpl(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
  let payload;
  try {payload=await response.json();}catch {throw new Error('The workspace returned an unreadable response. Try again.');}
  if(!response.ok)throw new Error(payload?.error?.message||`The record could not be saved (HTTP ${response.status}).`);
  return {...payload,workspace:validateWorkspace(payload.workspace)};
}

export const saveCheckin=(value,options)=>write('/api/checkins',value,options);
export const saveDeviceReadings=(value,options)=>write('/api/device-readings',value,options);
