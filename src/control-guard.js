// Bounds REST work per physical device, not per deck button. One action is
// in flight per device; rapid repeats are dropped, never queued or replayed.
// POST requests are NEVER retried automatically.
export class CommandGuard {
 constructor({now=()=>Date.now(),cooldownMs=1200,log=()=>{}}={}){
  this.now=now;this.cooldownMs=cooldownMs;this.log=log;
  this.inFlight=new Set();this.last=new Map();this.blockedUntil=new Map();
 }
 async run(provider,device,operation){
  const key=provider+'|'+device,now=this.now();
  let reason=null;
  if(this.inFlight.has(key))reason='in_flight';
  else if(now<(this.blockedUntil.get(provider)||0))reason='rate_limited';
  else if(now-(this.last.get(key)??-Infinity)<this.cooldownMs)reason='cooldown';
  if(reason){this.log('command_suppressed',{provider,device,reason});return {accepted:false,reason};}
  this.inFlight.add(key);this.last.set(key,now);
  try{return {accepted:true,result:await operation()};}
  finally{this.inFlight.delete(key);}
 }
 rateLimit(provider,delayMs=30000){
  this.blockedUntil.set(provider,Math.max(this.blockedUntil.get(provider)||0,this.now()+delayMs));
  this.log('provider_rate_limited',{provider,delayMs});
 }
 close(){this.inFlight.clear();this.last.clear();this.blockedUntil.clear();}
}
export async function confirmState({provider,entityId,expected,refresh,read,log=()=>{},sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),delays=[450,900,1600,2500]}){
 const start=Date.now();
 for(let i=0;i<delays.length;i++){
  await sleep(delays[i]);
  try{
   await refresh(entityId);
   const observed=read(entityId)?.state;
   if(observed===expected){
    log('state_confirmed',{provider,device:entityId,attempt:i+1,elapsedMs:Date.now()-start});
    return true;
   }
  }catch(e){
   if(/rate limit|429/i.test(String(e?.message))){log('state_poll_rate_limited',{provider,device:entityId});return false;}
   log('state_poll_failed',{provider,device:entityId,attempt:i+1});
  }
 }
 log('state_confirmation_timeout',{provider,device:entityId,elapsedMs:Date.now()-start});
 return false;
}
