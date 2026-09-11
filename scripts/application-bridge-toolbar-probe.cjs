// Interactive isolated browser test. Click the extension action, then press Enter in this process.
const {chromium}=require('@playwright/test');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 let context,temp;
 const servers=[];
 try{
  const origins=[];
  for(let i=0;i<2;i++){
   const s=http.createServer((req,res)=>res.end('<title>Missa permission fixture</title><h1>Local permission test</h1><p>No personal information or submission.</p>'));
   await new Promise(r=>s.listen(0,'127.0.0.1',r));servers.push(s);origins.push(`http://127.0.0.1:${s.address().port}`);
  }
  temp=await fs.mkdtemp(path.join(os.tmpdir(),'missa-toolbar-'));const ext=path.join(temp,'ext');await fs.mkdir(ext);
  await fs.writeFile(path.join(ext,'manifest.json'),JSON.stringify({manifest_version:3,name:'Missa Permission Probe',version:'0.0.1',permissions:['scripting','activeTab'],action:{default_title:'Missa Permission Probe'},background:{service_worker:'worker.js'}}));
  await fs.writeFile(path.join(ext,'worker.js'),`chrome.action.onClicked.addListener(async tab=>{try{await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{document.title='Permission granted';document.querySelector('h1').textContent='User action granted access';}});}catch(e){console.error(e);}});`);
  context=await chromium.launchPersistentContext(path.join(temp,'profile'),{channel:'chromium',headless:false,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  const page=await context.newPage();await page.goto(origins[0]);await page.bringToFront();
  const probe=()=>worker.evaluate(async()=>{const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});try{return (await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>document.title}))[0].result;}catch(e){return 'DENIED';}});
  assert.equal(await probe(),'DENIED');
  console.log('READY: pre-invocation denied. Click Missa Permission Probe in the isolated Chromium Extensions menu.');
  await page.waitForFunction(()=>document.title==='Permission granted',{},{timeout:120000});
  assert.equal(await page.title(),'Permission granted');assert.equal(await probe(),'Permission granted');
  await page.goto(origins[0]+'/another-path');assert.equal(await probe(),'Missa permission fixture');
  await page.goto(origins[1]);assert.equal(await probe(),'DENIED');
  console.log(JSON.stringify({testedAt:new Date().toISOString(),results:['Before action: denied','Native toolbar action: access granted','Same-origin navigation: access retained','Different-origin navigation: access revoked'],scope:'Isolated headed Chromium, real toolbar invocation, two local origins, no personal Chrome profile or external destinations'},null,2));
 }finally{
  if(context)await context.close();for(const s of servers)await new Promise(r=>s.close(r));if(temp)await fs.rm(temp,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
