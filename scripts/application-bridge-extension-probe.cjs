// Isolated Manifest V3 extension experiment. Never installs in the user's Chrome profile.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');

function transfer(packet, expectedOrigin) {
  if(location.origin!==expectedOrigin)return 'wrong-origin';
  const specs=[['title','INPUT','Title'],['letter','TEXTAREA','Cover letter']];
  for(const [id,tag,label] of specs){
    const el=document.getElementById(id);
    if(!el||el.tagName!==tag||el.labels?.[0]?.textContent.trim()!==label)return 'mapping-changed';
    if(el.disabled||el.readOnly)return 'field-unavailable';
    if(typeof packet[id]!=='string')return 'invalid-packet';
    if(el.value&&el.value!==packet[id])return 'existing-answer';
    if(el.maxLength>=0&&packet[id].length>el.maxLength)return 'too-long';
  }
  for(const [id] of specs){
    const el=document.getElementById(id);
    el.value=packet[id];
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  return 'filled';
}

(async()=>{
  let context,temp;
  let fixtureDraft={title:'',letter:''};
  const server=http.createServer((req,res)=>{
    if(req.url==='/draft'){
      res.setHeader('Content-Type','application/json');
      if(req.method==='POST'){
        let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{fixtureDraft=JSON.parse(body);res.end(JSON.stringify(fixtureDraft));});
      }else res.end(JSON.stringify(fixtureDraft));
      return;
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    // No cooperating receiver, transfer code, or extension API in this destination.
    const fields='<label for="title">Title</label><input id="title" maxlength="300"><label id="letter-label" for="letter">Cover letter</label><textarea id="letter"></textarea><label><input id="declaration" type="checkbox">Declaration</label>';
    if(req.url==='/delayed')res.end(`<button id="reveal">Show questions</button><main></main><script>document.querySelector('#reveal').onclick=()=>document.querySelector('main').innerHTML=${JSON.stringify(fields)};</script>`);
    else if(req.url==='/controlled')res.end(fields+`<button id="render">Render from saved editor state</button><button id="save">Save fixture draft</button><p id="save-status"></p><script>
// Synthetic editor that accepts trusted input only. Not a React simulation/certification.
const model={title:'',letter:''};
for(const id of ['title','letter'])document.getElementById(id).addEventListener('input',e=>{if(e.isTrusted)model[id]=e.target.value;});
document.getElementById('render').onclick=()=>{for(const id of ['title','letter'])document.getElementById(id).value=model[id];};
document.getElementById('save').onclick=async()=>{await fetch('/draft',{method:'POST',body:JSON.stringify(model)});document.getElementById('save-status').textContent='saved';};
fetch('/draft').then(r=>r.json()).then(saved=>{Object.assign(model,saved);document.getElementById('render').click();document.body.dataset.ready='yes';});
</script>`);
    else res.end(fields);
  });
  const results=[];
  try{
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const origin=`http://127.0.0.1:${server.address().port}`;
    const packet={title:'Synthetic work',letter:'Fictional creator Adé\n\n    Indented line — retained.'};
    temp=await fs.mkdtemp(path.join(os.tmpdir(),'missa-extension-probe-'));
    const extension=path.join(temp,'extension');await fs.mkdir(extension);
    await fs.writeFile(path.join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Missa local experiment',version:'0.0.1',permissions:['scripting'],host_permissions:['http://127.0.0.1/*'],background:{service_worker:'worker.js'},action:{default_popup:'popup.html'}}));
    await fs.writeFile(path.join(extension,'worker.js'),'chrome.runtime.onInstalled.addListener(()=>{});');
    await fs.writeFile(path.join(extension,'popup.html'),'<meta charset="utf-8"><button id="fill">Transfer synthetic text</button><p id="result" role="status"></p><script src="popup.js"></script>');
    await fs.writeFile(path.join(extension,'popup.js'),`const transfer=${transfer.toString()};
document.getElementById('fill').onclick=async()=>{
 const result=document.getElementById('result');result.textContent='running';
 try{
   const tabs=await chrome.tabs.query({url:${JSON.stringify(origin+'/*')}});
   if(tabs.length!==1){result.textContent='ambiguous-target';return;}
   const output=await chrome.scripting.executeScript({target:{tabId:tabs[0].id},func:transfer,args:[${JSON.stringify(packet)},${JSON.stringify(origin)}]});
   result.textContent=output[0].result;
 }catch(e){result.textContent='error: '+e.message;}
};`);
    context=await chromium.launchPersistentContext(path.join(temp,'profile'),{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:10000});
    const extensionId=new URL(worker.url()).host;
    const destination=await context.newPage();await destination.goto(origin);
    const popup=await context.newPage();await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    const click=async(expected)=>{await popup.locator('#fill').click();await expect(popup.locator('#result')).toHaveText(expected);};
    assert.equal(await destination.locator('#title').inputValue(),'');
    results.push('no automatic fill before extension button click');
    await click('filled');
    assert.equal(await destination.locator('#title').inputValue(),packet.title);
    assert.equal(await destination.locator('#letter').inputValue(),packet.letter);
    assert.equal(await destination.locator('#declaration').isChecked(),false);
    results.push('real extension scripting fills non-cooperating local form; exact text preserved; declaration untouched');
    await destination.reload();await destination.locator('#letter').fill('Existing creator answer');
    await click('existing-answer');
    assert.equal(await destination.locator('#title').inputValue(),'');
    assert.equal(await destination.locator('#letter').inputValue(),'Existing creator answer');
    results.push('existing-answer conflict blocks partial fill');
    await destination.reload();await destination.locator('#letter-label').evaluate(el=>el.textContent='Different question');
    await click('mapping-changed');assert.equal(await destination.locator('#title').inputValue(),'');
    results.push('changed label stops stale mapping');
    await destination.reload();await destination.locator('#letter').evaluate(el=>el.readOnly=true);
    await click('field-unavailable');assert.equal(await destination.locator('#title').inputValue(),'');
    results.push('read-only field blocks partial fill');
    const duplicate=await context.newPage();await duplicate.goto(origin);
    await click('ambiguous-target');assert.equal(await duplicate.locator('#title').inputValue(),'');
    results.push('multiple matching tabs require target disambiguation');
    await duplicate.close();
    await destination.goto(origin+'/delayed');
    await click('mapping-changed');
    await destination.locator('#reveal').click();
    await click('filled');assert.equal(await destination.locator('#letter').inputValue(),packet.letter);
    results.push('questions missing before disclosure stop safely; explicit retry after disclosure fills');
    await destination.goto(origin);
    await destination.locator('#letter').evaluate(el=>{const rich=document.createElement('div');rich.id='letter';rich.contentEditable='true';el.replaceWith(rich);});
    await click('mapping-changed');assert.equal(await destination.locator('#title').inputValue(),'');
    results.push('unsupported contenteditable editor rejected without partial fill');
    await destination.goto(origin+'/controlled');
    await destination.waitForFunction(()=>document.body.dataset.ready==='yes');
    await click('filled');
    assert.equal(await destination.locator('#letter').inputValue(),packet.letter);
    await destination.locator('#render').click();
    assert.equal(await destination.locator('#letter').inputValue(),'');
    results.push('LIMITATION OBSERVED: DOM fill reports success but synthetic controlled editor loses text on rerender');
    await destination.locator('#save').click();await expect(destination.locator('#save-status')).toHaveText('saved');
    await destination.reload();await destination.waitForFunction(()=>document.body.dataset.ready==='yes');
    assert.equal(await destination.locator('#letter').inputValue(),'');
    results.push('LIMITATION OBSERVED: rejected editor values are absent from saved and reopened fixture draft');
    await context.grantPermissions(['clipboard-read','clipboard-write'],{origin});
    for(const id of ['title','letter']){
      await destination.evaluate(value=>navigator.clipboard.writeText(value),packet[id]);
      await destination.locator('#'+id).focus();
      await destination.keyboard.press(process.platform==='darwin'?'Meta+V':'Control+V');
    }
    await destination.locator('#render').click();assert.equal(await destination.locator('#letter').inputValue(),packet.letter);
    await destination.locator('#save').click();await expect(destination.locator('#save-status')).toHaveText('saved');
    await destination.reload();await destination.waitForFunction(()=>document.body.dataset.ready==='yes');
    assert.equal(await destination.locator('#title').inputValue(),packet.title);
    assert.equal(await destination.locator('#letter').inputValue(),packet.letter);
    results.push('browser clipboard paste survives controlled-editor rerender, fixture server save and reload');
    // A permission negative control. Opening an extension page must not count as invoking activeTab.
    await context.close();context=null;
    const manifest=JSON.parse(await fs.readFile(path.join(extension,'manifest.json'),'utf8'));
    delete manifest.host_permissions;manifest.permissions=['scripting','activeTab'];
    await fs.writeFile(path.join(extension,'manifest.json'),JSON.stringify(manifest));
    context=await chromium.launchPersistentContext(path.join(temp,'permission-profile'),{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
    const permissionWorker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:10000});
    const target=await context.newPage();await target.goto(origin);await target.bringToFront();
    const denied=await permissionWorker.evaluate(async()=>{
      const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});
      try{await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>document.title});return 'unexpected-access';}
      catch(error){return error.message;}
    });
    assert.notEqual(denied,'unexpected-access');
    assert.match(denied,/permission|access|invoked/i);
    results.push('activeTab alone does not grant injection before user invocation');
    console.log(JSON.stringify({testedAt:new Date().toISOString(),scope:'Actual Manifest V3 extension in isolated headless Chromium; localhost host permission plus separate activeTab denial control; toolbar grant not tested; no external sites, accounts, uploads or submissions',results:results.map(test=>({test,status:test.startsWith('LIMITATION')?'LIMITATION_REPRODUCED':'PASS'}))},null,2));
  }finally{
    if(context)await context.close();
    await new Promise(r=>server.close(r));
    if(temp)await fs.rm(temp,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
