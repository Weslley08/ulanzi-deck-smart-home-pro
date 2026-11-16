// Shelly Gen2+ HTTP RPC switch adapter. Private-LAN IP only.
// SHA-256 Digest authentication is supported without passwords in URLs or logs.
import {createHash,randomBytes} from 'node:crypto';
import {assertPrivateIPv4} from './hue-transport.js';
const sha=s=>createHash('sha256').update(s).digest('hex');
function digestChallenge(header){
 if(typeof header!=='string'||!/^Digest\s/i.test(header))return null;
 const fields={};
 for(const m of header.matchAll(/([a-zA-Z]+)=(?:"([^"]*)"|([^,\s]+))/g))
  fields[m[1].toLowerCase()]=m[2]??m[3];
 if(fields.algorithm?.toUpperCase()!=='SHA-256'||!fields.nonce||!fields.realm||
    !fields.qop?.split(',').map(v=>v.trim()).includes('auth'))return null;
 if(!/^[a-zA-Z0-9_.:-]{1,128}$/.test(fields.realm)||fields.nonce.length>256)return null;
 return fields;
}
export function createDigestHeader(header,password,{cnonce=randomBytes(8).toString('hex')}={}){
 const c=digestChallenge(header);
 if(!c||typeof password!=='string'||!password)throw new Error('Unsupported Shelly authentication challenge');
 const nc='00000001',user='admin',uri='/rpc';
 const ha1=sha(user+':'+c.realm+':'+password),ha2=sha('POST:'+uri);
 const response=sha([ha1,c.nonce,nc,cnonce,'auth',ha2].join(':'));
 return 'Digest username="admin", realm="'+c.realm+'", nonce="'+c.nonce+
  '", uri="/rpc", algorithm=SHA-256, qop=auth, nc='+nc+
  ', cnonce="'+cnonce+'", response="'+response+'"';
}
export class ShellyProvider {
 constructor({ip,password='',fetchImpl=fetch}){
  this.ip=assertPrivateIPv4(ip);
  if(typeof password!=='string'||password.length>256)throw new Error('Invalid Shelly password');
  this.password=password;this.fetchImpl=fetchImpl;
  this.origin='http://'+ip;
  this.devices=new Map();this.states=new Map();this.listeners=new Set();
 }
 async request(method,params={}){
  if(!['Shelly.GetDeviceInfo','Shelly.GetStatus','Switch.Set','Switch.GetStatus'].includes(method))
   throw new Error('Unsupported Shelly RPC');
  const payload=JSON.stringify({id:1,method,params});
  const headers={'Content-Type':'application/json'};
  const run=async()=>this.fetchImpl(this.origin+'/rpc',{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),
   headers,body:payload
  });
  let res=await run();
  if(res.status===401){
   if(!this.password)throw new Error('Shelly authentication required');
   headers.Authorization=createDigestHeader(res.headers.get('www-authenticate'),this.password);
   res=await run();
  }
  if(!res.ok)throw new Error('Shelly RPC failed (HTTP '+res.status+')');
  const data=await res.json();
  if(data?.error)throw new Error('Shelly RPC command rejected');
  return data?.result??data;
 }
 async discoverDevices(){
  const info=await this.request('Shelly.GetDeviceInfo');
  if(!Number.isInteger(info?.gen)||info.gen<2)throw new Error('Shelly Gen2+ required');
  const status=await this.request('Shelly.GetStatus');
  if(!status||typeof status!=='object')throw new Error('Invalid Shelly status');
  this.devices.clear();
  const devices=[];
  for(const [key,val] of Object.entries(status)){
   const match=/^switch:(\d{1,2})$/.exec(key);
   if(!match||typeof val?.output!=='boolean')continue;
   const id=match[1];
   const d={id,name:String(info.name||info.id||'Shelly').slice(0,60)+' / Switch '+id,domain:'shelly'};
   this.devices.set(id,d);devices.push(d);this.update(id,val.output,false);
   if(devices.length>=16)break;
  }
  if(!devices.length)throw new Error('No supported Shelly switch outputs');
  return devices;
 }
 update(id,on,notify=true){
  if(typeof on!=='boolean')return;
  const state={entity_id:id,state:on?'on':'off'};
  this.states.set(id,state);
  if(notify)for(const fn of this.listeners){try{fn(state)}catch{}}
 }
 getState(id){return this.states.get(id)||null;}
 async refreshState(id){
  if(!this.devices.has(id))throw new Error('Unknown Shelly switch');
  const result=await this.request('Switch.GetStatus',{id:Number(id)});
  if(typeof result?.output!=='boolean')throw new Error('Invalid Shelly switch status');
  this.update(id,result.output);
  return this.getState(id);
 }
 async execute({entityId,service}){
  if(!this.devices.has(entityId))throw new Error('Unknown Shelly switch');
  if(!['turn_on','turn_off','toggle'].includes(service))throw new Error('Unsupported Shelly command');
  const state=this.getState(entityId)?.state;
  if(service==='toggle'&&state!=='on'&&state!=='off')throw new Error('Shelly state unknown');
  const on=service==='turn_on'||(service==='toggle'&&state==='off');
  await this.request('Switch.Set',{id:Number(entityId),on});
  return {accepted:true,confirmed:false};
 }
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 close(){this.listeners.clear();this.devices.clear();this.states.clear();}
}
