// Synthetic, local-only mechanism tests. Not a Submittable integration.
const { chromium } = require('@playwright/test');
const http = require('node:http');
const assert = require('node:assert/strict');

const fixture = `<!doctype html><meta charset="utf-8"><title>Local application experiment</title>
<h1>Synthetic application — nothing is submitted</h1>
<label>Title<input id="title" maxlength="300"></label>
<label>Cover letter<textarea id="letter"></textarea></label>
<label>File<input id="file" type="file" accept=".pdf"></label>
<label><input id="declaration" type="checkbox">Creator declaration</label>
<button id="save">Save local fixture draft</button><p id="status" role="status"></p>
<script>
const title = document.querySelector('#title'), letter = document.querySelector('#letter');
const saved = JSON.parse(localStorage.getItem('fixture-draft') || 'null');
if (saved) { title.value = saved.title; letter.value = saved.letter; }
document.querySelector('#save').onclick = () => {
  localStorage.setItem('fixture-draft', JSON.stringify({title:title.value,letter:letter.value}));
  document.querySelector('#status').textContent = 'Text saved; file must be selected again after reload.';
};
// Candidate policy: explicit fields only; inspect every mapping before changing any value.
window.transfer = (packet) => {
  const specs = [{id:'title',tag:'INPUT',label:'Title'}, {id:'letter',tag:'TEXTAREA',label:'Cover letter'}];
  for (const spec of specs) {
    const el = document.getElementById(spec.id);
    if (!el || el.tagName !== spec.tag || el.parentElement.textContent.trim() !== spec.label) return 'mapping-changed';
    if (el.value && el.value !== packet[spec.id]) return 'existing-answer';
    if (typeof packet[spec.id] !== 'string') return 'invalid-packet';
    if (el.maxLength >= 0 && packet[spec.id].length > el.maxLength) return 'too-long';
  }
  for (const spec of specs) {
    const el = document.getElementById(spec.id);
    el.value = packet[spec.id];
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  }
  return 'filled';
};
</script>`;

(async () => {
  const server = http.createServer((req,res) => {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);});
  let browser;
  const results = [];
  try {
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch();
    const context = await browser.newContext({permissions:['clipboard-read','clipboard-write']});
    const page = await context.newPage();
    await page.goto(origin);
    const packet = {title:'Synthetic work',letter:'A fictional creator: Adé\n\n    Indented line — preserved.\nEnd.'};
    const record = name => results.push({test:name,status:'PASS'});
    // Browser clipboard round trip, under test-granted permissions.
    await page.evaluate(value => navigator.clipboard.writeText(value), packet.letter);
    await page.locator('#letter').focus();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
    assert.equal(await page.locator('#letter').inputValue(),packet.letter);
    record('clipboard paste preserves Unicode, blank lines and indentation');
    await page.locator('#letter').fill('Existing creator answer');
    assert.equal(await page.evaluate(p => window.transfer(p),packet),'existing-answer');
    assert.equal(await page.locator('#title').inputValue(),'');
    assert.equal(await page.locator('#letter').inputValue(),'Existing creator answer');
    record('conflict stops whole transfer without overwriting existing answer');
    await page.locator('#letter').fill('');
    assert.equal(await page.evaluate(p => window.transfer(p),{...packet,title:'x'.repeat(301)}),'too-long');
    assert.equal(await page.locator('#letter').inputValue(),'');
    record('over-limit title rejected without partial fill');
    await page.evaluate(() => document.querySelector('#letter').parentElement.firstChild.textContent = 'Different question');
    assert.equal(await page.evaluate(p => window.transfer(p),packet),'mapping-changed');
    assert.equal(await page.locator('#title').inputValue(),'');
    record('changed label rejects stale mapping');
    await page.reload();
    assert.equal(await page.evaluate(p => window.transfer(p),packet),'filled');
    assert.equal(await page.locator('#letter').inputValue(),packet.letter);
    assert.equal(await page.locator('#declaration').isChecked(),false);
    record('explicit text transfer leaves creator declaration unchecked');
    await page.locator('#file').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n% synthetic probe; not a valid publication PDF')});
    assert.equal(await page.locator('#file').evaluate(el => el.files[0].name),'synthetic.pdf');
    await page.locator('#save').click();
    await page.reload();
    assert.equal(await page.locator('#title').inputValue(),packet.title);
    assert.equal(await page.locator('#letter').inputValue(),packet.letter);
    assert.equal(await page.locator('#file').evaluate(el => el.files.length),0);
    record('fixture text recovers after reload; file selection does not');
    const anotherDevice = await browser.newContext();
    const other = await anotherDevice.newPage(); await other.goto(origin);
    assert.equal(await other.locator('#title').inputValue(),'');
    record('isolated browser context has no device-local draft');
    console.log(JSON.stringify({testedAt:new Date().toISOString(),browser:browser.version(),scope:'Synthetic local fixture; clipboard permissions pre-granted; file selected by automation; no uploads, external writes or human timing',results},null,2));
  } finally {
    if(browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error);process.exitCode=1;});
