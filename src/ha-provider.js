import WebSocket from 'ws';
import {HaConnectionPolicy,HaPolicyError,isHaPolicyError,validateHaUrl} from './ha-connection-policy.js';
import {pinnedHaHttpRequest} from './ha-http-transport.js';
export {validateHaUrl} from './ha-connection-policy.js';

// Home Assistant provides REST and WebSocket APIs on the same origin.
export class HomeAssistantProvider {
  constructor({url, token, allowInsecureLan=false, approvedIp=null, approvedOrigin=null,
    dnsLookup, fetchImpl=fetch, httpRequestImpl=pinnedHaHttpRequest, WebSocketImpl=WebSocket,
    onSecurityError=()=>{}}) {
    this.policy=new HaConnectionPolicy({
      url,allowInsecureLan,approvedIp,approvedOrigin,
      ...(dnsLookup?{dnsLookup}:{})
    });
    this.origin=this.policy.origin;
    this.httpRequestImpl=httpRequestImpl;
    this.onSecurityError=onSecurityError;
    this.policyBlocked=false;
    this.connecting=false;
    if (typeof token !== 'string' || !token.trim()) throw new Error('A Home Assistant token is required');
    this.token = token.trim();
    this.fetchImpl = fetchImpl;
    this.WebSocketImpl = WebSocketImpl;
    this.ws = null;
    this.listeners = new Set();
    this.states = new Map();
    this.requests = new Map();
    this.nextId = 1;
    this.timer = null;
    this.closed = false;
    this.retryCount = 0;
    this.authFailed = false;
  }
  getConnectionApproval(){return this.policy.getApproval();}
  blockSecurity(error){
    if(this.policyBlocked)return;
    this.policyBlocked=true;
    const ws=this.ws;this.ws=null;
    clearTimeout(this.timer);this.timer=null;
    ws?.terminate?.();
    this.onSecurityError(isHaPolicyError(error)?error.message:
      'Home Assistant network security check failed; reconnect and authorize this server again');
  }
  async request(path, options = {}) {
    if (!path.startsWith('/api/')) throw new Error('Invalid API path');
    if(this.policyBlocked)throw new HaPolicyError('Home Assistant connection blocked by security policy');
    if(this.policy.isHttp){
      try{
        const ip=await this.policy.resolvePeer();
        return await this.httpRequestImpl({
          origin:this.origin,path,ip,policy:this.policy,token:this.token,
          method:options.method||'GET',body:options.body
        });
      }catch(error){
        if(isHaPolicyError(error))this.blockSecurity(error);
        throw error;
      }
    }
    // HTTPS retains native TLS certificate validation and strict redirect denial.
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    try{
      const res=await this.fetchImpl(this.origin+path,{
        ...options,redirect:'error',signal:controller.signal,
        headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'}
      });
      if(!res.ok)throw new Error('Home Assistant request failed (HTTP '+res.status+')');
      return res.status===204?null:res.json();
    }finally{clearTimeout(timer);}
  }
  async discoverDevices() {
    const states = await this.request('/api/states');
    if (!Array.isArray(states)) throw new Error('Unexpected states response');
    for (const state of states) if (typeof state.entity_id === 'string') this.states.set(state.entity_id, state);
    return states.map(state => ({
      id:state.entity_id, name:state.attributes?.friendly_name || state.entity_id,
      domain:state.entity_id.split('.')[0], state:state.state, attributes:state.attributes || {}
    }));
  }
  getState(entityId) { return this.states.get(entityId) || null; }
  async execute({entityId, service, data = {}}) {
    if (typeof entityId !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(entityId)) throw new Error('Invalid entity');
    const domain = entityId.split('.')[0];
    const safeServices = {
      light:['turn_on','turn_off','toggle'],switch:['turn_on','turn_off','toggle'],
      fan:['turn_on','turn_off','toggle'],cover:['open_cover','close_cover','stop_cover'],
      scene:['turn_on'],script:['turn_on'],input_boolean:['turn_on','turn_off','toggle']
    };
    if (!safeServices[domain]?.includes(service)) throw new Error('Unsupported or sensitive command');
    if (data === null || Array.isArray(data) || typeof data !== 'object') throw new Error('Invalid command data');
    if (Object.keys(data).some(k=>!['brightness_pct','rgb_color','color_temp_kelvin','percentage'].includes(k))) throw new Error('Unsupported command argument');
    return this.request('/api/services/' + domain + '/' + service, {
      method:'POST', body:JSON.stringify({...data,entity_id:entityId})
    });
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(state) {
    if (!state || typeof state.entity_id !== 'string') return;
    this.states.set(state.entity_id, state);
    for(const listener of this.listeners) { try { listener(state); } catch { /* isolate subscribers */ } }
  }
  connect() {
    this.closed=false;
    if(this.ws||this.connecting||this.authFailed||this.policyBlocked)return;
    if(!this.policy.isHttp){this.openSocket(null);return;}
    this.connecting=true;
    // DNS is rechecked on EVERY WS attempt including reconnections.
    void this.policy.resolvePeer().then(ip=>{
      this.connecting=false;
      if(!this.closed&&!this.policyBlocked&&!this.ws)this.openSocket(ip);
    }).catch(error=>{
      this.connecting=false;
      this.blockSecurity(error);
    });
  }
  openSocket(approvedIp) {
    const socketUrl=this.origin.replace(/^http/,'ws')+'/api/websocket';
    const options={followRedirects:false,handshakeTimeout:10000,perMessageDeflate:false};
    if(approvedIp)options.lookup=this.policy.lookupFor(approvedIp);
    let ws;
    try{ws=new this.WebSocketImpl(socketUrl,options);}
    catch{this.scheduleReconnect();return;}
    this.ws=ws;
    const send=payload=>{if(ws.readyState===1)ws.send(JSON.stringify(payload));};
    ws.on('message',raw=>{
      if(this.policyBlocked||this.closed||this.ws!==ws)return;
      // Never send the access token before confirming the actual WS peer.
      if(approvedIp){
        try{this.policy.verifyPeer(ws._socket?.remoteAddress,approvedIp);}
        catch(error){this.blockSecurity(error);return;}
      }
      let msg;try{msg=JSON.parse(String(raw));}catch{return;}
      if(msg.type==='auth_required')send({type:'auth',access_token:this.token});
      if(msg.type==='auth_ok'){
        this.retryCount=0;
        send({id:this.nextId++,type:'subscribe_events',event_type:'state_changed'});
      }
      if(msg.type==='auth_invalid'){this.authFailed=true;ws.close();}
      if(msg.type==='event'&&msg.event?.data?.new_state)this.emit(msg.event.data.new_state);
    });
    ws.on('error',()=>{}); // close event drives retry; never print messages or tokens
    ws.on('close',()=>{
      if(this.ws!==ws)return;
      this.ws=null;
      this.scheduleReconnect();
    });
  }
  scheduleReconnect(){
    if(this.closed||this.authFailed||this.policyBlocked||this.timer)return;
    const wait=Math.min(1000*2**Math.min(this.retryCount++,5),30000);
    this.timer=setTimeout(()=>{this.timer=null;this.connect();},wait);
  }
  close() {
    this.closed = true;clearTimeout(this.timer);this.timer=null;this.connecting=false;
    const ws=this.ws; this.ws=null; ws?.close();
    this.listeners.clear();
  }
}
