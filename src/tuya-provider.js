import {createHmac,createHash,randomUUID} from 'node:crypto';

// Only documented Tuya cloud APIs. Cloud credentials stay in the service process.
// Region is an explicit allowlist: caller cannot redirect signing headers to arbitrary hosts.
const REGIONS={
 us:'https://openapi.tuyaus.com',
 eu:'https://openapi.tuyaeu.com',
 cn:'https://openapi.tuyacn.com',
 in:'https://openapi.tuyain.com',
};
const validId=/^[A-Za-z0-9_-]{4,128}$/;
export function signTuya({clientId,secret,token='',method='GET',path,body='',timestamp,nonce}) {
 if(!/^\/(v1|v2)\.[0-9]+\//.test(path)||path.includes('..'))throw new Error('Invalid Tuya path');
 const hash=createHash('sha256').update(body,'utf8').digest('hex');
 const stringToSign=method+'\n'+hash+'\n\n'+path;
 return createHmac('sha256',secret).update(clientId+token+timestamp+nonce+stringToSign).digest('hex').toUpperCase();
}
export class TuyaProvider {
 constructor({clientId,secret,userId,region='us',fetchImpl=fetch,now=Date.now,nonce=randomUUID}) {
  if(!clientId?.trim()||!secret?.trim()||!validId.test(userId||''))throw new Error('Tuya project credentials and linked UID required');
  if(!REGIONS[region])throw new Error('Unsupported Tuya region');
  this.clientId=clientId.trim();this.secret=secret.trim();this.userId=userId;
  this.origin=REGIONS[region];this.fetchImpl=fetchImpl;this.now=now;this.nonce=nonce;
  this.token='';this.tokenUntil=0;this.devices=new Map();this.states=new Map();this.listeners=new Set();
 }
 async raw(method,path,body='',token='') {
  if(!/^\/v1\.0\//.test(path)||path.includes('..'))throw new Error('Unsupported Tuya path');
  const t=String(this.now()),nonce=this.nonce();
  const sign=signTuya({clientId:this.clientId,secret:this.secret,token,method,path,body,timestamp:t,nonce});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try {
   const resp=await this.fetchImpl(this.origin+path,{
    method,redirect:'error',signal:controller.signal,
    headers:{'client_id':this.clientId,'sign':sign,'sign_method':'HMAC-SHA256','t':t,'nonce':nonce,
      ...(token?{'access_token':token}:{}),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body}:{})
   });
   if(!resp.ok)throw new Error('Tuya API HTTP '+resp.status);
   const result=await resp.json();
   if(result?.success!==true)throw new Error('Tuya API rejected request'+(result?.code?' ('+String(result.code).slice(0,24)+')':''));
   return result.result;
  }finally{clearTimeout(timer);}
 }
 async accessToken() {
  if(this.token&&this.now()<this.tokenUntil)return this.token;
  const result=await this.raw('GET','/v1.0/token?grant_type=1');
  if(!result?.access_token||!Number.isFinite(result.expire_time))throw new Error('Tuya token response invalid');
  this.token=result.access_token;
  this.tokenUntil=this.now()+Math.max(0,result.expire_time-120)*1000;
  return this.token;
 }
 async request(method,path,body) {
  const token=await this.accessToken();
  return this.raw(method,path,body?JSON.stringify(body):'',token);
 }
 async discoverDevices(){
  const result=await this.request('GET','/v1.0/users/'+encodeURIComponent(this.userId)+'/devices');
  if(!Array.isArray(result))throw new Error('Unexpected Tuya device list response');
  const devices=[];
  for(const raw of result){
   if(!validId.test(raw.id||''))continue;
   const capabilities=(raw.status||[]).filter(x=>typeof x.code==='string'&&typeof x.value==='boolean').map(x=>x.code);
   const switchCode=capabilities.find(code=>['switch','switch_1','switch_led'].includes(code));
   if(!switchCode)continue;
   const state=raw.status.find(x=>x.code===switchCode);
   const item={id:raw.id,name:raw.name||raw.id,domain:'tuya',switchCode};
   this.devices.set(raw.id,item);this.states.set(raw.id,{entity_id:raw.id,state:state.value?'on':'off'});
   devices.push(item);
  }
  return devices;
 }
 getState(id){return this.states.get(id)||null;}
 async refreshState(id){
  if(!this.devices.has(id))throw new Error('Unknown Tuya device');
  const result=await this.request('GET','/v1.0/devices/'+encodeURIComponent(id)+'/status');
  if(!Array.isArray(result))throw new Error('Tuya invalid status response');
  const value=result.find(x=>x.code===this.devices.get(id).switchCode)?.value;
  if(typeof value==='boolean')this.emit({entity_id:id,state:value?'on':'off'});
  return this.getState(id);
 }
 async execute({entityId,service}) {
  if(!this.devices.has(entityId))throw new Error('Unknown Tuya device; discover first');
  if(!['turn_on','turn_off'].includes(service))throw new Error('Unsupported Tuya command');
  const item=this.devices.get(entityId);
  const response=await this.request('POST','/v1.0/devices/'+encodeURIComponent(entityId)+'/commands',{
   commands:[{code:item.switchCode,value:service==='turn_on'}]
  });
  if(response!==true)throw new Error('Tuya command not accepted');
  return {accepted:true,confirmed:false};
 }
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 emit(state){if(!state||!this.devices.has(state.entity_id))return;this.states.set(state.entity_id,state);for(const fn of this.listeners){try{fn(state)}catch{}}}
 close(){this.listeners.clear();this.states.clear();this.devices.clear();this.token='';this.tokenUntil=0;}
}
