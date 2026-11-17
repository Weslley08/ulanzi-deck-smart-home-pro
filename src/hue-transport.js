// Philips Hue Bridge V2 HTTPS transport. Require an explicit SHA-256 certificate
// fingerprint: trust Signify's documented Bridge CAs, then verify the leaf pin.
// The native TLS handshake must verify the peer before any credentials are sent.
import {request as httpsRequest} from 'node:https';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
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
// Public CA roots published for Hue Bridges, including the 2017 and 2025 roots.
// TLS validates the Signify certificate chain, then checks the user's leaf pin.
// The IP cannot be used for standard hostname verification, so we verify exact
// leaf identity with the approved SHA-256 fingerprint instead.
const hueBridgeAuthorities=readFileSync(new URL('./hue-bridge-ca.pem',import.meta.url),'utf8');
export function verifyHueBridgePeer(cert,fingerprint){
 const expected=normalizeFingerprint(fingerprint);
 if(!Buffer.isBuffer(cert?.raw)){
  const e=new Error('Hue Bridge TLS certificate missing');
  e.code='PIN_MISMATCH';return e;
 }
 const actual=createHash('sha256').update(cert.raw).digest('hex');
 if(actual!==expected){
  const e=new Error('Hue Bridge TLS fingerprint does not match approved certificate');
  e.code='PIN_MISMATCH';return e;
 }
 return undefined; // checkServerIdentity contract: undefined means verified
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
   hostname:ip,port:443,path,method,agent:false,rejectUnauthorized:true,
   ca:hueBridgeAuthorities,
   checkServerIdentity:(_hostname,certificate)=>verifyHueBridgePeer(certificate,pin),
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
  // Node.js completes CA/chain and pin verification before transmitting HTTP
  // request headers or body. No plaintext or unverified-TLS credentials are sent.
  req.end(payload??undefined);
 });
}
