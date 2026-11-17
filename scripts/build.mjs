import {cp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve('.');
const dir=join(root,'com.ulanzi.smarthomepro.ulanziPlugin');
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
await rm(join(dir,'src'),{recursive:true,force:true});
await cp(join(root,'src'),join(dir,'src'),{recursive:true});
await writeFile(join(dir,'plugin/app.js'),"import '../src/runtime.js';\n");
await writeFile(join(dir,'package.json'),JSON.stringify({
 name:'smart-home-pro-runtime',version:pkg.version,type:'module',
 private:true,engines:pkg.engines,dependencies:pkg.dependencies
},null,2)+'\n');
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['ci','--omit=dev','--ignore-scripts','--no-audit'],{cwd:dir,stdio:'inherit'});
process.stdout.write('Built plugin folder: '+dir+'\n');
