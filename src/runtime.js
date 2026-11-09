import UlanziApi from './ulanzi-api/libs/ulanziApi.js';
import { HomeAssistantProvider } from './ha-provider.js';
import { ProviderRegistry } from './registry.js';

// The vendored SDK prints entire inbound messages (including secrets). Do not let it log.
// Credentials are exclusively read from process environment, NEVER button parameters.
for (const name of ['log','info','debug','warn','error']) console[name] = () => {};
const ID = 'com.ulanzi.smarthomepro.ulanziPlugin';
const ACTION = ID + '.device';
class Host extends UlanziApi {
  send(cmd, params) {
    if (this.websocket?.readyState !== 1) return;
    this.websocket.send(JSON.stringify({cmd,uuid:this.uuid,key:this.key,actionid:this.actionid,...params}));
  }
  reconnect() {
    this.connect(this.uuid,this.port,this.address);
  }
}
const host = new Host();
const providers = new ProviderRegistry();
const keys = new Map();
let provider=null;
if (process.env.HA_URL && process.env.HA_TOKEN) {
  try {
    provider = providers.register('home-assistant',new HomeAssistantProvider({url:process.env.HA_URL,token:process.env.HA_TOKEN}));
    provider.subscribe(state => {
      for (const [ctx,settings] of keys) if (settings.entityId === state.entity_id) paint(ctx);
    });
    provider.connect();
    provider.discoverDevices().then(()=>{for(const ctx of keys.keys())paint(ctx);}).catch(()=>{});
  } catch { provider=null; }
}
const normalize = raw => ({
  entityId:typeof raw?.entityId === 'string' && /^[a-z_]+\.[a-z0-9_]+$/.test(raw.entityId) ? raw.entityId : '',
  service:['toggle','turn_on','turn_off','open_cover','close_cover','stop_cover'].includes(raw?.service) ? raw.service : 'toggle',
});
function paint(ctx) {
  const s=keys.get(ctx);
  if (!s) return;
  const state=provider?.getState(s.entityId);
  const index=!provider||!s.entityId?3:!state?2:state.state==='unavailable'||state.state==='unknown'?2:state.state==='on'||state.state==='open'?1:0;
  host.setStateIcon(ctx,index,s.entityId ? s.entityId.split('.')[1].replaceAll('_',' ').slice(0,16) : 'Configure');
}
function add(msg) {if(msg.uuid!==ACTION)return;keys.set(msg.context,normalize(msg.param));paint(msg.context);}
async function run(msg) {
  if(msg.uuid!==ACTION)return;
  const ctx=msg.context,s=keys.get(ctx);
  if (!provider||!s?.entityId) { host.showAlert(ctx);return; }
  const current=provider.getState(s.entityId);
  const domain=s.entityId.split('.')[0];
  let service=s.service;
  if(service==='toggle' && domain==='cover') service=current?.state==='open'?'close_cover':'open_cover';
  if(service==='toggle' && ['scene','script'].includes(domain)) service='turn_on';
  try {
    await provider.execute({entityId:s.entityId,service});
    // Do not paint an optimistic success: only a confirmed event/refresh changes it.
  } catch {host.showAlert(ctx);}
}
host.onAdd(add);
host.onParamFromApp(add);
host.onParamFromPlugin(add);
host.onRun(msg=>{void run(msg);}); // do not handle keydown too (some decks send both)
host.onSetActive(msg=>{if(String(msg.active)==='true')paint(msg.context);});
host.onSendToPlugin(msg=>{
  if(msg.payload?.type!=='discover')return;
  const ctx=msg.context;
  const respond=(devices,error)=>host.sendToPropertyInspector({
    type:'devices',devices,error
  },ctx);
  if(!provider){respond([],'Configure HA_URL and HA_TOKEN in the plugin environment');return;}
  provider.discoverDevices().then(devices=>respond(
    devices.filter(d=>['light','switch','fan','cover','scene','script','input_boolean'].includes(d.domain))
      .map(({id,name,domain})=>({id,name,domain}))
  )).catch(()=>respond([],'Home Assistant connection unavailable'));
});
host.onClear(msg=>{
  for(const item of msg.param??[])keys.delete(item.context);
});
let retry;
host.onClose(()=>{
  if(retry)return;
  retry=setTimeout(()=>{retry=null;host.reconnect();},3000);
});
host.onError(()=>{});
host.onConnected(()=>{for(const ctx of keys.keys())paint(ctx);});
process.once('SIGINT',()=>{clearTimeout(retry);providers.close();process.exit(0);});
process.once('SIGTERM',()=>{clearTimeout(retry);providers.close();process.exit(0);});
host.connect(ID);
