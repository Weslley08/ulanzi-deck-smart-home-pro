import test from 'node:test';
import assert from 'node:assert/strict';
import {TuyaProvider,signTuya} from '../src/tuya-provider.js';
test('Tuya signature is deterministic, body-sensitive and distinct per token',()=>{
 const args={clientId:'abc',secret:'xyz',method:'GET',path:'/v1.0/token?grant_type=1',timestamp:'1700000000000',nonce:'unit'};
 const a=signTuya(args);assert.match(a,/^[A-F0-9]{64}$/);
 assert.equal(a,signTuya(args));
 assert.notEqual(a,signTuya({...args,token:'token'}));
 assert.notEqual(signTuya({...args,method:'POST',body:'{}'}),a);
});
test('Tuya signs token and command requests and does not claim confirmed state',async()=>{
 const calls=[];
 const p=new TuyaProvider({clientId:'project',secret:'secret',userId:'user123',region:'eu',
  now:()=>1700000000000,nonce:()=>'nonce',fetchImpl:async(url,opt)=>{
   calls.push({url,opt});
   const result=url.includes('/token?')?{access_token:'TOKEN',expire_time:3600}
    :url.includes('/users/')?[{id:'lamp1',name:'Lamp',status:[{code:'switch_led',value:false}]}]
    :true;
   return{ok:true,status:200,json:async()=>({success:true,result})};
  }});
 const devices=await p.discoverDevices();
 assert.equal(devices[0].id,'lamp1');
 assert.equal(p.getState('lamp1').state,'off');
 const result=await p.execute({entityId:'lamp1',service:'turn_on'});
 assert.equal(result.confirmed,false);
 assert.equal(p.getState('lamp1').state,'off');
 assert.equal(calls.length,3);
 assert.equal(calls[0].url,'https://openapi.tuyaeu.com/v1.0/token?grant_type=1');
 assert.equal(calls[2].opt.headers.access_token,'TOKEN');
 assert.deepEqual(JSON.parse(calls[2].opt.body).commands,[{code:'switch_led',value:true}]);
 await assert.rejects(p.execute({entityId:'lamp1',service:'unlock'}),/Unsupported/);
 p.close();
});
test('Tuya rejects unexpected regions',()=>{
 assert.throws(()=>new TuyaProvider({clientId:'a',secret:'b',userId:'abcd',region:'example.com'}),/region/);
});
