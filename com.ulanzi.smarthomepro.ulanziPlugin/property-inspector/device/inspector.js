// Do not write plugin messages or settings to the browser console.
for(const name of ['log','warn','info','error','debug'])console[name]=()=>{};
const form=document.getElementById('property-inspector');
const status=document.getElementById('status');
const entity=form.elements.entityId;
const service=form.elements.service;
let settings={entityId:'',service:'toggle'};
function save(){
 settings={entityId:entity.value,service:service.value};
 $UD.sendParamFromPlugin(settings);
}
function load(msg){
 if(!msg?.param)return;
 settings={...settings,...msg.param};
 entity.value=settings.entityId;
 service.value=settings.service;
 if(settings.entityId && !entity.value){
  entity.add(new Option(settings.entityId,settings.entityId));
  entity.value=settings.entityId;
 }
}
function refresh(){$UD.sendToPlugin({type:'discover'});}
$UD.connect();
$UD.onConnected(()=>{
 refresh();
 entity.addEventListener('change',save);
 service.addEventListener('change',save);
 document.getElementById('refresh').addEventListener('click',refresh);
});
$UD.onAdd(load);
$UD.onParamFromApp(load);
$UD.onParamFromPlugin(load);
$UD.onSendToPropertyInspector(msg=>{
 if(msg.payload?.type!=='devices')return;
 status.textContent=msg.payload.error||'Discovered '+msg.payload.devices.length+' devices';
 const selected=settings.entityId;
 entity.replaceChildren(new Option('Select a device',''));
 for(const d of msg.payload.devices)entity.add(new Option(d.name+' ('+d.id+')',d.id));
 if(selected && ![...entity.options].some(o=>o.value===selected))entity.add(new Option(selected,selected));
 entity.value=selected;
});
