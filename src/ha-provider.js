import WebSocket from 'ws';

// One shared provider per Home Assistant instance. Never log tokens or full URLs.
// HTTPS/WSS is required outside explicit loopback development environments.
export function validateHaUrl(raw) {
  const u = new URL(raw);
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(u.hostname);
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password || u.search || u.hash || (u.protocol === 'http:' && !loopback)) {
    throw new Error('Use HTTPS for Home Assistant (HTTP allowed only on loopback)');
  }
  if (!u.hostname || u.pathname !== '/' && u.pathname !== '') throw new Error('Use the Home Assistant server origin without a path');
  return u.origin;
}
export class HomeAssistantProvider {
  constructor({url, token, fetchImpl = fetch, WebSocketImpl = WebSocket}) {
    this.origin = validateHaUrl(url);
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
  }
  async request(path, options = {}) {
    if (!path.startsWith('/api/')) throw new Error('Invalid API path');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await this.fetchImpl(this.origin + path, {
        ...options, redirect:'error', signal:controller.signal,
        headers:{Authorization:'Bearer ' + this.token, 'Content-Type':'application/json'}
      });
      if (!res.ok) throw new Error('Home Assistant request failed (HTTP ' + res.status + ')');
      return res.status === 204 ? null : res.json();
    } finally { clearTimeout(timer); }
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
    this.closed = false;
    if (this.ws) return;
    const socketUrl = this.origin.replace(/^http/,'ws') + '/api/websocket';
    const ws = new this.WebSocketImpl(socketUrl, {followRedirects:false});
    this.ws = ws;
    const send = payload => { if (ws.readyState === 1) ws.send(JSON.stringify(payload)); };
    ws.on('message', raw => {
      let msg; try { msg = JSON.parse(String(raw)); } catch { return; }
      if (msg.type === 'auth_required') send({type:'auth',access_token:this.token});
      if (msg.type === 'auth_ok') send({id:this.nextId++,type:'subscribe_events',event_type:'state_changed'});
      if (msg.type === 'event' && msg.event?.data?.new_state) this.emit(msg.event.data.new_state);
    });
    ws.on('error',()=>{}); // close event drives retry; never print credentials
    ws.on('close',()=>{
      if(this.ws !== ws) return;
      this.ws = null;
      if (!this.closed) this.timer = setTimeout(()=>{this.timer=null;this.connect();},5000);
    });
  }
  close() {
    this.closed = true; clearTimeout(this.timer); this.timer=null;
    const ws=this.ws; this.ws=null; ws?.close();
    this.listeners.clear();
  }
}
