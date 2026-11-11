// Provider-specific Property Inspector, SDK v3.1 documented messaging only.
// NEVER use sendParamFromPlugin for account credentials: Studio saves it in a profile.
for(const method of ['log','debug','info','warn','error'])console[method]=()=>{};
const ID='com.ulanzi.smarthomepro.ulanziPlugin';
const byAction={
 [ID+'.home-assistant']:'home-assistant',
 [ID+'.smartthings']:'smartthings',
 [ID+'.tuya']:'tuya',
 [ID+'.hue']:'hue',
 [ID+'.shelly']:'shelly'
};
const qs=new URLSearchParams(location.search);
const providerId=byAction[qs.get('uuid')];
const names={'home-assistant':'Home Assistant','smartthings':'SmartThings','tuya':'Tuya / Smart Life','hue':'Philips Hue','shelly':'Shelly'};
const configs={
 'home-assistant':[
  ['url','Home Assistant URL (HTTPS)','url','https://homeassistant.example.com'],
  ['token','Long-lived access token','password','']
 ],
 'smartthings':[['token','SmartThings personal access token (development only)','password','']],
 'tuya':[
  ['clientId','Cloud Client ID','text',''],
  ['secret','Cloud Client Secret','password',''],
  ['userId','Linked account UID','text',''],
  ['region','Cloud region','select','us']
 ],
 'hue':[
  ['bridgeIp','Bridge private IP address','text','192.168.1.20'],
  ['applicationKey','Hue application key (paired on Bridge)','password',''],
  ['tlsFingerprint','Bridge certificate SHA-256 fingerprint','text','64 hex characters']
 ],
 'shelly':[
  ['ip','Shelly private IP address (Gen2+)','text','192.168.1.30'],
  ['password','Device password (optional, Digest auth)','password','']
 ]
};
// Fixed, reviewed destinations only — never derive external URLs from account input.
const officialPortals=Object.freeze({
 'home-assistant':'https://www.home-assistant.io/docs/authentication/',
 'smartthings':'https://account.smartthings.com/tokens',
 'tuya':'https://platform.tuya.com/',
 'hue':'https://developers.meethue.com/develop/get-started-2/',
 'shelly':'https://shelly-api-docs.shelly.cloud/gen2/General/RPCChannels/'
});
const hostedGuides=Object.freeze({
 'home-assistant':'https://github.com/Weslley08/ulanzi-deck-smart-home-pro/blob/develop/docs/setup/HOME_ASSISTANT.md',
 'smartthings':'https://github.com/Weslley08/ulanzi-deck-smart-home-pro/blob/develop/docs/setup/SMARTTHINGS.md',
 'tuya':'https://github.com/Weslley08/ulanzi-deck-smart-home-pro/blob/develop/docs/setup/TUYA_SMART_LIFE.md',
 'hue':'https://github.com/Weslley08/ulanzi-deck-smart-home-pro/blob/develop/docs/setup/PHILIPS_HUE.md',
 'shelly':'https://github.com/Weslley08/ulanzi-deck-smart-home-pro/blob/develop/docs/setup/SHELLY.md'
});
const get=id=>document.getElementById(id);
const state={connected:false,loading:false,saved:{entityId:'',service:'toggle'}};
let pending=0;
let requiredFields=null;
const optionalCredentialFields={'shelly':new Set(['password'])};
const envFieldNames={HA_URL:'url',HA_TOKEN:'token',SMARTTHINGS_TOKEN:'token',TUYA_CLIENT_ID:'clientId',TUYA_CLIENT_SECRET:'secret',TUYA_USER_ID:'userId',TUYA_REGION:'region'};
function status(message){get('status').textContent=message;}
if(!providerId){
 get('heading').textContent='Unsupported action';
 get('connect-settings').hidden=true;
 get('device-settings').hidden=true;
 get('connection-status').textContent='Invalid provider action';
}else{
 get('heading').textContent='Smart Home PRO — '+names[providerId];
 get('pair-hue').hidden=providerId!=='hue';
 const fields=get('fields');
 for(const [key,label,type,placeholder] of configs[providerId]){
  const l=document.createElement('label');l.id='label-'+key;l.htmlFor='credential-'+key;l.textContent=label;fields.append(l);
  let input;
  if(type==='select'){
   input=document.createElement('select');
   for(const val of ['us','eu','cn','in'])input.add(new Option(val.toUpperCase(),val));
  }else{
   input=document.createElement('input');input.type=type;input.autocomplete='off';
   input.placeholder=placeholder||'';input.maxLength=2048;
  }
  input.id='credential-'+key;
  fields.append(input);
 }
}
function showRequiredFields(){
 for(const [key] of configs[providerId]||[]){
  const needed=!requiredFields||requiredFields.has(key);
  get('credential-'+key).hidden=!needed;
  get('label-'+key).hidden=!needed;
 }
}
function credentials(){
 const out={};
 for(const [key] of configs[providerId]||[]){
  out[key]=get('credential-'+key).value.trim();
 }
 return out;
}
function clearCredentials(){
 for(const [key,type] of (configs[providerId]||[]).map(([key,,type])=>[key,type])){
  const el=get('credential-'+key);
  if(type==='password')el.value='';
 }
}
function setConnected(value,source=''){
 state.connected=Boolean(value);
 get('device-settings').hidden=!value;
 get('connect-settings').hidden=value;
 get('disconnect').hidden=!value;
 get('connection-status').textContent=value?'Conectado'+(source==='environment'?' (ambiente)':source==='protected'?' (salvo com proteção do Windows)':' (sessão)'):'Não conectado — informe as credenciais';
 if(!value){
  get('entityId').replaceChildren(new Option('Connect to list devices',''));
 }
}
function persist(){
 if(!providerId)return;
 state.saved={entityId:get('entityId').value,service:get('service').value};
 $UD.sendParamFromPlugin(state.saved);
}
function readSaved(msg){
 if(!msg?.param)return;
 const p=msg.param;
 if(typeof p.entityId==='string')state.saved.entityId=p.entityId;
 if(typeof p.service==='string')state.saved.service=p.service;
 get('service').value=state.saved.service;
 syncSelection();
}
function syncSelection(){
 const el=get('entityId'),id=state.saved.entityId;
 if(id&&![...el.options].some(o=>o.value===id))el.add(new Option(id+' (saved)',id));
 el.value=id||'';
}
function refresh(){
 if(!providerId||!state.connected){status('Connect your provider first.');return;}
 state.loading=true;const id=++pending;status('Discovering devices...');
 $UD.sendToPlugin({type:'discover'});
 setTimeout(()=>{if(id===pending&&state.loading){state.loading=false;status('No response from plugin. Check Studio connection and try again.');}},12000);
}
if(providerId){
 $UD.connect();
 $UD.onConnected(()=>{
  $UD.sendToPlugin({type:'auth-status'});
 });
 $UD.onAdd(readSaved);
 $UD.onParamFromApp(readSaved);
 $UD.onParamFromPlugin(readSaved);
 get('setup-guide').addEventListener('click',()=>{
  // Open a stable HTTPS documentation page, not a local file:// path.
  $UD.openUrl(hostedGuides[providerId],false);
 });
 get('official-portal').addEventListener('click',()=>{
  $UD.openUrl(officialPortals[providerId],false);
 });
 if(providerId==='hue')get('pair-hue').addEventListener('click',()=>{
  const {bridgeIp,tlsFingerprint}=credentials();
  if(!bridgeIp||!/^(?:[0-9a-f]{2}:?){32}$/i.test(tlsFingerprint)){
   status('Enter the private Bridge IP and 64-digit certificate SHA-256 fingerprint first.');return;
  }
  status('Press the physical Hue Bridge button, then retry if needed...');
  $UD.sendToPlugin({type:'pair',credentials:{bridgeIp,tlsFingerprint},remember:get('remember-credentials').checked});
 });
 get('connect').addEventListener('click',()=>{
  const values=credentials();
  const missing=(configs[providerId]||[]).filter(([key])=>!(optionalCredentialFields[providerId]?.has(key))&&(!requiredFields||requiredFields.has(key))&&!values[key]).map(([key,label])=>label);
  if(missing.length){status('Required: '+missing.join(', '));return;}
  status('Validating credentials and contacting provider...');
  $UD.sendToPlugin({type:'authenticate',credentials:values,remember:get('remember-credentials').checked});
  // Keep the input until validation succeeds. Failed attempts must not erase it.
 });
 get('disconnect').addEventListener('click',()=>{$UD.sendToPlugin({type:'disconnect'});});
 get('refresh').addEventListener('click',refresh);
 get('entityId').addEventListener('change',persist);
 get('service').addEventListener('change',persist);
 $UD.onSendToPropertyInspector(msg=>{
  const p=msg?.payload;
  if(!p||p.providerId!==providerId)return;
  if(p.type==='auth-status'){
   if(Array.isArray(p.missingFields)){
    const mapped=p.missingFields.map(x=>envFieldNames[x]).filter(Boolean);
    requiredFields=mapped.length?new Set(mapped):null;
    // If all environment fields are present but validation fails, runtime
    // sends all required fields so credentials may be replaced manually.
    showRequiredFields();
   }
   if(p.restoring&&!p.connected){status('Restaurando conexão protegida do Windows...');return;}
   setConnected(p.connected,p.source);
   if(p.error){status(p.error);return;}
   if(p.connected)clearCredentials();
   status(p.notice|| (p.connected?'Conectado. Selecione um dispositivo.':'Informe as credenciais para conectar.'));
   if(Array.isArray(p.devices))showDevices(p.devices);
   else if(p.connected)refresh();
  }
  if(p.type==='devices'){
   state.loading=false;++pending;
   if(p.error)status(p.error);
   else{showDevices(p.devices||[]);status('Found '+(p.devices||[]).length+' supported devices.');}
  }
 });
}
function showDevices(devices){
 const e=get('entityId');
 e.replaceChildren(new Option('Select a device',''));
 for(const d of devices)if(typeof d.id==='string')e.add(new Option(String(d.name||d.id)+' ('+d.id+')',d.id));
 syncSelection();
}
