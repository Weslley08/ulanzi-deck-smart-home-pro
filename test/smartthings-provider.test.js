import test from 'node:test';
import assert from 'node:assert/strict';
import {SmartThingsProvider} from '../src/smartthings-provider.js';
const id='11111111-2222-3333-4444-555555555555';
test('SmartThings discovery, state, command and no optimistic confirmation',async()=>{
 const calls=[];
 const p=new SmartThingsProvider({token:'test-token',fetchImpl:async(url,opt)=>{
  calls.push({url,opt});
  if(url.endsWith('/v1/devices?includeStatus=true'))return{ok:true,status:200,json:async()=>({
   items:[{deviceId:id,label:'Desk',components:[{id:'main',capabilities:[{id:'switch'}]}],
    status:{components:{main:{switch:{switch:{value:'off'}}}}}}],
   _links:{}
  })};
  return{ok:true,status:200,json:async()=>({})};
 }});
 const devices=await p.discoverDevices();assert.equal(devices[0].name,'Desk');
 assert.equal(p.getState(id).state,'off');
 const result=await p.execute({entityId:id,service:'turn_on'});
 assert.equal(result.confirmed,false);
 assert.equal(p.getState(id).state,'off');
 assert.deepEqual(JSON.parse(calls[1].opt.body).commands[0],
 {component:'main',capability:'switch',command:'on',arguments:[]});
 assert.equal(calls[1].opt.headers.Authorization,'Bearer test-token');
 await assert.rejects(p.execute({entityId:id,service:'unlock'}),/Unsupported/);
 p.close();
});
test('SmartThings disallows cross-origin pagination',async()=>{
 const p=new SmartThingsProvider({token:'x',fetchImpl:async()=>({ok:true,status:200,json:async()=>({
 items:[],_links:{next:{href:'https://evil.example/steal'}}
 })})});
 await assert.rejects(p.discoverDevices(),/Untrusted/);
});
test('SmartThings rejects 429 without replaying command',async()=>{
 const p=new SmartThingsProvider({token:'x',fetchImpl:async()=>({ok:false,status:429})});
 await assert.rejects(p.request('/v1/devices'),/rate limited/);
});
