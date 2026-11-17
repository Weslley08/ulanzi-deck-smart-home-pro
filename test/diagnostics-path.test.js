import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {configureStudioLogger,record,PLUGIN_ID} from '../src/diagnostics.js';

test('uses the official host logger, with plugin UUID and no custom file writing',()=>{
 const diagnostics=readFileSync(new URL('../src/diagnostics.js',import.meta.url),'utf8');
 const runtime=readFileSync(new URL('../src/runtime.js',import.meta.url),'utf8');
 assert.equal(PLUGIN_ID,'com.ulanzi.smarthomepro.ulanziPlugin');
 assert.match(diagnostics,/host\.logMessage\(message,level\)/);
 assert.match(runtime,/configureStudioLogger\(host\)/);
 assert.doesNotMatch(diagnostics,/appendFile|writeFile|mkdir|rename|LOCALAPPDATA|APPDATA|\.jsonl|resolveLogDirectory/);
});
test('redacts secret-shaped fields and hashes device identifiers',()=>{
 const messages=[];
 configureStudioLogger({logMessage:(message,level)=>messages.push({message,level})},{now:()=>0});
 record('command_accepted',{provider:'smartthings',device:'private-device-123',
   token:'TOP_SECRET',secret:'SECRET_123',url:'https://private.example',
   elapsedMs:321,httpStatus:200});
 assert.equal(messages.length,1);
 const entry=JSON.parse(messages[0].message);
 assert.equal(entry.event,'command_accepted');
 assert.equal(entry.deviceHash.length,12);
 assert.equal(entry.elapsedMs,321);
 assert.equal(entry.provider,'smartthings');
 assert.doesNotMatch(messages[0].message,/private-device-123|TOP_SECRET|SECRET_123|private\.example|token|secret|url/i);
 assert.equal(messages[0].level,'info');
});
test('suppresses duplicates and records the count after the window',()=>{
 const messages=[];let time=100;
 configureStudioLogger({logMessage:(msg,level)=>messages.push({msg,level})},{now:()=>time});
 record('command_suppressed',{provider:'smartthings',device:'x',reason:'cooldown'});
 for(let i=0;i<50;i++)record('command_suppressed',{provider:'smartthings',device:'x',reason:'cooldown'});
 assert.equal(messages.length,1);
 time=60101;
 record('command_suppressed',{provider:'smartthings',device:'x',reason:'cooldown'});
 assert.equal(messages.length,3);
 assert.equal(JSON.parse(messages[2].msg).count,50);
 assert.equal(messages[0].level,'debug');
});
test('rejects unknown events and limits arbitrary or oversized user data',()=>{
 const messages=[];
 configureStudioLogger({logMessage:m=>messages.push(m)});
 record('secret_dump',{token:'DONT_LOG'});
 record('command_failed',{provider:'untrusted',device:'x'.repeat(10000),error:new Error('TOP_SECRET'),attempt:99999999});
 assert.equal(messages.length,1);
 assert.doesNotMatch(messages[0],/TOP_SECRET|DONT_LOG|untrusted|error/);
 assert.equal(JSON.parse(messages[0]).attempt,600000);
});
test('host logging failure never propagates to device commands',()=>{
 configureStudioLogger({logMessage:()=>{throw Error('host down')}});
 assert.doesNotThrow(()=>record('command_failed',{provider:'tuya'}));
});
