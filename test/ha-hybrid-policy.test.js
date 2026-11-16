import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once,EventEmitter} from 'node:events';
import {readFileSync} from 'node:fs';
import {HaConnectionPolicy,HaPolicyError,validateHaUrl} from '../src/ha-connection-policy.js';
import {HomeAssistantProvider} from '../src/ha-provider.js';

const lookupOf=records=>async()=>records.map(address=>({address,family:address.includes(':')?6:4}));
const allow={allowInsecureLan:true};

test('HTTPS remains default; localhost works; private HTTP requires explicit consent',()=>{
 assert.equal(validateHaUrl('https://ha.example.com'),'https://ha.example.com');
 assert.equal(validateHaUrl('https://192.168.1.20:8123'),'https://192.168.1.20:8123');
 assert.equal(validateHaUrl('http://localhost:8123'),'http://localhost:8123');
 assert.equal(validateHaUrl('http://127.0.0.1:8123'),'http://127.0.0.1:8123');
 assert.equal(validateHaUrl('http://[::1]:8123'),'http://[::1]:8123');
 for(const ip of ['192.168.1.20','10.0.0.20','172.16.0.5','172.31.0.9']){
  assert.throws(()=>validateHaUrl('http://'+ip+':8123'),HaPolicyError);
  assert.equal(validateHaUrl('http://'+ip+':8123,allow),'http://'+ip+':8123');
 }
 for(const input of [
  'http://site-publico.com','http://example.com','http://8.8.8.8:8123',
  'http://169.254.1.1','http://100.100.100.100','http://192.0.2.2',
  'http://[fc00::1]:8123','http://homeassistant.local.evil.com:8123',
  'http://localhost.evil.com:8123','ftp://192.168.1.20:8123',
  'http://user:pass@192.168.1.20:8123','http://192.168.1.20:8123/path',
  'http://192.168.1.20:8123/?token=secret','http://192.168.1.20:8123/#frag'
 ])assert.throws(()=>validateHaUrl(input,allow),input);
});
test('.local must resolve exclusively to LAN IPs; bound IP survives only while DNS is stable',async()=>{
 let values=['192.168.1.21'];
 const dnsLookup=async()=>values.map(address=>({address,family:4}));
 const p=new HaConnectionPolicy({url:'http://homeassistant.local:8123',allowInsecureLan:true,dnsLookup});
 assert.equal(await p.resolvePeer(),'192.168.1.21');
 assert.deepEqual(p.getApproval(),{
  approvedIp:'192.168.1.21',approvedOrigin:'http://homeassistant.local:8123',
  insecureLanConsent:true
 });
 const restored=new HaConnectionPolicy({url:p.origin,allowInsecureLan:true,
  approvedIp:p.approvedIp,approvedOrigin:p.origin,dnsLookup});
 assert.equal(await restored.resolvePeer(),'192.168.1.21');
 values=['192.168.1.22'];
 await assert.rejects(restored.resolvePeer(),/DNS destination changed/);
 values=['192.168.1.21','8.8.8.8'];
 await assert.rejects(restored.resolvePeer(),/outside the authorized local network/);
 values=['192.168.1.21'];
 assert.equal(await restored.resolvePeer(),'192.168.1.21');
 assert.throws(()=>new HaConnectionPolicy({url:'http://homeassistant.local:8123',allowInsecureLan:true,
  approvedIp:'192.168.1.21',approvedOrigin:'http://other.local:8123'}),/URL has changed/);
});
test('localhost poisoned DNS cannot redirect requests to public or private hosts',async()=>{
 for(const target of ['8.8.8.8','192.168.1.20']){
  const policy=new HaConnectionPolicy({url:'http://localhost:8123',dnsLookup:lookupOf([target])});
  await assert.rejects(policy.resolvePeer(),/outside the authorized local network/);
 }
 const policy=new HaConnectionPolicy({url:'http://localhost:8123',dnsLookup:lookupOf(['127.0.0.1','::1'])});
 assert.equal(await policy.resolvePeer(),'127.0.0.1');
 const options=policy.lookupFor(policy.approvedIp);
 await new Promise((resolve,reject)=>options('localhost',{},(err,address,family)=>{
  try{assert.equal(err,null);assert.equal(address,'127.0.0.1');assert.equal(family,4);resolve();}catch(e){reject(e);}
 }));
 assert.throws(()=>policy.verifyPeer('8.8.8.8','127.0.0.1'),HaPolicyError);
});
test('HTTP REST uses a pinned socket with token, never follows redirects, and POST works',async(t)=>{
 let calls=[];let redirectHits=0;
 const redirect=createServer((_req,res)=>{redirectHits++;res.end('leaked');});
 await new Promise(resolve=>redirect.listen(0,'127.0.0.1',resolve));
 t.after(()=>redirect.close());
 const dest='http://127.0.0.1:'+redirect.address().port;
 const server=createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  calls.push({url:req.url,authorization:req.headers.authorization,method:req.method,body:Buffer.concat(chunks).toString()});
  if(req.url==='/api/states'){
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify([{entity_id:'light.test',state:'off',attributes:{}}]));return;
  }
  if(req.url==='/api/services/light/turn_on'){
   res.writeHead(204);res.end();return;
  }
  res.writeHead(302,{Location:dest+'/api/states'});res.end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>server.close());
 const p=new HomeAssistantProvider({url:'http://127.0.0.1:'+server.address().port,token:'PRIVATE_TOKEN'});
 assert.equal((await p.discoverDevices())[0].id,'light.test');
 await p.execute({entityId:'light.test',service:'turn_on'});
 await assert.rejects(p.request('/api/redirect'),/Unsupported Home Assistant REST path/);
 assert.deepEqual(calls.map(c=>c.method),['GET','POST']);
 assert(calls.every(c=>c.authorization==='Bearer PRIVATE_TOKEN'));
 assert.equal(redirectHits,0);
 p.close();
});
test('HTTP blocks 302 redirects before forwarding a bearer token',async t=>{
 let called=false;
 const server=createServer((_req,res)=>{called=true;res.writeHead(302,{Location:'http://8.8.8.8/api/states'});res.end();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>server.close());
 const p=new HomeAssistantProvider({url:'http://127.0.0.1:'+server.address().port,token:'secret'});
 await assert.rejects(p.discoverDevices(),/HTTP 302/);
 assert.equal(called,true);p.close();
});
test('HTTPS retains fetch with redirect:error; certificate and token failures reject',async()=>{
 const calls=[];
 const p=new HomeAssistantProvider({url:'https://ha.example',token:'private',fetchImpl:async(url,opts)=>{
  calls.push({url,opts});throw new Error('certificate verify failed');
 }});
 await assert.rejects(p.discoverDevices(),/certificate verify failed/);
 assert.equal(calls[0].opts.redirect,'error');
 assert.equal(calls[0].opts.headers.Authorization,'Bearer private');
 p.close();
 const p2=new HomeAssistantProvider({url:'https://ha.example',token:'invalid',
  fetchImpl:async()=>({ok:false,status:401})});
 await assert.rejects(p2.discoverDevices(),/HTTP 401/);
 p2.close();
});

class FakeSocket extends EventEmitter{
 static sockets=[];
 constructor(url,options){super();this.url=url;this.options=options;this._socket={remoteAddress:'192.168.1.40'};this.readyState=1;this.sent=[];FakeSocket.sockets.push(this);}
 send(msg){this.sent.push(JSON.parse(msg));}
 close(){this.readyState=3;this.emit('close');}
 terminate(){this.close();}
 receive(obj){this.emit('message',JSON.stringify(obj));}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('HTTP WebSocket resolves/pins the approved IP and never sends token to mismatched peer',async()=>{
 FakeSocket.sockets=[];const errors=[];
 const policyDns=lookupOf(['192.168.1.40']);
 const p=new HomeAssistantProvider({
  url:'http://homeassistant.local:8123',token:'DO_NOT_LEAK',allowInsecureLan:true,
  dnsLookup:policyDns,WebSocketImpl:FakeSocket,onSecurityError:s=>errors.push(s),
  httpRequestImpl:async()=>[]
 });
 await p.discoverDevices();
 p.connect();await tick();
 const socket=FakeSocket.sockets.at(-1);
 assert.equal(socket.url,'ws://homeassistant.local:8123/api/websocket');
 assert.equal(socket.options.followRedirects,false);
 await new Promise((resolve,reject)=>socket.options.lookup('homeassistant.local',{},(err,ip,family)=>{
  try{assert.equal(err,null);assert.equal(ip,'192.168.1.40');assert.equal(family,4);resolve();}catch(e){reject(e);}
 }));
 socket.receive({type:'auth_required'});
 assert.deepEqual(socket.sent[0],{type:'auth',access_token:'DO_NOT_LEAK'});
 socket._socket.remoteAddress='8.8.8.8';
 socket.receive({type:'auth_required'});
 assert.equal(socket.sent.length,1);
 assert.equal(errors.length,1);assert.equal(p.policyBlocked,true);
 p.close();
});
test('WS reconnection revalidates DNS, blocks changed host and can be reauthorized with new provider',async()=>{
 FakeSocket.sockets=[];let ip='192.168.1.40';const errors=[];
 const dnsLookup=async()=>[{address:ip,family:4}];
 const create=()=>new HomeAssistantProvider({
  url:'http://homeassistant.local:8123',token:'secret',allowInsecureLan:true,dnsLookup,
  WebSocketImpl:FakeSocket,onSecurityError:e=>errors.push(e),
  httpRequestImpl:async()=>[]
 });
 const p=create();await p.discoverDevices();p.connect();await tick();
 const first=FakeSocket.sockets.at(-1);
 first.close();
 clearTimeout(p.timer);p.timer=null;
 ip='8.8.8.8';
 p.connect();await tick();
 assert.equal(FakeSocket.sockets.at(-1),first);
 assert.equal(p.policyBlocked,true);assert.equal(errors.length,1);
 p.close();
 ip='192.168.1.41';
 const approved=create();await approved.discoverDevices();
 assert.equal(approved.getConnectionApproval().approvedIp,ip);
 approved.close();
});
test('UI consent is not written to button settings; credentials and destination use protected storage',()=>{
 const inspector=readFileSync(new URL('../com.ulanzi.smarthomepro.ulanziPlugin/property-inspector/provider/provider.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../com.ulanzi.smarthomepro.ulanziPlugin/property-inspector/provider/inspector.html',import.meta.url),'utf8');
 const runtime=readFileSync(new URL('../src/runtime.js',import.meta.url),'utf8');
 assert.match(html,/id="ha-mode"/);assert.match(html,/id="ha-insecure-consent"/);
 assert.match(inspector,/values\.insecureLanConsent=isHttp&&consent/);
 assert.match(inspector,/get\('ha-insecure-consent'\)\.checked=false/);
 assert.match(runtime,/candidate\.getConnectionApproval\(\)/);
 assert.match(runtime,/await saveCredentials\(id,saved\)/);
 assert.doesNotMatch(inspector,/sendParamFromPlugin\([^;]*(insecureLanConsent|approvedIp)/);
});
