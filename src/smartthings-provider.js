// SmartThings public REST API. A short-lived PAT is permitted only for local development.
// Production account linking must use an official OAuth API Access App with refresh tokens.
const API = 'https://api.smartthings.com';
const SUPPORTED = new Map([['switch', ['on','off']], ['switchLevel',['setLevel']]]);
const UUID = /^[0-9a-f-]{20,64}$/i;
export class SmartThingsProvider {
  constructor({token,fetchImpl=fetch}) {
    if(typeof token!=='string'||!token.trim()) throw new Error('SmartThings bearer token is required');
    this.token=token.trim();this.fetchImpl=fetchImpl;
    this.states=new Map();this.devices=new Map();this.listeners=new Set();
  }
  async request(path,{method='GET',body}={}) {
    if(!path.startsWith('/v1/')||path.includes('..')) throw new Error('Invalid SmartThings endpoint');
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
    try {
      const res=await this.fetchImpl(API+path,{method,redirect:'error',signal:controller.signal,
        headers:{'Authorization':'Bearer '+this.token,'Content-Type':'application/json','Accept':'application/json'},
        ...(body===undefined?{}:{body:JSON.stringify(body)})});
      if(!res.ok) {
        if(res.status===429) throw new Error('SmartThings rate limited; retry later');
        throw new Error('SmartThings API HTTP '+res.status);
      }
      return res.status===204?null:res.json();
    } finally {clearTimeout(timeout);}
  }
  async discoverDevices() {
    const results=[];let next='/v1/devices?includeStatus=true',page=0;
    const visited=new Set();
    while(next&&page++<20) {
      if(visited.has(next)) throw new Error('Repeated SmartThings pagination cursor');
      visited.add(next);
      const data=await this.request(next);
      if(!Array.isArray(data?.items)) throw new Error('Invalid SmartThings device response');
      for(const raw of data.items) {
        const id=raw.deviceId;
        if(!UUID.test(id))continue;
        const caps=raw.components?.flatMap(c=>c.capabilities?.map(x=>x.id)||[])||[];
        if(!caps.some(c=>SUPPORTED.has(c)))continue;
        const d={id,name:raw.label||raw.name||id,domain:'smartthings',capabilities:caps};
        this.devices.set(id,d);
        results.push(d);
        const value=raw.status?.components?.main?.switch?.switch?.value;
        if(value==='on'||value==='off')this.states.set(id,{entity_id:id,state:value});
      }
      const href=data._links?.next?.href;
      if(!href){next=null;continue;}
      const url=new URL(href,API);
      if(url.origin!==API||url.pathname!=='/v1/devices')throw new Error('Untrusted pagination URL');
      next=url.pathname+url.search;
    }
    if(next)throw new Error('SmartThings pagination limit reached');
    return results;
  }
  getState(id){return this.states.get(id)||null;}
  async refreshState(id) {
    if(!UUID.test(id))throw new Error('Invalid SmartThings device id');
    const status=await this.request('/v1/devices/'+encodeURIComponent(id)+'/status');
    const value=status?.components?.main?.switch?.switch?.value;
    if(value==='on'||value==='off')this.emit({entity_id:id,state:value});
    return this.getState(id);
  }
  async execute({entityId,service,data={}}) {
    if(!UUID.test(entityId))throw new Error('Invalid SmartThings device id');
    if(!this.devices.has(entityId))throw new Error('Unknown SmartThings device; discover first');
    const capabilities=this.devices.get(entityId).capabilities;
    const capability=service==='turn_on'||service==='turn_off'?'switch':service==='set_level'?'switchLevel':null;
    if(!capability||!capabilities.includes(capability))throw new Error('Unsupported device command');
    const command=service==='turn_on'?'on':service==='turn_off'?'off':'setLevel';
    const args=command==='setLevel'?[data.level]:[];
    if(command==='setLevel'&&(!Number.isInteger(data.level)||data.level<0||data.level>100))throw new Error('Invalid level');
    await this.request('/v1/devices/'+encodeURIComponent(entityId)+'/commands',{
      method:'POST',body:{commands:[{component:'main',capability,command,arguments:args}]}
    });
    // API acceptance is not a confirmed state; event listener or refresh must confirm.
    return {accepted:true,confirmed:false};
  }
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  emit(state){if(!state||!this.devices.has(state.entity_id))return;this.states.set(state.entity_id,state);for(const fn of this.listeners){try{fn(state)}catch{}}}
  close(){this.listeners.clear();this.states.clear();this.devices.clear();}
}
