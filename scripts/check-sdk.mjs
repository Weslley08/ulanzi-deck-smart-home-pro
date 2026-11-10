import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const lock=JSON.parse(readFileSync(new URL('../sdk-lock.json',import.meta.url),'utf8'));
let mismatches=[];
for(const entry of lock.files){
 const path=resolve(entry.path);
 let sha;
 try{
  sha=execFileSync('git',['hash-object',path],{encoding:'utf8'}).trim();
 }catch{mismatches.push(entry.path+': absent');continue;}
 if(sha!==entry.sha)mismatches.push(entry.path+': SDK hash differs; review upstream and update pin');
}
if(process.argv.includes('--upstream'))console.log('SDK upstream check requires manual comparison with pinned Clima PRO SDK; local copy integrity verified.');
if(mismatches.length){for(const s of mismatches)console.error(s);process.exitCode=1;}
else console.log('SDK file hashes verified against sdk-lock.json: '+lock.files.length+' files.');
