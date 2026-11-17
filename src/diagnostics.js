// Smart Home PRO diagnostics via the documented Ulanzi SDK logMessage() API.
// Never log raw SDK messages, credentials, account URLs, device IDs or payloads.
// All events and field names are allowlisted and output is size/rate bounded.
import {createHash} from 'node:crypto';

export const PLUGIN_ID='com.ulanzi.smarthomepro.ulanziPlugin';
const ALLOWED=new Set([
 'button_pressed','command_started','command_accepted','command_failed',
 'command_suppressed','provider_rate_limited','state_confirmed',
 'state_poll_failed','state_poll_rate_limited','state_confirmation_timeout'
]);
const SAFE_FIELDS=new Set(['provider','reason','attempt','elapsedMs','delayMs','httpStatus']);
const LEVELS=new Map([
 ['command_failed','error'],['state_confirmation_timeout','warn'],
 ['provider_rate_limited','warn'],['state_poll_rate_limited','warn'],
 ['state_poll_failed','warn'],['command_suppressed','debug'],
 ['button_pressed','debug'],['command_started','debug'],
 ['command_accepted','info'],['state_confirmed','info']
]);
const MAX_DISTINCT=128;
const WINDOW_MS=60_000;
const MAX_LOG_LENGTH=512;
let transport=null;
let clock=()=>Date.now();
const recent=new Map();

function serialize(event,fields){
 if(!ALLOWED.has(event))return null;
 const row={event};
 if(typeof fields?.device==='string'){
  row.deviceHash=createHash('sha256').update(fields.device).digest('hex').slice(0,12);
 }
 for(const [key,value] of Object.entries(fields||{})){
  if(!SAFE_FIELDS.has(key))continue;
  if(key==='provider'&&['home-assistant','smartthings','tuya','hue','shelly','tasmota'].includes(value))row.provider=value;
  else if(key==='reason'&&['in_flight','cooldown','rate_limited'].includes(value))row.reason=value;
  else if(key==='httpStatus'&&Number.isInteger(value)&&value>=400&&value<=599)row.httpStatus=value;
  else if(['attempt','elapsedMs','delayMs'].includes(key)&&Number.isFinite(value))
   row[key]=Math.round(Math.max(0,Math.min(value,600000)));
 }
 return row;
}

// Caller must provide the SDK host object, never a console or raw file stream.
// No buffering of sensitive data before the host is connected.
export function configureStudioLogger(host,{now=()=>Date.now()}={}){
 if(!host||typeof host.logMessage!=='function')throw new TypeError('Ulanzi SDK logMessage required');
 transport=(message,level)=>host.logMessage(message,level);
 clock=now;
 recent.clear();
}

export function record(event,fields={}){
 if(!transport)return;
 const row=serialize(event,fields);
 if(!row)return;
 const level=LEVELS.get(event)||'info';
 const message=JSON.stringify(row);
 if(message.length>MAX_LOG_LENGTH)return;

 // Coalesce repeated events for the same hashed device/reason. Flush the count
 // on the next event for this key; cap memory growth for long-running sessions.
 const key=message;
 const now=clock();
 const previous=recent.get(key);
 if(previous&&now-previous.at<WINDOW_MS){
  previous.repeats++;
  return;
 }
 const repeated=previous?.repeats||0;
 if(recent.size>=MAX_DISTINCT&&!recent.has(key))recent.delete(recent.keys().next().value);
 recent.set(key,{at:now,repeats:0});
 try{
  transport(message,level);
  if(repeated)transport(JSON.stringify({event:'repeated_events',count:repeated,originalEvent:event}),level);
 }catch{
  // Logging must not interrupt device actions or expose unfiltered SDK payloads.
 }
}
