// Privacy-preserving diagnostics. Never write raw tokens, URLs, device IDs,
// body, headers or SDK payloads; only bounded event names, timing and short hashes.
import {createHash} from 'node:crypto';
import {mkdir,appendFile,rename,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
const ALLOWED=new Set([
 'button_pressed','command_started','command_accepted','command_failed',
 'command_suppressed','provider_rate_limited','state_confirmed',
 'state_poll_failed','state_poll_rate_limited','state_confirmation_timeout'
]);
const SAFE_FIELDS=new Set(['provider','reason','attempt','elapsedMs','delayMs','httpStatus']);
const MAX_BYTES=2*1024*1024;
const root=join(process.env.LOCALAPPDATA||join(homedir(),'.local','share'),'Ulanzi','SmartHomePRO','logs');
const file=join(root,'smart-home.jsonl');
let pending=Promise.resolve(),initialized=false;
function sanitize(event,fields){
 if(!ALLOWED.has(event))return null;
 const row={ts:new Date().toISOString(),event};
 if(fields?.device)row.deviceHash=createHash('sha256').update(String(fields.device)).digest('hex').slice(0,12);
 for(const [key,value]of Object.entries(fields||{})){
  if(!SAFE_FIELDS.has(key))continue;
  if(key==='provider'&&['home-assistant','smartthings','tuya'].includes(value))row.provider=value;
  else if(key==='reason'&&['in_flight','cooldown','rate_limited'].includes(value))row.reason=value;
  else if(key==='httpStatus'&&Number.isInteger(value)&&value>=400&&value<=599)row.httpStatus=value;
  else if(['attempt','elapsedMs','delayMs'].includes(key)&&Number.isFinite(value))row[key]=Math.round(Math.max(0,Math.min(value,600000)));
 }
 return JSON.stringify(row)+'\n';
}
export function record(event,fields={}){
 const line=sanitize(event,fields);if(!line)return;
 pending=pending.then(async()=>{
  if(!initialized){await mkdir(root,{recursive:true});initialized=true;}
  const info=await stat(file).catch(()=>null);
  if(info&&info.size+Buffer.byteLength(line)>MAX_BYTES)await rename(file,file+'.previous').catch(()=>{});
  await appendFile(file,line,{encoding:'utf8',mode:0o600});
 }).catch(()=>{}); // Diagnostics must never disrupt a physical device.
}
export async function flushLogs(){await pending;}
export const diagnosticPath=file;
