// Compare executed operations, not human speed. Cooperative local destinations only.
const {chromium} = require('@playwright/test');
const http = require('node:http');
const assert = require('node:assert/strict');
const packet = {title:'Synthetic work',letter:'Fictional creator Adé\n\n    A line with indentation — retained.'};
async function serve(handler) {
  const server=http.createServer(handler);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  return {server,origin:`http://127.0.0.1:${server.address().port}`};
}
(async()=>{
  let browser,source,dest;
  const runs=[];
  try {
    dest=await serve((req,res)=>{
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.end(`<label>Title<input id="title" maxlength="300"></label><label>Letter<textarea id="letter"></textarea></label>
<input type="checkbox" id="declaration"><p id="status"></p>
<script>window.addEventListener('message',e=>{
 if(e.origin!==${JSON.stringify(source.origin)}||e.source!==window.opener||e.data.kind!=='reviewed-transfer')return;
 const p=e.data.packet; const ids=['title','letter'];
 if(ids.some(id=>typeof p[id]!=='string'||document.getElementById(id).value)) {document.getElementById('status').textContent='Review existing answers';return;}
 if(p.title.length>300)return;
 ids.forEach(id=>{const el=document.getElementById(id);el.value=p[id];el.dispatchEvent(new Event('input',{bubbles:true}));});
 document.getElementById('status').textContent='Transferred; review before applying';
});</script>`);
    });
    source=await serve((req,res)=>{
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.end(`<h1>Local transfer experiment</h1><button id="open">Open destination</button><button id="transfer">Transfer reviewed text</button>
<button id="copy-title">Copy title</button><button id="copy-letter">Copy letter</button>
<script>const packet=${JSON.stringify(packet)};let target;
document.getElementById('open').onclick=()=>{target=window.open(${JSON.stringify(dest.origin)});};
['title','letter'].forEach(id=>document.getElementById('copy-'+id).onclick=async()=>{await navigator.clipboard.writeText(packet[id]);document.getElementById('copy-'+id).dataset.done='yes';});
document.getElementById('transfer').onclick=()=>target.postMessage({kind:'reviewed-transfer',packet},${JSON.stringify(dest.origin)});
</script>`);
    });
    browser=await chromium.launch();
    // Counterbalanced automated order. Both start after identical destination opening.
    for(const method of ['copy','assisted','assisted','copy','copy','assisted']) {
      const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});
      const a=await context.newPage();await a.goto(source.origin);
      const popup=context.waitForEvent('page');await a.locator('#open').click();const b=await popup;await b.waitForLoadState();
      await a.bringToFront();
      const operations=[];const start=performance.now();
      const op=async(name,fn)=>{await fn();operations.push(name);};
      if(method==='copy'){
        for(const id of ['title','letter']){
          await op('copy '+id,()=>a.locator('#copy-'+id).click());
          await a.waitForFunction(id=>document.getElementById('copy-'+id).dataset.done==='yes',id);
          await op('switch to destination',()=>b.bringToFront());
          await op('focus '+id,()=>b.locator('#'+id).click());
          await op('paste '+id,()=>b.keyboard.press(process.platform==='darwin'?'Meta+V':'Control+V'));
          if(id==='title')await op('return to materials',()=>a.bringToFront());
        }
      } else {
        await op('transfer reviewed text',()=>a.locator('#transfer').click());
        await b.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Transferred'));
        await op('switch to destination for review',()=>b.bringToFront());
      }
      const automationMs=Math.round(performance.now()-start);
      assert.equal(await b.locator('#title').inputValue(),packet.title);
      assert.equal(await b.locator('#letter').inputValue(),packet.letter);
      assert.equal(await b.locator('#declaration').isChecked(),false);
      runs.push({method,operations,automationMs,exactText:true,declarationUnchecked:true});
      await context.close();
    }
    console.log(JSON.stringify({testedAt:new Date().toISOString(),browser:browser.version(),scope:'Cooperating two-origin local fixture. Automated browser actions; no human timing. Prefilled packet, pre-granted clipboard, no files/login/setup/review duration. Not an extension or Submittable integration.',runs},null,2));
  } finally {
    if(browser)await browser.close();
    for(const item of [source,dest])if(item)await new Promise(r=>item.server.close(r));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
