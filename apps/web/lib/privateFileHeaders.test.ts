import assert from 'node:assert/strict';
import test from 'node:test';
import { privateFileHeaders } from './privateFileHeaders';

test('PDFs and raster images may render inline, with nosniff', () => {
  for (const type of ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'IMAGE/GIF; charset=binary']) {
    const headers = privateFileHeaders({ contentType: type });
    assert.match(headers['content-disposition']!, /^inline/, type);
    assert.equal(headers['x-content-type-options'], 'nosniff');
  }
});

test('everything else downloads as an attachment', () => {
  for (const type of ['text/html', 'image/svg+xml', 'application/javascript', 'text/plain', 'application/xhtml+xml', undefined]) {
    const headers = privateFileHeaders({ contentType: type, contentDisposition: 'inline; filename="poem.html"' });
    assert.equal(headers['content-disposition'], 'attachment; filename="poem.html"', String(type));
    assert.equal(headers['x-content-type-options'], 'nosniff');
  }
  assert.equal(privateFileHeaders({})['content-type'], 'application/octet-stream');
});

test('filenames are reduced to safe characters', () => {
  const headers = privateFileHeaders({ contentType: 'text/html', contentDisposition: 'attachment; filename="a\\"b\r\nx.html"' });
  assert.doesNotMatch(headers['content-disposition']!, /[\r\n\\]/);
  assert.equal(privateFileHeaders({ contentType: 'application/pdf', contentLength: 12 })['content-length'], '12');
});
