// Local browser boundary experiments, not destination certification or a usability benchmark.
// Run from repository root: node scripts/application-bridge-boundary-probe.cjs
const { chromium } = require('@playwright/test');
const http = require('node:http');
const assert = require('node:assert/strict');

async function serve(handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

(async () => {
  const servers = [];
  let browser;
  const results = [];
  try {
    const destination = await serve((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<label>Statement<textarea id="statement"></textarea></label><input id="file" type="file">');
    });
    servers.push(destination.server);
    const source = await serve((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<aside id="companion">Missa fixture</aside><iframe src="${destination.origin}"></iframe><a href="${destination.origin}">Continue</a>`);
    });
    servers.push(source.server);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(source.origin);
    const crossOrigin = await page.evaluate(() => {
      try { document.querySelector('iframe').contentWindow.document.querySelector('textarea').value = 'test'; return 'unexpected-access'; }
      catch (error) { return error.name; }
    });
    assert.equal(crossOrigin, 'SecurityError');
    results.push({ test: 'source page cannot directly fill cross-origin frame', status: 'PASS', observed: crossOrigin });
    await page.getByRole('link', { name: 'Continue' }).click();
    assert.equal(await page.locator('#companion').count(), 0);
    results.push({ test: 'source companion does not survive same-tab destination navigation', status: 'PASS' });
    await page.goto(`${destination.origin}/?statement=hello`);
    assert.equal(await page.locator('#statement').inputValue(), '');
    results.push({ test: 'query parameter alone does not populate an unconfigured form', status: 'PASS' });
    const fileResult = await page.evaluate(() => {
      try { document.querySelector('#file').value = '/synthetic/document.pdf'; return 'unexpected-assignment'; }
      catch (error) { return error.name; }
    });
    assert.equal(fileResult, 'InvalidStateError');
    results.push({ test: 'page script cannot select a local file by assigning its path', status: 'PASS', observed: fileResult });
    const sample = 'Adédàyọ̀\n\n    An indented line — with accents.';
    await page.evaluate(value => { document.querySelector('#statement').value = value; }, sample);
    assert.equal(await page.locator('#statement').inputValue(), sample);
    results.push({ test: 'same-page plain textarea preserves synthetic Unicode and line breaks', status: 'PASS', limit: 'No clipboard, rich editor, destination persistence or phone tested' });
    console.log(JSON.stringify({ testedAt: new Date().toISOString(), browser: browser.version(), scope: 'Headless Chromium; two local HTTP origins; no third-party requests or submissions', results }, null, 2));
  } finally {
    if (browser) await browser.close();
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
