import {fileURLToPath} from 'node:url';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(fileURLToPath(new URL('../apps/web/',import.meta.url)),true,{info(){},error(){}});
const {tickGoals,goalPool}=await import('../apps/web/lib/goal-engine.ts');
let stopped=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;});
console.log('Goals worker started; checks every 60 seconds. In-app notifications only.');
while(!stopped){try{const result=await tickGoals();if(result.processed)console.log(`Goals: processed ${result.processed} due check-ins.`);}catch{console.error('Goals tick failed; retrying next minute.');}if(!stopped)await new Promise(resolve=>setTimeout(resolve,60000));}
await goalPool().end();
