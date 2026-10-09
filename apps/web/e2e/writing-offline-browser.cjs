/** Run with MISSA_OFFLINE_TEST_URL pointing at a server built with build-writing-offline.mjs. */
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const https = require('node:https');
(async () => {
 const dir = await fs.mkdtemp('/tmp/missa-offline-browser-');
 let context = await chromium.launchPersistentContext(dir, {headless:true});
 const upstream = new URL(process.env.MISSA_OFFLINE_TEST_URL || 'http://localhost:3101');
 // Chromium's simulated offline layer can leave worker fetches online. A real
 // disconnected origin proves fallback without stopping the shared Next server.
 const proxy = http.createServer((request,response)=>{
  const target = new URL(request.url,upstream);
  const connection=(target.protocol==='https:'?https:http).request(target,{method:request.method,headers:{...request.headers,host:target.host}},remote=>{
   response.writeHead(remote.statusCode,remote.headers);remote.pipe(response);
  });
  connection.on('error',()=>{response.writeHead(502);response.end()});request.pipe(connection);
 });
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const base = `http://127.0.0.1:${proxy.address().port}`;
 const url=base+'/writing-offline/index.html#account=qa-one&project=project_1';
 const originalDoc={version:1,pageSize:'a4',typeface:'newsreader',textSize:12,pages:[{id:'page_3f852b762e324d44a4bc',kind:'flow',format:{align:'left',lineHeight:1.5,letterSpacing:0,margins:{top:20,right:20,bottom:20,left:20}},content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Keep this original',marks:[{type:'bold'}]}]},{type:'table',content:[{type:'tableRow',content:[{type:'tableCell',attrs:{colspan:1,rowspan:1,colwidth:null},content:[{type:'paragraph',content:[{type:'text',text:'Table text'}]}]}]}]}]}}]};
 originalDoc.pages[0].content.content.push({type:'image',attrs:{src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/WZkAAAAASUVORK5CYII=',alt:'A single pixel'}});
 try {
 let page = await context.newPage();
 await page.goto(url);
 await page.evaluate(async original => {
  localStorage.setItem('missa.write.offline.active.v1','qa-one');
  localStorage.setItem('missa.write.offline.v1:qa-one:project_1', JSON.stringify({version:1,accountKey:'qa-one',project:{id:'project_1',title:'Offline QA'},downloadedAt:new Date().toISOString(),entries:[{id:'writing_3f852b76-2e32-4d44-a4bc-845b4d51c2c0',projectId:'project_1',position:0,title:'Rich original',body:'Keep this original\nTable text',document:JSON.stringify(original),revision:4}]}));
  await navigator.serviceWorker.register('/writing-offline/sw.js',{scope:'/writing-offline/'});
  await navigator.serviceWorker.ready;
  const room = await navigator.serviceWorker.register('/writing-offline/sw.js',{scope:'/doc'});
  const worker = room.installing ?? room.waiting ?? room.active;
  if (worker.state !== 'activated') await new Promise((resolve,reject)=>worker.addEventListener('statechange',()=>{if(worker.state==='activated')resolve();if(worker.state==='redundant')reject(new Error('Room worker failed'));}));
 }, originalDoc);
 await context.close();
 proxy.closeAllConnections();
 await new Promise(resolve=>proxy.close(resolve));
 context = await chromium.launchPersistentContext(dir,{headless:true});
 await context.setOffline(true);
 page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/doc?entry=writing_3f852b76-2e32-4d44-a4bc-845b4d51c2c0');
 assert.equal(new URL(page.url()).pathname,'/doc');
 // Verify the restarted room has actually rendered before testing a second navigation.
 await page.getByRole('button',{name:'Rich original',exact:true}).waitFor();
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.goto(base+'/doc');
 await page.getByRole('button',{name:'Rich original',exact:true}).click();
 await page.getByRole('button',{name:'Edit a separate rich copy'}).click();
 const editor=page.locator('[contenteditable=true]').first();
 await editor.click();await editor.press('End');await editor.press('Enter');await editor.pressSequentially('New offline words');
 const state=await page.evaluate(()=>({snap:JSON.parse(localStorage.getItem('missa.write.offline.v1:qa-one:project_1')),drafts:JSON.parse(localStorage.getItem('missa.write.drafts.v1:qa-one')).drafts}));
 assert.deepEqual(JSON.parse(state.snap.entries[0].document),originalDoc);
 assert.equal(state.snap.entries[0].body,'Keep this original\nTable text');
 assert.match(state.drafts[0].content.body,/New offline words/);
 assert.notEqual(state.drafts[0].id,state.snap.entries[0].id);
 assert.equal(state.drafts[0].baseRevision,0);
 const rich=JSON.parse(state.drafts[0].content.document);
 assert.match(JSON.stringify(rich),/"table"/);
 assert.match(JSON.stringify(rich),/"bold"/);
 assert.match(JSON.stringify(rich),/data:image\/png;base64/);
 await page.getByRole('textbox',{name:'Piece title',exact:true}).fill('Renamed offline copy');
 await page.reload();
 await page.getByRole('button',{name:'Renamed offline copy',exact:true}).click();
 assert.match(await editor.textContent(),/New offline words/);
 await page.getByRole('textbox',{name:'Search offline pieces'}).fill('Renamed');
 assert.equal(await page.getByRole('button',{name:'Rich original',exact:true}).count(),0);
 await page.getByRole('textbox',{name:'Search offline pieces'}).fill('');
 await page.getByRole('button',{name:'New offline piece',exact:true}).click();
 await editor.click();await editor.pressSequentially('A new piece offline');
 // Storage failures retain the previous queue and expose a backup of live rich text.
 const beforeFailure=await page.evaluate(()=>localStorage.getItem('missa.write.drafts.v1:qa-one'));
 await page.evaluate(()=>{const original=Storage.prototype.setItem;window.restoreStorage=()=>{Storage.prototype.setItem=original};Storage.prototype.setItem=function(){throw new Error('Storage quota full')};});
 await editor.press('End');await editor.pressSequentially(' Unsaved after storage failure');
 assert.match(await page.getByRole('status').textContent(),/Download a backup/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('missa.write.drafts.v1:qa-one')),beforeFailure);
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Download device backup'}).click();
 const downloaded=await downloadEvent;const backup=JSON.parse(await fs.readFile(await downloaded.path(),'utf8'));
 assert.match(JSON.stringify(backup.inMemory.doc),/Unsaved after storage failure/);
 await page.evaluate(()=>window.restoreStorage());
 const cached=await page.evaluate(async()=>{const keys=await caches.keys();return (await Promise.all(keys.map(async key=>(await (await caches.open(key)).keys()).map(request=>new URL(request.url).pathname)))).flat()});
 assert.ok(cached.every(path=>path.startsWith('/writing-offline/')));
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth),true);
 await page.screenshot({path:'/tmp/missa-offline-rich-mobile.png'});
 await page.addScriptTag({content:await fs.readFile(require.resolve('axe-core'),'utf8')});
 const accessibility=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map(item=>({id:item.id,impact:item.impact,nodes:item.nodes.length}))});
 assert.deepEqual(accessibility,[]);
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(()=>document.documentElement.style.zoom='2');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.evaluate(()=>document.documentElement.style.zoom='1');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('textbox',{name:'Search offline pieces'}).focus();await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>document.activeElement.tagName),'BUTTON');
 await page.evaluate(()=>localStorage.setItem('missa.write.offline.active.v1','qa-two'));
 await page.reload();
 assert.match(await page.getByRole('status').textContent(),/from its account/);
 assert.equal(await page.getByRole('button',{name:'Rich original',exact:true}).count(),0);
 await page.evaluate(()=>localStorage.removeItem('missa.write.offline.active.v1'));
 await page.goto(base+'/doc');
 assert.equal(await page.getByRole('button',{name:'Rich original',exact:true}).count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS normal /doc browser restart offline rich edit, table/bold/image preserved, separate queued copy, rename/reload/search/create, storage failure backup, narrow cache, accessibility, 390px/200% reflow, keyboard/reduced motion, account isolation');
 } finally {proxy.closeAllConnections();proxy.close();await context.close();await fs.rm(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exit(1)});
