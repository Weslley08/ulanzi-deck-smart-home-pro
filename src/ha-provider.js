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
    this.retryCount = 0;
    this.authFailed = false;
    this.allowedEntities = new Set();
    this.registryListeners = new Set();
    this.registryRevision = 0;
    this.connectedOnce = false;
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
  // Home Assistant stores labels in the entity registry, not in /api/states.
  // A fresh authenticated WebSocket lookup is required for each discovery and
  // before each command. If the registry is unavailable, no entity is exposed.
  async readAllowedEntities() {
    const revision = this.registryRevision;
    this.allowedEntities = new Set();
    const allowed = await new Promise((resolve, reject) => {
      let socket = null;
      let timer = null;
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { socket?.close(); } catch { /* cleanup only */ }
        if (error) reject(error);
        else resolve(value);
      };
      const send = payload => {
        try {
          if (socket?.readyState !== 1) throw new Error('Registry WebSocket is not open');
          socket.send(JSON.stringify(payload));
        } catch { finish(new Error('Home Assistant entity registry is unavailable')); }
      };
      timer = setTimeout(() => finish(new Error('Home Assistant entity registry timed out')), 10000);
      try {
        socket = new this.WebSocketImpl(this.origin.replace(/^http/,'ws') + '/api/websocket', {followRedirects:false});
        socket.on('message', raw => {
          let msg;
          try { msg = JSON.parse(String(raw)); } catch { return; }
          if (msg.type === 'auth_required') send({type:'auth', access_token:this.token});
          if (msg.type === 'auth_ok') send({id:1, type:'config/entity_registry/list_for_display'});
          if (msg.type === 'auth_invalid') finish(new Error('Home Assistant registry authentication failed'));
          if (msg.type === 'result' && msg.id === 1) {
            if (!msg.success || !Array.isArray(msg.result?.entities)) {
              finish(new Error('Home Assistant entity registry lookup failed'));
              return;
            }
            const ids = msg.result.entities
              .filter(entry => typeof entry.ei === 'string' && Array.isArray(entry.lb) && entry.lb.includes('ulanzi'))
              .map(entry => entry.ei);
            finish(null, new Set(ids));
          }
        });
        socket.on('error', () => finish(new Error('Home Assistant entity registry connection failed')));
        socket.on('close', () => finish(new Error('Home Assistant entity registry disconnected')));
      } catch { finish(new Error('Home Assistant entity registry connection failed')); }
    });
    if (this.closed || revision !== this.registryRevision) {
      throw new Error('Home Assistant entity registry changed during lookup');
    }
    this.allowedEntities = allowed;
    return allowed;
  }
  isEntityAllowed(entityId) { return this.allowedEntities.has(entityId); }
  subscribeRegistry(fn) {
    this.registryListeners.add(fn);
    return () => this.registryListeners.delete(fn);
  }
  invalidateRegistry() {
    this.registryRevision++;
    this.allowedEntities = new Set();
    for (const fn of this.registryListeners) {
      try { fn(); } catch { /* isolate subscribers */ }
    }
  }
  async discoverDevices() {
    const allowed = await this.readAllowedEntities();
    const states = await this.request('/api/states');
    if (!Array.isArray(states)) throw new Error('Unexpected states response');
    if (this.allowedEntities !== allowed) throw new Error('Entity labels changed during discovery');
    this.states.clear();
    const visible = states.filter(state => typeof state.entity_id === 'string' && allowed.has(state.entity_id));
    for (const state of visible) this.states.set(state.entity_id, state);
    return visible.map(state => ({
      id:state.entity_id, name:state.attributes?.friendly_name || state.entity_id,
      domain:state.entity_id.split('.')[0], state:state.state, attributes:state.attributes || {}
    }));
  }
  getState(entityId) {
    return this.isEntityAllowed(entityId) ? this.states.get(entityId) || null : null;
  }
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
    const allowed = await this.readAllowedEntities();
    if (!allowed.has(entityId)) throw new Error('Entity is not labeled ulanzi in Home Assistant');
    return this.request('/api/services/' + domain + '/' + service, {
      method:'POST', body:JSON.stringify({...data,entity_id:entityId})
    });
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(state) {
    if (!state || typeof state.entity_id !== 'string' || !this.isEntityAllowed(state.entity_id)) return;
    this.states.set(state.entity_id, state);
    for(const listener of this.listeners) { try { listener(state); } catch { /* isolate subscribers */ } }
  }
  connect() {
    this.closed = false;
    if (this.ws || this.authFailed) return;
    const socketUrl = this.origin.replace(/^http/,'ws') + '/api/websocket';
    const ws = new this.WebSocketImpl(socketUrl, {followRedirects:false});
    this.ws = ws;
    const send = payload => { if (ws.readyState === 1) ws.send(JSON.stringify(payload)); };
    ws.on('message', raw => {
      let msg; try { msg = JSON.parse(String(raw)); } catch { return; }
      if (msg.type === 'auth_required') send({type:'auth',access_token:this.token});
      if (msg.type === 'auth_ok') {
        this.retryCount=0;
        for (const event_type of ['state_changed','entity_registry_updated','label_registry_updated']) {
          send({id:this.nextId++,type:'subscribe_events',event_type});
        }
        if (this.connectedOnce) this.invalidateRegistry();
        this.connectedOnce = true;
      }
      if (msg.type === 'auth_invalid') { this.authFailed=true; ws.close(); }
      if (msg.type === 'event' && msg.event?.data?.new_state) this.emit(msg.event.data.new_state);
      if (msg.type === 'event' && ['entity_registry_updated','label_registry_updated'].includes(msg.event?.event_type)) {
        this.invalidateRegistry();
      }
    });
    ws.on('error',()=>{}); // close event drives retry; never print credentials
    ws.on('close',()=>{
      if(this.ws !== ws) return;
      this.ws = null;
      if (!this.closed && !this.authFailed) {
        const wait=Math.min(1000*2**Math.min(this.retryCount++,5),30000);
        this.timer=setTimeout(()=>{this.timer=null;this.connect();},wait);
      }
    });
  }
  close() {
    this.closed = true; clearTimeout(this.timer); this.timer=null;
    const ws=this.ws; this.ws=null; ws?.close();
    this.listeners.clear();
    this.registryListeners.clear();
    this.allowedEntities = new Set();
  }
}
