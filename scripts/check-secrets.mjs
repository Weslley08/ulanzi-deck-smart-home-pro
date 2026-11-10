import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {readZip} from './lib/zip.mjs';
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bgh[pousr]_[a-zA-Z0-9]{30,}\b/,/\bAKIA[0-9A-Z]{16}\b/];
const findings=[];
function scan(path,bytes){if(/\.(?:png|gif|jpg|jpeg|woff2?|ico|zip)$/.test(path))return;
 const s=bytes.toString('utf8');for(const pat of patterns)if(pat.test(s))findings.push(path+': known secret pattern');
}
for(const f of files)if(existsSync(f))scan(f,readFileSync(f));
const path='dist/com.ulanzi.smarthomepro.ulanziPlugin.zip';
if(existsSync(path))for(const [name,bytes] of readZip(readFileSync(path)))scan(name,bytes);
if(findings.length){findings.forEach(x=>console.error(x));process.exitCode=1;}
else console.log('No known hardcoded secret patterns in '+files.length+' tracked files and package.');
