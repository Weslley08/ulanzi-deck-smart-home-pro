// DPAPI CurrentUser-backed provider credentials for Windows.
// Tokens never enter command-line arguments, npm logs, Ulanzi saved settings
// or URLs. Stored ciphertext cannot be decrypted by another Windows account.
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,rm,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';

const PROVIDERS=new Set(['home-assistant','smartthings','tuya','hue','shelly']);
const root=join(process.env.LOCALAPPDATA||join(homedir(),'AppData','Local'),'Ulanzi','SmartHomePRO','credentials');
const MAX_SIZE=16384;
const commands={
 protect:`$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
$raw=[Console]::In.ReadToEnd()
$data=[System.Text.Encoding]::UTF8.GetBytes($raw)
$out=[System.Security.Cryptography.ProtectedData]::Protect($data,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
[Console]::Out.Write([Convert]::ToBase64String($out))`,
 unprotect:`Add-Type -AssemblyName System.Security
$ErrorActionPreference='Stop'
$raw=[Console]::In.ReadToEnd()
$data=[Convert]::FromBase64String($raw.Trim())
$out=[System.Security.Cryptography.ProtectedData]::Unprotect($data,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
[Console]::Out.Write([System.Text.Encoding]::UTF8.GetString($out))`
};
function location(provider){
 if(!PROVIDERS.has(provider))throw new Error('Unsupported credential provider');
 return join(root,provider+'.dpapi');
}
function dpapi(mode,input){
 if(process.platform!=='win32')throw new Error('Protected credential storage is available on Windows only');
 if(Buffer.byteLength(input)>MAX_SIZE)throw new Error('Credential payload is too large');
 return new Promise((resolve,reject)=>{
  const command=Buffer.from(commands[mode],'utf16le').toString('base64');
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',command],{
   windowsHide:true,stdio:['pipe','pipe','pipe']
  });
  let stdout='',settled=false;
  const timer=setTimeout(()=>{child.kill();finish(new Error('Credential protection timed out'));},12000);
  function finish(error,output){
   if(settled)return;settled=true;clearTimeout(timer);
   if(error)reject(error);else resolve(output);
  }
  child.stdout.setEncoding('utf8');
  child.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.length>MAX_SIZE*3)child.kill();});
  // Discard diagnostic stderr; PowerShell can disclose input in error messages.
  child.stderr.resume();
  child.on('error',()=>finish(new Error('Windows credential protection unavailable')));
  child.on('close',code=>code===0?finish(null,stdout.trim()):finish(new Error('Windows credential protection failed')));
  child.stdin.on('error',()=>{});
  child.stdin.end(input,'utf8');
 });
}
export async function saveCredentials(provider,credentials){
 if(!PROVIDERS.has(provider))throw new Error('Unsupported credential provider');
 const json=JSON.stringify(credentials);
 if(Buffer.byteLength(json)>MAX_SIZE)throw new Error('Credentials too large');
 const ciphertext=await dpapi('protect',json);
 await mkdir(root,{recursive:true,mode:0o700});
 const path=location(provider);
 const temporary=path+'.tmp';
 try{await writeFile(temporary,ciphertext,{encoding:'utf8',mode:0o600});await rename(temporary,path);}
 finally{await rm(temporary,{force:true}).catch(()=>{});}
}
export async function loadCredentials(provider){
 const path=location(provider);
 let ciphertext;
 try{ciphertext=await readFile(path,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const decrypted=await dpapi('unprotect',ciphertext);
 const result=JSON.parse(decrypted);
 if(!result||typeof result!=='object'||Array.isArray(result))throw new Error('Corrupted credential store');
 return result;
}
export async function clearCredentials(provider){await rm(location(provider),{force:true});}
