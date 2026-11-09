import test from 'node:test';
import assert from 'node:assert/strict';
import {HomeAssistantProvider,validateHaUrl} from '../src/ha-provider.js';
import {ProviderRegistry} from '../src/registry.js';
test('HTTPS only outside loopback',()=>{
  assert.equal(validateHaUrl('https://home.example'), 'https://home.example');
  assert.equal(validateHaUrl('http://localhost:8123'), 'http://localhost:8123');
  assert.throws(()=>validateHaUrl('http://192.168.1.10:8123'));
  assert.throws(()=>validateHaUrl('https://u:p@home.example'));
  assert.throws(()=>validateHaUrl('https://home.example/path'));
});
test('discover and control light using authorized REST endpoint',async()=>{
 const calls=[];
 const provider=new HomeAssistantProvider({url:'https://ha.example',token:'secret',fetchImpl:async(url,opts)=>{
   calls.push({url,opts});
   return {ok:true,status:200,json:async()=>url.endsWith('/states')?[{entity_id:'light.desk',state:'off',attributes:{friendly_name:'Desk'}}]:[]};
 }});
 const devices=await provider.discoverDevices();
 assert.equal(devices[0].name,'Desk');
 await provider.execute({entityId:'light.desk',service:'turn_on',data:{brightness_pct:50}});
 assert.equal(calls[1].url,'https://ha.example/api/services/light/turn_on');
 assert.equal(JSON.parse(calls[1].opts.body).entity_id,'light.desk');
 assert.equal(calls[1].opts.headers.Authorization,'Bearer secret');
 await assert.rejects(()=>provider.execute({entityId:'lock.door',service:'unlock'}),/Unsupported/);
 provider.close();
});
test('event listeners and provider registration',()=>{
 const p=new HomeAssistantProvider({url:'https://ha.example',token:'x'});
 const r=new ProviderRegistry();r.register('ha',p);
 let seen='';const unsub=p.subscribe(s=>seen=s.state);
 p.emit({entity_id:'light.desk',state:'on'});assert.equal(seen,'on');
 unsub();p.close();assert.equal(r.get('ha'),p);
});
