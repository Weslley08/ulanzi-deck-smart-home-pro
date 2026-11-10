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
test('provider inspector exposes help and opens fixed paths with Ulanzi SDK',()=>{
 const ui=read('provider/inspector.html');
 const js=read('provider/provider.js');
 for(const id of ['setup-guide','official-portal']){
  assert.match(ui,new RegExp('id="'+id+'"'));
  assert.match(js,new RegExp("get\\('"+id+"'\\)\\.addEventListener"));
 }
 for(const provider of providers)assert.ok(js.includes('./property-inspector/help/'+provider+'.html'));
 assert.match(js,/\$UD\.openUrl\(localGuides\[providerId\],true\)/);
 assert.match(js,/\$UD\.openUrl\(officialPortals\[providerId\],false\)/);
});
test('package includes bundled help because it is in allowed Property Inspector tree',()=>{
 const pack=readFileSync('scripts/package.mjs','utf8');
 assert.match(pack,/['"]property-inspector['"]/);
});
