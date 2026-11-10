import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('provider actions appear independently and legacy action remains',()=>{
 const manifest=JSON.parse(text('com.ulanzi.smarthomepro.ulanziPlugin/manifest.json'));
 const uuids=manifest.Actions.map(a=>a.UUID);
 for(const suffix of ['device','home-assistant','smartthings','tuya']){
  assert.ok(uuids.includes('com.ulanzi.smarthomepro.ulanziPlugin.'+suffix));
 }
 for(const action of manifest.Actions.filter(a=>a.UUID.endsWith('.home-assistant')||a.UUID.endsWith('.smartthings')||a.UUID.endsWith('.tuya')))
  assert.equal(action.PropertyInspectorPath,'property-inspector/provider/inspector.html');
});
test('credential fields are sent only through transient channel, not saved settings',()=>{
 const inspector=text('com.ulanzi.smarthomepro.ulanziPlugin/property-inspector/provider/provider.js');
 assert.match(inspector,/sendToPlugin\(\{type:'authenticate',credentials:values\}\)/);
 assert.match(inspector,/sendParamFromPlugin\(state\.saved\)/);
 assert.doesNotMatch(inspector,/sendParamFromPlugin\([^)]*credentials/);
 assert.match(inspector,/Missing|Required:/);
});
test('runtime accepts preexisting environment, but never sends token back to inspector',()=>{
 const runtime=text('src/runtime.js');
 for(const key of ['HA_TOKEN','SMARTTHINGS_TOKEN','TUYA_CLIENT_SECRET'])assert.ok(runtime.includes(key));
 assert.match(runtime,/sessionConnections\.has\(id\)/);
 assert.match(runtime,/Connect your account before refreshing devices/);
 assert.doesNotMatch(runtime,/sendToPropertyInspector\([^;]*token/);
});
