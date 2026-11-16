// Tasmota HTTP local adapter: one relay, no secrets in URLs.
// Tasmota HTTP authentication commonly places a password in query parameters;
// protected devices must instead use Home Assistant / a future MQTT adapter.
import {assertPrivateIPv4} from './hue-transport.js';
export class TasmotaProvider {
 constructor({ip,fetchImpl=fetch}){
  this.ip=assertPrivateIPv4(ip);
  this.fetchImpl=fetchImpl;
  this.states=new Map();this.listeners=new Set();this.devices=new Map();
 }
 async request(command){
  if(!/^Power1(?: (?:ON|OFF))?$/.test(command))throw new Error('Unsupported Tasmota command');
  const res=await this.fetchImpl('http://'+this.ip+'/cm?cmnd='+encodeURIComponent(command),{
   method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000)
  });
  if(!res.ok)throw new Error('Tasmota HTTP request failed or requires authentication');
  const value=await res.json();
  if(value===null||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid Tasmota response');
  const state=value.POWER1??value.POWER;
  if(!['ON','OFF'].includes(state))throw new Error('Tasmota relay state unavailable');
  return state;
 }
 async discoverDevices(){
  const on=await this.request('Power1');
  const d={id:'1',name:'Tasmota / Relay 1',domain:'tasmota'};
  this.devices.set('1',d);this.update(on,false);
  return [d];
 }
 update(value,notify=true){
  const s={entity_id:'1',state:value==='ON'?'on':'off'};
  this.states.set('1',s);
  if(notify)for(const fn of this.listeners){try{fn(s)}catch{}}
 }
 getState(id){return this.states.get(id)||null;}
 async refreshState(id){
  if(id!=='1'||!this.devices.has(id))throw new Error('Unknown Tasmota relay');
  const value=await this.request('Power1');
  this.update(value);
  return this.getState(id);
 }
 async execute({entityId,service}){
  if(entityId!=='1'||!this.devices.has(entityId))throw new Error('Unknown Tasmota relay');
  if(!['turn_on','turn_off','toggle'].includes(service))throw new Error('Unsupported Tasmota command');
  const previous=this.getState('1')?.state;
  if(service==='toggle'&&previous!=='on'&&previous!=='off')throw new Error('Tasmota state unknown');
  const on=service==='turn_on'||(service==='toggle'&&previous==='off');
  await this.request('Power1 '+(on?'ON':'OFF'));
  // HTTP result is an acknowledgement. Confirm physical state with refreshState.
  return {accepted:true,confirmed:false};
 }
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 close(){this.listeners.clear();this.devices.clear();this.states.clear();}
}
