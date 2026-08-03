import test from 'node:test';
import assert from 'node:assert/strict';
import { importGuidelines } from '../src/index.js';

test('guideline importer extracts bounded HTML and reports the source', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html><body><h1>Requirements</h1><p>Send three works.</p></body></html>', { headers: { 'content-type': 'text/html' } });
  try {
    const result = await importGuidelines('https://example.org/guidelines');
    assert.equal(result.report.sourceType, 'html');
    assert.match(result.text, /Requirements Send three works/);
    assert.equal(result.report.confidence, 'high');
  } finally { globalThis.fetch = original; }
});

test('guideline importer marks best-effort PDF extraction low confidence and blocks private hosts', async () => {
  await assert.rejects(() => importGuidelines('http://127.0.0.1/guidelines.pdf'), /private network/);
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array([...Buffer.from('%PDF-1.4 (Three works.) Tj'), ...Buffer.from('%%EOF')]), { headers: { 'content-type': 'application/pdf' } });
  try {
    const result = await importGuidelines('https://example.org/guidelines.pdf');
    assert.equal(result.report.sourceType, 'pdf');
    assert.equal(result.report.confidence, 'low');
    assert.ok(result.report.warnings.length > 0);
  } finally { globalThis.fetch = original; }
});
