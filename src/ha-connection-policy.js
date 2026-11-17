// Central Home Assistant transport policy: HTTPS by default, opt-in HTTP LAN.
// For cleartext hosts, DNS is checked for every new connection and the actual
// socket is pinned to the approved IP (not merely preflight-resolved).
import {lookup as systemLookup} from 'node:dns/promises';
import {isIP} from 'node:net';

export class HaPolicyError extends Error {
 constructor(message){super(message);this.name='HaPolicyError';}
}
export const isHaPolicyError=error=>error instanceof HaPolicyError;
const deny=message=>{throw new HaPolicyError(message);};
const unbracket=host=>host.startsWith('[')&&host.endsWith(']')?host.slice(1,-1):host;
const loopback=ip=>ip==='127.0.0.1'||ip==='::1';
export function isPrivateLanIp(ip){
 if(isIP(ip)!==4)return false;
 const [a,b]=ip.split('.').map(Number);
 return a===10||(a===172&&b>=16&&b<=31)||(a===192&&b===168);
}
export function validateHaUrl(raw,{allowInsecureLan=false}={}){
 let u;
 try{u=new URL(raw);}catch{deny('Invalid Home Assistant URL');}
 if(!['http:','https:'].includes(u.protocol)||!u.hostname||
   u.username||u.password||u.search||u.hash||(u.pathname&&u.pathname!=='/')||
   (u.port&&(!Number.isInteger(Number(u.port))||Number(u.port)<1||Number(u.port)>65535)))
  deny('Use only the Home Assistant server origin, without credentials, path, query or fragment');
 const host=unbracket(u.hostname);
 if(u.protocol==='http:'){
  if(loopback(host)||host==='localhost')return u.origin;
  if(!allowInsecureLan)deny('HTTP LAN requires explicit authorization in the Home Assistant settings');
  if(isIP(host)){
   if(!isPrivateLanIp(host))deny('HTTP is only allowed to private LAN or loopback addresses');
  }else if(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+local$/.test(host)){
   deny('HTTP hostnames must end in .local; public domains are forbidden');
  }
 }
 return u.origin;
}
export class HaConnectionPolicy {
 constructor({url,allowInsecureLan=false,approvedIp=null,approvedOrigin=null,dnsLookup=systemLookup}){
  this.origin=validateHaUrl(url,{allowInsecureLan});
  this.url=new URL(this.origin);
  this.host=unbracket(this.url.hostname);
  this.isHttp=this.url.protocol==='http:';
  this.needsConsent=this.isHttp&&!loopback(this.host)&&this.host!=='localhost';
  this.dnsLookup=dnsLookup;
  this.approvedIp=approvedIp||null;
  if(this.approvedIp){
   if(!this.isHttp||!(isPrivateLanIp(this.approvedIp)||loopback(this.approvedIp)))
    deny('Invalid stored HTTP destination approval');
   if(approvedOrigin!==this.origin)deny('Home Assistant URL has changed; authorize this HTTP server again');
   if(this.needsConsent&&!isPrivateLanIp(this.approvedIp))deny('Invalid saved LAN approval');
   if(!this.needsConsent&&!loopback(this.approvedIp))deny('Invalid saved loopback approval');
   if(isIP(this.host)&&this.host!==this.approvedIp)deny('Stored HTTP destination does not match the URL');
  }else if(approvedOrigin){
   deny('Stored HTTP destination approval is incomplete');
  }
 }
 getApproval(){
  return this.isHttp&&this.approvedIp?
   {approvedIp:this.approvedIp,approvedOrigin:this.origin,insecureLanConsent:this.needsConsent}:
   null;
 }
 async resolvePeer(){
  if(!this.isHttp)return null; // HTTPS: use native TLS validation and system DNS
  const host=this.host;
  if(isIP(host)){
   if(this.needsConsent&&!isPrivateLanIp(host))deny('HTTP destination is not a private LAN IP');
   if(!this.needsConsent&&!loopback(host))deny('Invalid loopback destination');
   if(this.approvedIp&&this.approvedIp!==host)deny('Approved Home Assistant destination changed');
   this.approvedIp=host;
   return host;
  }
  let records;
  try{
   records=await this.dnsLookup(host,{all:true,family:host==='localhost'?0:4});
  }catch{deny('Home Assistant local hostname could not be resolved');}
  if(!Array.isArray(records)||!records.length)deny('Home Assistant local hostname has no usable address');
  const acceptable=host==='localhost'?loopback:isPrivateLanIp;
  if(records.some(r=>!acceptable(r.address)))deny('Home Assistant hostname resolved outside the authorized local network');
  const ip=this.approvedIp||records[0].address;
  if(!records.some(r=>r.address===ip))deny('Home Assistant DNS destination changed; authorize the server again');
  this.approvedIp=ip;
  return ip;
 }
 lookupFor(ip){
  if(!ip||isIP(ip)===0)deny('Unverified Home Assistant connection destination');
  const family=isIP(ip);
  return (_hostname,options,callback)=>{
   if(options?.all)callback(null,[{address:ip,family}]);
   else callback(null,ip,family);
  };
 }
 verifyPeer(actual,expected){
  const normalize=value=>value?.startsWith('::ffff:')?value.slice(7):value;
  if(normalize(actual)!==normalize(expected))deny('Home Assistant connection peer is not the approved server');
 }
}
