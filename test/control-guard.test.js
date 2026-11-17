import test from 'node:test';
import assert from 'node:assert/strict';
import {CommandGuard,confirmState} from '../src/control-guard.js';
test('concurrent clicks for the same physical device cause only one API operation',async()=>{
 let release,posted=0;
 const pending=new Promise(r=>{release=r;});
 const guard=new CommandGuard({cooldownMs:1200});
 const first=guard.run('smartthings','deviceA',async()=>{posted++;await pending;return true;});
 const second=await guard.run('smartthings','deviceA',async()=>{posted++;});
 assert.deepEqual({accepted:second.accepted,reason:second.reason},{accepted:false,reason:'in_flight'});
 assert.equal(posted,1);
 release();await first;
 const third=await guard.run('smartthings','deviceA',async()=>{posted++;});
 assert.equal(third.reason,'cooldown');assert.equal(posted,1);
});
test('buttons for different devices are independent',async()=>{
 let now=10000;const guard=new CommandGuard({now:()=>now,cooldownMs:1000});
 let calls=0;
 const op=async()=>++calls;
 assert.equal((await guard.run('smartthings','a',op)).accepted,true);
 assert.equal((await guard.run('smartthings','b',op)).accepted,true);
 assert.equal(calls,2);
 now+=2000;
 assert.equal((await guard.run('smartthings','a',op)).accepted,true);
});
test('429 temporarily blocks provider but never retries a command',async()=>{
 let now=3000,calls=0;const guard=new CommandGuard({now:()=>now});
 await guard.run('smartthings','a',async()=>{calls++;guard.rateLimit('smartthings',30000);});
 assert.equal((await guard.run('smartthings','b',async()=>calls++)).reason,'rate_limited');
 assert.equal(calls,1);
 now+=30001;
 assert.equal((await guard.run('smartthings','b',async()=>calls++)).accepted,true);
 assert.equal(calls,2);
});
test('failure releases lock, but cooldown protects from immediate replay',async()=>{
 let now=5000;const guard=new CommandGuard({now:()=>now});
 await assert.rejects(guard.run('smartthings','a',async()=>{throw Error('timeout');}),/timeout/);
 assert.equal((await guard.run('smartthings','a',async()=>{})).reason,'cooldown');
 now+=1201;assert.equal((await guard.run('smartthings','a',async()=>{})).accepted,true);
});
test('confirmation stops on first confirmed state, no needless polling',async()=>{
 let calls=0;
 const logs=[];
 const confirmed=await confirmState({provider:'smartthings',entityId:'a',expected:'on',
 refresh:async()=>{calls++;},read:()=>({state:calls>=2?'on':'off'}),
 sleep:async()=>{},log:(a,b)=>logs.push({a,b})});
 assert.equal(confirmed,true);assert.equal(calls,2);
 assert.equal(logs.at(-1).a,'state_confirmed');
});
test('confirmation is bounded and stops on rate limit',async()=>{
 let calls=0;
 const done=await confirmState({provider:'smartthings',entityId:'a',expected:'on',
 refresh:async()=>{calls++;throw Error('429 rate limit');},
 read:()=>null,sleep:async()=>{}});
 assert.equal(done,false);assert.equal(calls,1);
});
test('confirmation gives up after finite number of checks',async()=>{
 let calls=0;
 const done=await confirmState({provider:'smartthings',entityId:'a',expected:'on',
 refresh:async()=>{calls++;},read:()=>({state:'off'}),sleep:async()=>{},delays:[0,0,0]});
 assert.equal(done,false);assert.equal(calls,3);
});
