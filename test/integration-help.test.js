import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const base='com.ulanzi.smarthomepro.ulanziPlugin/property-inspector';
const read=p=>readFileSync(join(base,p),'utf8');
const providers=['home-assistant','smartthings','tuya'];
test('each integration has an offline HTML help page with steps and official resources',()=>{
 for(const provider of providers){
  const html=read('help/'+provider+'.html');
  assert.match(html,/<html lang="pt-BR">/);
  assert.match(html,/<ol>.*<li>/s);
  assert.match(html,/https:\/\//);
  assert.doesNotMatch(html,/secret=|access_token=/i);
 }
});
test('provider inspector opens fixed hosted HTTPS guides',()=>{
 const ui=read('provider/inspector.html');
 const js=read('provider/provider.js');
 for(const id of ['setup-guide','official-portal']){
  assert.ok(ui.includes('id="'+id+'"'));
  assert.ok(js.includes("get('"+id+"').addEventListener"));
 }
 for(const guide of ['HOME_ASSISTANT','SMARTTHINGS','TUYA_SMART_LIFE']){
  assert.ok(js.includes('/blob/develop/docs/setup/'+guide+'.md'));
  const md=readFileSync('docs/setup/'+guide+'.md','utf8');
  assert.ok(md.includes('## Passo a passo'));
 }
 assert.ok(js.includes('$UD.openUrl(hostedGuides[providerId],false)'));
 assert.ok(js.includes('$UD.openUrl(officialPortals[providerId],false)'));
 assert.ok(!js.includes('localGuides'));
});
test('package includes bundled help because it is in allowed Property Inspector tree',()=>{
 const pack=readFileSync('scripts/package.mjs','utf8');
 assert.match(pack,/['"]property-inspector['"]/);
});
