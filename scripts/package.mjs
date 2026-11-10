import {cp,mkdir,readdir,readFile,stat,writeFile} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createZip} from './lib/zip.mjs';
const root=resolve('.');
const folder='com.ulanzi.smarthomepro.ulanziPlugin', base=join(root,folder);
const allow=['manifest.json','package.json','plugin','property-inspector','libs','resources','src','node_modules'];
const files=[];
async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){
 const full=join(path,entry.name);
 if(entry.isDirectory()) await walk(full);
 else if(entry.isFile()){
  const rel=relative(base,full).replaceAll('\\','/');
  if(/(^|\/)(\.env|\.git|test|docs|scripts|\.npmrc)(\/|$)/.test(rel) || /\.(map|log)$/.test(rel))continue;
  if(/\.(exe|dll|node|so|dylib)$/.test(rel))throw new Error('Native binary not permitted: '+rel);
  files.push({name:folder+'/'+rel,data:await readFile(full)});
 }
}}
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build:plugin'],{cwd:root,stdio:'inherit'});
for(const name of allow){
 const full=join(base,name);
 const s=await stat(full).catch(()=>null);
 if(!s)throw new Error('Package is missing '+name);
 if(s.isDirectory())await walk(full);
 else files.push({name:folder+'/'+name,data:await readFile(full)});
}
await mkdir(join(root,'dist'),{recursive:true});
const zip=createZip(files);
if(zip.length>50*1024*1024)throw new Error('Package exceeds 50MB');
await writeFile(join(root,'dist',folder+'.zip'),zip);
console.log('Packaged '+files.length+' files in '+(zip.length/1048576).toFixed(2)+' MB.');
