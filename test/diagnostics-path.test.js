import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {resolveLogDirectory,diagnosticPath,PLUGIN_ID} from '../src/diagnostics.js';

test('Windows Studio APPDATA resolves plugin-isolated directory',()=>{
 const appData=join('C:','Users','WESLL','AppData','Roaming');
 const target=join(appData,'Ulanzi','UlanziDeck','logs','com.ulanzi.smarthomepro.ulanziPlugin');
 assert.equal(resolveLogDirectory({appData,home:'ignored',platform:'win32'}),target);
 assert.equal(PLUGIN_ID,'com.ulanzi.smarthomepro.ulanziPlugin');
});
test('Windows fallback is the user Roaming folder, never LOCALAPPDATA',()=>{
 const home=join('C:','Users','WESLL');
 assert.equal(resolveLogDirectory({appData:'',home,platform:'win32'}),
 join(home,'AppData','Roaming','Ulanzi','UlanziDeck','logs',PLUGIN_ID));
 assert.equal(diagnosticPath,join(resolveLogDirectory(),'smart-home.jsonl'));
});
test('diagnostic logs preserve rotation and never contain raw credentials',()=>{
 const source=readFileSync(new URL('../src/diagnostics.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/process\.env\.LOCALAPPDATA/);
 assert.match(source,/MAX_BYTES=2\*1024\*1024/);
 assert.match(source,/file\+'\.previous'/);
 assert.match(source,/const SAFE_FIELDS=new Set/);
 assert.match(source,/appendFile\(file,line/);
});
