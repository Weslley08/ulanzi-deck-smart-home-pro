import UlanziApi from './ulanzi-api/libs/ulanziApi.js';
import {HomeAssistantProvider} from './ha-provider.js';
import {SmartThingsProvider} from './smartthings-provider.js';
import {TuyaProvider} from './tuya-provider.js';
import {ProviderRegistry} from './registry.js';

// Vendored Ulanzi SDK logs raw inbound messages, including credentials.
for(const name of ['log','info','debug','warn','error']) console[name]=()=>{};
const ID='com.ulanzi.smarthomepro.ulanziPlugin';
const ACTION=ID+'.device'; // Existing profiles: backward compatibility
const ACTIONS=Object.freeze({
 [ID+'.home-assistant']:'home-assistant',
 [ID+'.smartthings']:'smartthings',
 [ID+'.tuya']:'tuya'
});
const PROVIDER_IDS=new Set(Object.values(ACTIONS));
const sessionConnections=new Set();
const invalidEnvironments=new Set();
class Host extends UlanziApi {
 send(cmd,params){
  if(this.websocket?.readyState!==1)return;
  this.websocket.send(JSON.stringify({cmd,uuid:this.uuid,key:this.key,actionid:this.actionid,...params}));
 }
 reconnect(){this.connect(this.uuid,this.port,this.address);}
}
const host=new Host();
const providers=new ProviderRegistry();
const keys=new Map();
const ready=new Set();
function register(id,provider){
 providers.register(id,provider);
 provider.subscribe(state=>{
  for(const [ctx,s] of keys)if(s.providerId===id&&s.entityId===state.entity_id)paint(ctx);
 });
 if(id==='home-assistant')provider.connect();
 void refresh(id);
}
async function refresh(id){
 const p=providers.get(id);
 if(!p)return;
 try{
  await p.discoverDevices();
  invalidEnvironments.delete(id);
  sessionConnections.add(id);
  ready.add(id);
  for(const [ctx,s]of keys)if(s.providerId===id)paint(ctx);
 }catch{ready.delete(id);sessionConnections.delete(id);invalidEnvironments.add(id);}
}
// Authentication arrives via the SDK's transient sendToPlugin channel, NEVER via
// per-key saved settings. Secrets are process-memory-only until Studio exits.
// No exported profile or saved action can contain credentials.
function createProvider(id,credentials){
 if(id==='home-assistant')return new HomeAssistantProvider({url:credentials.url,token:credentials.token});
 if(id==='smartthings')return new SmartThingsProvider({token:credentials.token});
 if(id==='tuya')return new TuyaProvider({
   clientId:credentials.clientId,secret:credentials.secret,
   userId:credentials.userId,region:credentials.region||'us'
 });
 throw new Error('Unsupported provider');
}
function environmentFields(id){
 const fields=envConfigs.find(([key])=>key===id)?.[1]||[];
 return fields.filter(key=>typeof process.env[key]!=='string'||!process.env[key].trim());
}
function environmentCredentials(id){
 if(id==='home-assistant')return {url:process.env.HA_URL||'',token:process.env.HA_TOKEN||''};
 if(id==='smartthings')return {token:process.env.SMARTTHINGS_TOKEN||''};
 if(id==='tuya')return {
  clientId:process.env.TUYA_CLIENT_ID||'',secret:process.env.TUYA_CLIENT_SECRET||'',
  userId:process.env.TUYA_USER_ID||'',region:process.env.TUYA_REGION||'us'
 };
 return {};
}
function report(ctx,id,type,extra={}){
 host.sendToPropertyInspector({type,providerId:id,...extra},ctx);
}
async function authorize(ctx,id,credentials){
 if(!PROVIDER_IDS.has(id)||!credentials||typeof credentials!=='object'||Array.isArray(credentials))return;
 const clean=Object.fromEntries(Object.entries(credentials).filter(([k,v])=>
  ['url','token','clientId','secret','userId','region'].includes(k)&&typeof v==='string'&&v.length<=4096
 ));
 let candidate;
 try{
  // Explicit input overrides existing environment values, without returning secrets to Studio.
  candidate=createProvider(id,{...environmentCredentials(id),...Object.fromEntries(Object.entries(clean).filter(([,v])=>v.trim()))});
  const devices=await candidate.discoverDevices(); // Validate before declaring success.
  const previous=providers.get(id);
  providers.replace(id,candidate);
  if(previous)previous.close();
  candidate.subscribe(state=>{for(const [ctx,s] of keys)if(s.providerId===id&&s.entityId===state.entity_id)paint(ctx);});
  if(id==='home-assistant')candidate.connect();
  ready.add(id);
  sessionConnections.add(id);
  invalidEnvironments.delete(id);
  for(const [key,s] of keys)if(s.providerId===id)paint(key);
  report(ctx,id,'auth-status',{connected:true,devices:filterDevices(id,devices)});
 }catch{
  candidate?.close();
  report(ctx,id,'auth-status',{connected:sessionConnections.has(id),error:'Connection failed. Check credentials, account access and network.'});
 }
}
function filterDevices(id,devices){
 return devices.filter(d=>id!=='home-assistant'||['light','switch','fan','cover','scene','script','input_boolean'].includes(d.domain))
  .map(({id,name,domain})=>({id,name,domain}));
}
// Existing development environment variables are recognized automatically.
// They do not get copied into action settings, and the Property Inspector only
// receives connection status, never values.
const envConfigs=[
 ['home-assistant',['HA_URL','HA_TOKEN'],()=>({url:process.env.HA_URL,token:process.env.HA_TOKEN})],
 ['smartthings',['SMARTTHINGS_TOKEN'],()=>({token:process.env.SMARTTHINGS_TOKEN})],
 ['tuya',['TUYA_CLIENT_ID','TUYA_CLIENT_SECRET','TUYA_USER_ID'],()=>({
  clientId:process.env.TUYA_CLIENT_ID,secret:process.env.TUYA_CLIENT_SECRET,
  userId:process.env.TUYA_USER_ID,region:process.env.TUYA_REGION||'us'
 })]
];
for(const [id,needed,load] of envConfigs){
 if(needed.every(name=>typeof process.env[name]==='string'&&process.env[name].trim())){
  try{register(id,createProvider(id,load()));}catch{sessionConnections.delete(id);}
 }
}
function normalize(raw){
 return{
  providerId:PROVIDER_IDS.has(raw?.providerId)?raw.providerId:'home-assistant',
  entityId:typeof raw?.entityId==='string'&&/^[a-zA-Z0-9_.-]{1,128}$/.test(raw.entityId)?raw.entityId:'',
  service:['toggle','turn_on','turn_off','open_cover','close_cover','stop_cover'].includes(raw?.service)?raw.service:'toggle'
 };
}
function paint(ctx){
 const s=keys.get(ctx);if(!s)return;
 const provider=providers.get(s.providerId);
 const state=provider?.getState(s.entityId);
 const index=!provider||!s.entityId?3:!state?2:['unavailable','unknown','offline'].includes(state.state)?2:['on','open'].includes(state.state)?1:0;
 const label=s.entityId?(s.entityId.includes('.')?s.entityId.split('.')[1]:s.entityId).replaceAll('_',' ').slice(0,16):'Configure';
 host.setStateIcon(ctx,index,label);
}
function add(msg){
 const fixed=ACTIONS[msg.uuid];
 if(!fixed&&msg.uuid!==ACTION)return;
 const cfg=normalize(msg.param);
 if(fixed)cfg.providerId=fixed; // Provider cannot be changed by saved settings.
 keys.set(msg.context,cfg);
 paint(msg.context);
}
async function run(msg){
 if(!ACTIONS[msg.uuid]&&msg.uuid!==ACTION)return;
 const ctx=msg.context,s=keys.get(ctx);
 const provider=s?providers.get(s.providerId):null;
 if(!provider||!s.entityId||!ready.has(s.providerId)){host.showAlert(ctx);return;}
 const state=provider.getState(s.entityId);
 const domain=s.entityId.split('.')[0];
 let service=s.service;
 if(service==='toggle'){
  if(s.providerId==='home-assistant'&&domain==='cover')service=state?.state==='open'?'close_cover':'open_cover';
  else if(s.providerId==='home-assistant'&&['scene','script'].includes(domain))service='turn_on';
  else service=state?.state==='on'?'turn_off':'turn_on';
 }
 try{
  await provider.execute({entityId:s.entityId,service});
  // No optimistic updates; cloud providers refresh only on confirmed server readback.
  if(s.providerId!=='home-assistant'&&provider.refreshState){
   setTimeout(()=>{if(keys.get(ctx)===s)provider.refreshState(s.entityId).catch(()=>{});},1500);
  }
 }catch{host.showAlert(ctx);}
}
host.onAdd(add);
host.onParamFromApp(add);
host.onParamFromPlugin(add);
host.onRun(msg=>{void run(msg);});
host.onSetActive(msg=>{if(String(msg.active)==='true')paint(msg.context);});
host.onSendToPlugin(msg=>{
 const ctx=msg.context,payload=msg.payload;
 const id=ACTIONS[msg.uuid]||(msg.uuid===ACTION?payload?.providerId:null);
 if(!PROVIDER_IDS.has(id))return;
 if(payload?.type==='auth-status'){
  report(ctx,id,'auth-status',{
    connected:sessionConnections.has(id),
    source:envConfigs.find(([p,fields])=>p===id&&fields.every(k=>process.env[k]?.trim()))?'environment':'session',
    missingFields:invalidEnvironments.has(id)?(envConfigs.find(([p])=>p===id)?.[1]||[]):environmentFields(id)
  });
  return;
 }
 if(payload?.type==='authenticate'){
  void authorize(ctx,id,payload.credentials);
  return;
 }
 if(payload?.type==='disconnect'){
  providers.get(id)?.close();
  providers.remove(id);
  ready.delete(id);
  sessionConnections.delete(id);
  for(const [key,s]of keys)if(s.providerId===id)paint(key);
  report(ctx,id,'auth-status',{connected:false});
  return;
 }
 if(payload?.type!=='discover')return;
 const provider=providers.get(id);
 const respond=(devices,error)=>report(ctx,id,'devices',{devices,error});
 if(!provider||!sessionConnections.has(id)){
  respond([],'Connect your account before refreshing devices.');return;
 }
 provider.discoverDevices().then(devices=>{
  ready.add(id);
  for(const [key,s]of keys)if(s.providerId===id)paint(key);
  respond(filterDevices(id,devices));
 }).catch(()=>{ready.delete(id);respond([],'Device discovery failed. Check connection and permissions.');});
});
host.onClear(msg=>{for(const item of msg.param??[])keys.delete(item.context);});
let retry;
host.onClose(()=>{if(!retry)retry=setTimeout(()=>{retry=null;host.reconnect();},3000);});
host.onError(()=>{});
host.onConnected(()=>{for(const ctx of keys.keys())paint(ctx);});
function shutdown(){clearTimeout(retry);void providers.close();process.exit(0);}
process.once('SIGINT',shutdown);
process.once('SIGTERM',shutdown);
host.connect(ID);
