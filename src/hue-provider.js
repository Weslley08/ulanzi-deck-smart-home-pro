// Hue CLIP v2 adapter: private-LAN Bridge, application key, pinned TLS certificate.
// No cloud account, insecure TLS override, discovery scan or arbitrary HTTP paths.
import {assertPrivateIPv4,normalizeFingerprint,hueRequest} from './hue-transport.js';
const UUID=/^[a-f0-9-]{36}$/i;
export class HueProvider {
 constructor({bridgeIp,applicationKey,tlsFingerprint,requestImpl=hueRequest}){
  this.ip=assertPrivateIPv4(bridgeIp);
  this.fingerprint=normalizeFingerprint(tlsFingerprint);
  if(typeof applicationKey!=='string'||!/^[-a-zA-Z0-9_]{16,128}$/.test(applicationKey))
   throw new Error('Hue application key required');
  this.key=applicationKey;this.requestImpl=requestImpl;
  this.devices=new Map();this.states=new Map();this.listeners=new Set();
 }
 async request(path,options={}){
  return this.requestImpl({ip:this.ip,fingerprint:this.fingerprint,path,appKey:this.key,...options});
 }
 async discoverDevices(){
  const result=await this.request('/clip/v2/resource/light');
  if(!Array.isArray(result?.data))throw new Error('Unexpected Hue lights response');
  this.devices.clear();
  const devices=[];
  for(const item of result.data){
   if(!UUID.test(item?.id))continue;
   const name=String(item.metadata?.name||'Hue light').slice(0,80);
   const d={id:item.id,name,domain:'hue'};
   this.devices.set(item.id,d);devices.push(d);
   this.update(item,false);
  }
  return devices;
 }
 update(item,notify=true){
  const on=item?.on?.on;
  if(!UUID.test(item?.id)||typeof on!=='boolean')return;
  const state={entity_id:item.id,state:on?'on':'off'};
  this.states.set(item.id,state);
  if(notify)for(const fn of this.listeners){try{fn(state)}catch{}}
 }
 getState(id){return this.states.get(id)||null;}
 async refreshState(id){
  if(!this.devices.has(id)||!UUID.test(id))throw new Error('Unknown Hue light');
  const response=await this.request('/clip/v2/resource/light/'+id);
  const item=response?.data?.find(x=>x?.id===id);
  if(!item)throw new Error('Hue light state missing');
  this.update(item);
  return this.getState(id);
 }
 async execute({entityId,service}){
  if(!this.devices.has(entityId)||!UUID.test(entityId))throw new Error('Unknown Hue light');
  if(!['turn_on','turn_off','toggle'].includes(service))throw new Error('Unsupported Hue command');
  const was=this.getState(entityId)?.state;
  if(service==='toggle'&&was!=='on'&&was!=='off')throw new Error('Hue state not known');
  const on=service==='turn_on'||(service==='toggle'&&was==='off');
  await this.request('/clip/v2/resource/light/'+entityId,{method:'PUT',body:{on:{on}}});
  // PUT acceptance alone is never a confirmed device state.
  return {accepted:true,confirmed:false};
 }
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 close(){this.listeners.clear();this.devices.clear();this.states.clear();}
}
