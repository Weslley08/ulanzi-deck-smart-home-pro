// SDK logging can reveal service payloads. Keep Inspector quiet.
for(const name of ['log','warn','info','error','debug'])console[name]=()=>{};
const form=document.getElementById('property-inspector');
const status=document.getElementById('status');
const provider=form.elements.providerId;
const entity=form.elements.entityId;
const service=form.elements.service;
const validProviders=['home-assistant','smartthings','tuya'];
let settings={providerId:'home-assistant',entityId:'',service:'toggle'};
let connected=false,loading=false;
function save(){
 settings={providerId:provider.value,entityId:entity.value,service:service.value};
 $UD.sendParamFromPlugin(settings);
}
function load(msg){
 if(!msg?.param)return;
 settings={...settings,...msg.param};
 if(!validProviders.includes(settings.providerId))settings.providerId='home-assistant';
 provider.value=settings.providerId;
 service.value=settings.service;
 if(!service.value)service.value='toggle';
 syncSelected();
 if(connected)refresh();
}
function syncSelected(){
 const selected=settings.entityId;
 if(selected&&![...entity.options].some(o=>o.value===selected))entity.add(new Option(selected,selected));
 entity.value=selected;
}
function refresh(){
 if(!connected||loading)return;
 loading=true;status.textContent='Looking up devices...';
 $UD.sendToPlugin({type:'discover',providerId:provider.value});
 // No response timeout required for saving; a later refresh is always possible.
 setTimeout(()=>{if(loading){loading=false;status.textContent='No response. Try Refresh devices.';}},12000);
}
$UD.connect();
$UD.onConnected(()=>{
 connected=true;
 if(!form.dataset.bound){
  form.dataset.bound='true';
  provider.addEventListener('change',()=>{
   settings.providerId=provider.value;settings.entityId='';entity.replaceChildren(new Option('Select a device',''));
   save();loading=false;refresh();
  });
  entity.addEventListener('change',save);
  service.addEventListener('change',save);
  document.getElementById('refresh').addEventListener('click',()=>{loading=false;refresh();});
 }
 refresh();
});
$UD.onAdd(load);
$UD.onParamFromApp(load);
$UD.onParamFromPlugin(load);
$UD.onSendToPropertyInspector(msg=>{
 if(msg.payload?.type!=='devices'||msg.payload.providerId!==provider.value)return;
 loading=false;
 status.textContent=msg.payload.error||'Discovered '+msg.payload.devices.length+' devices';
 entity.replaceChildren(new Option('Select a device',''));
 for(const d of msg.payload.devices)entity.add(new Option(d.name+' ('+d.id+')',d.id));
 syncSelected();
});
