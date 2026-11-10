import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('catalog contains only provider actions with branded icons',()=>{
 const manifest=JSON.parse(text('com.ulanzi.smarthomepro.ulanziPlugin/manifest.json'));
 const uuids=manifest.Actions.map(a=>a.UUID);
 const providerIds=['home-assistant','smartthings','tuya'];
 assert.equal(manifest.Actions.length,3);
 assert.deepEqual(uuids,providerIds.map(id=>'com.ulanzi.smarthomepro.ulanziPlugin.'+id));
 for(const [index,action] of manifest.Actions.entries()){
  assert.equal(action.PropertyInspectorPath,'property-inspector/provider/inspector.html');
  assert.equal(action.Icon,'resources/brand-'+providerIds[index]+'.svg');
  assert.notEqual(action.Icon,manifest.Icon);
  const svg=text('com.ulanzi.smarthomepro.ulanziPlugin/'+action.Icon);
  assert.match(svg,/<svg\b/);
  assert.doesNotMatch(svg,/<script|onload=|<foreignObject/i);
 }
});
test('credential fields are sent only through transient channel, not saved settings',()=>{
 const inspector=text('com.ulanzi.smarthomepro.ulanziPlugin/property-inspector/provider/provider.js');
 assert.match(inspector,/sendToPlugin\(\{type:'authenticate',credentials:values,remember:get\('remember-credentials'\)\.checked\}\)/);
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
