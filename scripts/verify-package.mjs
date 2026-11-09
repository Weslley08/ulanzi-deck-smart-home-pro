import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {readZip} from './lib/zip.mjs';
const folder='com.ulanzi.smarthomepro.ulanziPlugin';
const zip=readZip(readFileSync(resolve('dist',folder+'.zip')));
const file=name=>zip.get(folder+'/'+name);
const check=(condition,msg)=>{if(!condition)throw new Error(msg);};
check(file('manifest.json'),'Missing manifest.json');
check(file('plugin/app.js'),'Missing runtime entrypoint');
check(file('src/runtime.js'),'Missing copied runtime implementation');
check(file('src/ha-provider.js'),'Missing Home Assistant adapter');
check(file('src/smartthings-provider.js'),'Missing SmartThings adapter');
check(file('src/tuya-provider.js'),'Missing Tuya adapter');
check(file('node_modules/ws/package.json'),'Missing ws runtime dependency');
const m=JSON.parse(file('manifest.json').toString('utf8'));
const pkg=JSON.parse(file('package.json').toString('utf8'));
check(m.Version===pkg.version,'Manifest and runtime version differ');
check(m.UUID===folder,'Plugin folder and UUID differ');
check(Boolean(file(m.CodePath)),'Manifest CodePath missing');
check(Boolean(file(m.Icon)),'Manifest icon missing');
check(Boolean(file(m.CategoryIcon)),'Category icon missing');
check(Array.isArray(m.Actions)&&m.Actions.length>0,'Missing actions');
for(const a of m.Actions){
 check(file(a.Icon),'Action icon missing: '+a.Icon);
 check(file(a.PropertyInspectorPath),'Inspector missing: '+a.PropertyInspectorPath);
 for(const s of a.States||[])check(file(s.Image),'State icon missing: '+s.Image);
}
for(const [name,data]of zip){
 check(name.startsWith(folder+'/')&&!name.includes('..'),'ZIP traversal');
 check(!/(^|\/)(\.env|\.git|\.npmrc|test|docs|scripts)(\/|$)/.test(name),'Forbidden content: '+name);
 check(!/\.(exe|dll|node|so|dylib)$/.test(name),'Native binary: '+name);
 check(data.length<30*1024*1024,'Entry too large: '+name);
}
check(zip.size>15,'Incomplete plugin zip');
console.log('ZIP structure verified: '+zip.size+' files (manifest, runtime, deps, inspector, assets). This does not verify hardware operation.');
