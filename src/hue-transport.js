// Philips Hue Bridge V2 HTTPS transport. Require an explicit SHA-256 certificate
// fingerprint: Hue's Bridge certificate is not trusted by Node's default CA store.
// Authenticate the TLS peer BEFORE sending the application key or request body.
import {request as httpsRequest} from 'node:https';
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';

export function assertPrivateIPv4(ip){
 if(typeof ip!=='string'||isIP(ip)!==4)throw new Error('Enter a private IPv4 address');
 const a=ip.split('.').map(Number);
 if(!(a[0]===10||(a[0]===172&&a[1]>=16&&a[1]<=31)||(a[0]===192&&a[1]===168)))
  throw new Error('Only private LAN IPv4 addresses are allowed');
 return ip;
}
export function normalizeFingerprint(raw){
 if(typeof raw!=='string')throw new Error('Bridge certificate SHA-256 fingerprint required');
 const hex=raw.replaceAll(':','').toLowerCase();
 if(!/^[a-f0-9]{64}$/.test(hex))throw new Error('Invalid SHA-256 certificate fingerprint');
 return hex;
}
export async function hueRequest({ip,fingerprint,path,method='GET',appKey,body}){
 assertPrivateIPv4(ip);
 const pin=normalizeFingerprint(fingerprint);
 if(!/^\/(?:api|clip\/v2\/resource\/[a-z_]+(?:\/[a-f0-9-]{36})?)$/.test(path))
  throw new Error('Unsupported Hue API endpoint');
 const payload=body===undefined?null:JSON.stringify(body);
 return new Promise((resolve,reject)=>{
  let settled=false;
  const fail=e=>{if(!settled){settled=true;reject(new Error('Hue Bridge HTTPS request failed: '+(e?.code==='PIN_MISMATCH'?'certificate fingerprint mismatch':'check bridge, authorization and network')));}};
  const req=httpsRequest({
   hostname:ip,port:443,path,method,agent:false,rejectUnauthorized:false,
   timeout:6000,headers:{
    Accept:'application/json',
    ...(appKey?{'hue-application-key':appKey}:{}),
    ...(payload!==null?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{})
   }
  },res=>{
   const chunks=[];let total=0;
   res.on('data',chunk=>{
    total+=chunk.length;
    if(total>1024*1024){req.destroy(new Error('Hue response too large'));return;}
    chunks.push(chunk);
   });
   res.on('end',()=>{
    if(settled)return;
    if(res.statusCode<200||res.statusCode>299){fail(new Error('Hue HTTP '+res.statusCode));return;}
    let value;
    try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(new Error('Invalid Hue response'));return;}
    if(Array.isArray(value?.errors)&&value.errors.length){fail(new Error('Hue API errors'));return;}
    settled=true;resolve(value);
   });
  });
  req.on('error',fail);
  req.on('timeout',()=>req.destroy(new Error('Hue timeout')));
  req.on('socket',socket=>{
   socket.once('secureConnect',()=>{
    const cert=socket.getPeerCertificate(true);
    const actual=cert?.raw?createHash('sha256').update(cert.raw).digest('hex'):null;
    if(actual!==pin){const e=new Error('Certificate mismatch');e.code='PIN_MISMATCH';req.destroy(e);return;}
    // Nothing (including the application key) goes over TLS until pinned.
    req.end(payload??undefined);
   });
  });
 });
}
