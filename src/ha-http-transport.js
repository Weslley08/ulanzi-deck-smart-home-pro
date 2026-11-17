// Cleartext LAN REST transport. No fetch redirects, ambient proxy, DNS lookup
// after approval, connection pooling or cross-origin Authorization forwarding.
import {request as httpRequest} from 'node:http';

export async function pinnedHaHttpRequest({origin,path,token,method='GET',body,policy,ip,timeoutMs=10000}){
 if(!policy?.isHttp||typeof ip!=='string')throw new Error('Pinned HTTP policy required');
 if(!/^\/api\/(?:states|services\/[a-z_]+\/[a-z_]+)$/.test(path))
  throw new Error('Unsupported Home Assistant REST path');
 const payload=body===undefined?null:String(body);
 if(payload!==null&&Buffer.byteLength(payload)>256*1024)throw new Error('Home Assistant request too large');
 const url=new URL(path,origin);
 return new Promise((resolve,reject)=>{
  let finished=false;
  const finish=(error,value)=>{
   if(finished)return;
   finished=true;
   if(error)reject(error);else resolve(value);
  };
  const req=httpRequest(url,{
   method,agent:false,timeout:timeoutMs,lookup:policy.lookupFor(ip),
   headers:{
    Authorization:'Bearer '+token,'Content-Type':'application/json',
    Accept:'application/json',
    Connection:'close',
    ...(payload!==null?{'Content-Length':Buffer.byteLength(payload)}:{})
   }
  },res=>{
   const chunks=[];let size=0;
   res.on('data',chunk=>{
    size+=chunk.length;
    if(size>2*1024*1024){req.destroy(new Error('Home Assistant response too large'));return;}
    chunks.push(chunk);
   });
   res.on('end',()=>{
    if(finished)return;
    // 3xx is an error, NEVER followed. Token cannot cross origins.
    if(res.statusCode<200||res.statusCode>=300){
     finish(new Error('Home Assistant request failed (HTTP '+res.statusCode+')'));return;
    }
    if(res.statusCode===204){finish(null,null);return;}
    try{finish(null,JSON.parse(Buffer.concat(chunks).toString('utf8')));}
    catch{finish(new Error('Invalid Home Assistant JSON response'));}
   });
  });
  req.on('socket',socket=>{
   socket.once('connect',()=>{
    try{policy.verifyPeer(socket.remoteAddress,ip);}
    catch(error){req.destroy(error);}
   });
  });
  req.on('error',error=>finish(error));
  req.on('timeout',()=>req.destroy(new Error('Home Assistant connection timed out')));
  req.end(payload??undefined);
 });
}
