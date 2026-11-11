import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertPrivateIPv4,normalizeFingerprint} from '../src/hue-transport.js';
import {HueProvider} from '../src/hue-provider.js';
import {ShellyProvider,createDigestHeader} from '../src/shelly-provider.js';
const UUID='123e4567-e89b-12d3-a456-426614174000';
const PIN='a'.repeat(64);

test('LAN validation rejects public, loopback, hostnames and malformed IP addresses',()=>{
 for(const ip of ['8.8.8.8','127.0.0.1','169.254.1.1','my-router.local','192.168.1.999','::1']){
  assert.throws(()=>assertPrivateIPv4(ip));
 }
 for(const ip of ['10.0.0.1','172.16.1.2','172.31.8.9','192.168.1.1'])
  assert.equal(assertPrivateIPv4(ip),ip);
 assert.equal(normalizeFingerprint('AA:'.repeat(31)+'AA'),'aa'.repeat(32));
});

test('Hue discovers lamps, sends on/off, and only updates state after subsequent read',async()=>{
 const calls=[];let physicalOn=false;
 const requestImpl=async x=>{
  calls.push(x);
  if(x.method==='PUT'){assert.deepEqual(x.body,{on:{on:true}});physicalOn=true;return {data:[],errors:[]};}
  return {data:[{id:UUID,metadata:{name:'Desk lamp'},on:{on:physicalOn}}],errors:[]};
 };
 const hue=new HueProvider({bridgeIp:'192.168.1.20',applicationKey:'abcdef1234567890',tlsFingerprint:PIN,requestImpl});
 const devices=await hue.discoverDevices();
 assert.equal(devices.length,1);assert.equal(devices[0].name,'Desk lamp');
 assert.equal(hue.getState(UUID).state,'off');
 const events=[];hue.subscribe(s=>events.push(s));
 assert.deepEqual(await hue.execute({entityId:UUID,service:'turn_on'}),{accepted:true,confirmed:false});
 assert.equal(hue.getState(UUID).state,'off'); // POST/PUT alone cannot claim success
 await hue.refreshState(UUID);
 assert.equal(hue.getState(UUID).state,'on');
 assert.equal(events.length,1);
 assert.equal(calls[1].path,'/clip/v2/resource/light/'+UUID);
 assert.throws(()=>hue.execute({entityId:'not-a-lamp',service:'turn_on'})); // sync validation
 hue.close();
});

test('Shelly Gen2+ controls one switch and confirms status after command',async()=>{
 let on=false;const methods=[];
 const fetchImpl=async (_url,opts)=>{
  const {method,params}=JSON.parse(opts.body);methods.push(method);
  let result;
  if(method==='Shelly.GetDeviceInfo')result={gen:2,id:'shellyplus1',name:'Office'};
  else if(method==='Shelly.GetStatus')result={'switch:0':{output:on}};
  else if(method==='Switch.GetStatus')result={id:params.id,output:on};
  else if(method==='Switch.Set'){on=params.on;result={was_on:!on};}
  return {ok:true,status:200,json:async()=>({result})};
 };
 const shelly=new ShellyProvider({ip:'192.168.1.30',fetchImpl});
 assert.equal((await shelly.discoverDevices())[0].id,'0');
 assert.equal(shelly.getState('0').state,'off');
 await shelly.execute({entityId:'0',service:'turn_on'});
 assert.equal(shelly.getState('0').state,'off');
 await shelly.refreshState('0');
 assert.equal(shelly.getState('0').state,'on');
 assert.deepEqual(methods,['Shelly.GetDeviceInfo','Shelly.GetStatus','Switch.Set','Switch.GetStatus']);
 shelly.close();
});

test('Shelly SHA-256 digest is deterministic without exposing a password in URI',()=>{
 const challenge='Digest qop="auth", realm="shellyplus1-abcd", nonce="abcd1234", algorithm=SHA-256';
 const auth=createDigestHeader(challenge,'local-secret',{cnonce:'1234567890abcdef'});
 assert.match(auth,/algorithm=SHA-256/);
 assert.match(auth,/uri="\/rpc"/);
 assert.match(auth,/response="[a-f0-9]{64}"/);
 assert.doesNotMatch(auth,/local-secret/);
 assert.throws(()=>createDigestHeader('Basic realm="router"','password'));
});

test('Shelly rejects missing password on a protected device rather than bypassing auth',async()=>{
 const protectedFetch=async()=>({status:401,ok:false,headers:{get:()=> 'Digest realm="shelly",nonce="abcd",qop="auth",algorithm=SHA-256'}});
 const shelly=new ShellyProvider({ip:'10.0.0.7',fetchImpl:protectedFetch});
 await assert.rejects(shelly.discoverDevices(),/authentication required/);
});

test('Studio action manifest exposes Hue and Shelly but not Xiaomi, Alexa or Google direct actions',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../com.ulanzi.smarthomepro.ulanziPlugin/manifest.json',import.meta.url),'utf8'));
 const ids=manifest.Actions.map(a=>a.UUID);
 assert(ids.includes(manifest.UUID+'.hue'));
 assert(ids.includes(manifest.UUID+'.shelly'));
 for(const p of ['xiaomi','alexa','google'])assert(!ids.some(x=>x.endsWith('.'+p)));
});
