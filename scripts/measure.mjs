// A deterministic baseline of module startup cost, not a measurement of a live device.
import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['--eval',"import('./src/ha-provider.js').then(()=>import('./src/smartthings-provider.js')).then(()=>import('./src/tuya-provider.js'))"],{cwd:process.cwd(),encoding:'utf8',timeout:10000});
if(result.error)throw result.error;
if(result.status!==0)throw new Error(result.stderr||'Provider imports failed');
const usage=process.memoryUsage();
console.log(JSON.stringify({scenario:'provider module import (mock only)',rssMb:Number((usage.rss/1048576).toFixed(2)),cpuTime:'not measured',realDevice:false}));
