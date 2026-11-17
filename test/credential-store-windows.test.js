import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {saveCredentials,loadCredentials,clearCredentials} from '../src/credential-store.js';

test('Windows DPAPI encrypts, persists and removes secret for current user',{skip:process.platform!=='win32'},async()=>{
 const provider='smartthings';
 const token='synthetic-test-token-'+Date.now();
 const path=join(process.env.LOCALAPPDATA||join(homedir(),'AppData','Local'),'Ulanzi','SmartHomePRO','credentials',provider+'.dpapi');
 try{
  await clearCredentials(provider);
  await saveCredentials(provider,{token});
  const raw=await readFile(path,'utf8');
  assert.ok(!raw.includes(token),'credential is not stored in plaintext');
  const decrypted=await loadCredentials(provider);
  assert.deepEqual(decrypted,{token});
 }finally{
  await clearCredentials(provider);
 }
 assert.equal(await loadCredentials(provider),null);
});
