import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {HomeAssistantProvider,validateHaUrl} from '../src/ha-provider.js';
import {ProviderRegistry} from '../src/registry.js';

// Simulate the Home Assistant label registry independently of /api/states.
// The plugin must never trust /api/states to tell it which labels apply.
class RegistrySocket extends EventEmitter {
 static entries=[];
 static rejectAuth=false;
 constructor(url,options) {
  super();
  this.url=url;
  this.options=options;
  this.readyState=1;
  this.sent=[];
  queueMicrotask(()=>this.receive({type:'auth_required'}));
 }
 receive(msg) { this.emit('message',JSON.stringify(msg)); }
 send(data) {
  const msg=JSON.parse(data);
  this.sent.push(msg);
  if(msg.type==='auth') {
   queueMicrotask(()=>this.receive({type:RegistrySocket.rejectAuth?'auth_invalid':'auth_ok'}));
  }
  if(msg.type==='config/entity_registry/list_for_display') {
   queueMicrotask(()=>this.receive({
    id:msg.id,type:'result',success:true,result:{entities:RegistrySocket.entries}
   }));
  }
 }
 close() {
  if(this.readyState===3)return;
  this.readyState=3;
  this.emit('close');
 }
}
test('HTTPS only outside loopback',()=>{
 assert.equal(validateHaUrl('https://home.example'), 'https://home.example');
 assert.equal(validateHaUrl('http://localhost:8123'), 'http://localhost:8123');
 assert.throws(()=>validateHaUrl('http://192.168.1.10:8123'));
 assert.throws(()=>validateHaUrl('https://u:p@home.example'));
 assert.throws(()=>validateHaUrl('https://home.example/path'));
});
test('discovery and commands require the exact Ulanzi entity label',async()=>{
 RegistrySocket.rejectAuth=false;
 RegistrySocket.entries=[
  {ei:'light.desk',lb:['ulanzi','alexa']},
  {ei:'light.kitchen',lb:['alexa']},
  {ei:'light.other',lb:[]}
 ];
 const calls=[];
 const provider=new HomeAssistantProvider({
  url:'https://ha.example',token:'secret',WebSocketImpl:RegistrySocket,
  fetchImpl:async(url,opts)=>{
   calls.push({url,opts});
   return {ok:true,status:200,json:async()=>url.endsWith('/states')?[
    {entity_id:'light.desk',state:'off',attributes:{friendly_name:'Mesa'}},
    {entity_id:'light.kitchen',state:'on',attributes:{friendly_name:'Cozinha'}},
    {entity_id:'light.other',state:'off',attributes:{}}
   ]:[]};
  }
 });
 const devices=await provider.discoverDevices();
 assert.deepEqual(devices.map(d=>d.id),['light.desk']);
 assert.equal(devices[0].name,'Mesa');
 assert.equal(provider.getState('light.kitchen'),null);
 assert.equal(provider.isEntityAllowed('light.desk'),true);
 await provider.execute({entityId:'light.desk',service:'turn_on',data:{brightness_pct:50}});
 assert.equal(calls.filter(c=>c.opts.method==='POST').length,1);
 assert.equal(calls[1].url,'https://ha.example/api/services/light/turn_on');
 assert.equal(JSON.parse(calls[1].opts.body).entity_id,'light.desk');
 assert.equal(calls[1].opts.headers.Authorization,'Bearer secret');
 await assert.rejects(()=>provider.execute({entityId:'light.kitchen',service:'turn_off'}),/not labeled/);
 await assert.rejects(()=>provider.execute({entityId:'lock.door',service:'unlock'}),/Unsupported/);
 // Label removed in HA without an event arriving: a fresh check still blocks action.
 RegistrySocket.entries=[{ei:'light.desk',lb:['alexa']}];
 await assert.rejects(()=>provider.execute({entityId:'light.desk',service:'turn_off'}),/not labeled/);
 assert.equal(provider.getState('light.desk'),null);
 assert.equal(calls.filter(c=>c.opts.method==='POST').length,1);
 provider.close();
});
test('registry/authentication failure exposes no devices and sends no commands',async()=>{
 RegistrySocket.rejectAuth=true;
 RegistrySocket.entries=[{ei:'light.desk',lb:['ulanzi']}];
 let httpCalls=0;
 const provider=new HomeAssistantProvider({
  url:'https://ha.example',token:'secret',WebSocketImpl:RegistrySocket,
  fetchImpl:async()=>{httpCalls++;throw new Error('should not reach REST API');}
 });
 await assert.rejects(()=>provider.discoverDevices(),/authentication failed/);
 assert.equal(provider.isEntityAllowed('light.desk'),false);
 await assert.rejects(()=>provider.execute({entityId:'light.desk',service:'turn_on'}),/authentication failed/);
 assert.equal(httpCalls,0);
 provider.close();
 RegistrySocket.rejectAuth=false;
});
test('event listeners and provider registration',()=>{
 const p=new HomeAssistantProvider({url:'https://ha.example',token:'x'});
 const r=new ProviderRegistry();r.register('ha',p);
 let seen='';
 const unsub=p.subscribe(s=>seen=s.state);
 p.allowedEntities.add('light.desk');
 p.emit({entity_id:'light.desk',state:'on'});assert.equal(seen,'on');
 p.emit({entity_id:'light.unlabeled',state:'off'});assert.equal(seen,'on');
 unsub();p.close();assert.equal(r.get('ha'),p);
});
