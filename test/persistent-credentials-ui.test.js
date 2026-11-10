import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('help buttons are full width in a single column, not cramped side by side',()=>{
 const ui=read('com.ulanzi.smarthomepro.ulanziPlugin/property-inspector/provider/inspector.html');
 assert.match(ui,/class="help-actions"/);
 assert.match(ui,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(ui,/white-space:normal/);
 assert.match(ui,/max-width:100%/);
});
test('remember option is explicit, tokens never persist to action settings',()=>{
 const ui=read('com.ulanzi.smarthomepro.ulanziPlugin/property-inspector/provider/inspector.html');
 const js=read('com.ulanzi.smarthomepro.ulanziPlugin/property-inspector/provider/provider.js');
 assert.match(ui,/id="remember-credentials"/);
 assert.match(js,/remember:get\('remember-credentials'\)\.checked/);
 assert.match(js,/sendParamFromPlugin\(state\.saved\)/);
 assert.doesNotMatch(js,/sendParamFromPlugin\([^;]*(token|secret|credentials)/);
 assert.ok(!js.includes('credentials:values});\n  clearCredentials()'));
 assert.match(js,/if\(p\.connected\)clearCredentials\(\)/);
});
test('store uses Windows DPAPI with CurrentUser and no secret in process arguments',()=>{
 const js=read('src/credential-store.js');
 assert.match(js,/DataProtectionScope\]::CurrentUser/);
 assert.match(js,/ProtectedData\]::Protect/);
 assert.match(js,/ProtectedData\]::Unprotect/);
 assert.match(js,/\.stdin\.end\(input/);
 assert.match(js,/NoProfile/);
 assert.match(js,/NonInteractive/);
 assert.doesNotMatch(js,/cmdkey|SETTINGS|setGlobalSettings/);
});
test('store only persists after successful provider discovery and removes on disconnect',()=>{
 const runtime=read('src/runtime.js');
 const discover=runtime.indexOf('const devices=await candidate.discoverDevices()');
 const store=runtime.indexOf('await saveCredentials(id,');
 assert.ok(discover>0&&store>discover);
 assert.match(runtime,/await loadCredentials\(id\)/);
 assert.match(runtime,/void clearCredentials\(id\)/);
 assert.match(runtime,/remember:payload\.remember===true/);
});
