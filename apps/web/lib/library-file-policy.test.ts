import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkLibraryFile,
  checkLibraryFileSize,
  LIBRARY_MAX_FILE_BYTES,
  libraryFileResponseHeaders,
} from './library-file-policy';

const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF\n');
const png = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4a80000000049454e44ae426082',
  'hex',
);

test('accepted creative formats get their content type from the allowlist', async () => {
  assert.deepEqual(await checkLibraryFile('portfolio.pdf', pdf), { ok: true, contentType: 'application/pdf' });
  assert.deepEqual(await checkLibraryFile('cover.PNG', png), { ok: true, contentType: 'image/png' });
  assert.deepEqual(await checkLibraryFile('statement.md', Buffer.from('# Artist statement\n\nI write about rivers.')), {
    ok: true,
    contentType: 'text/markdown; charset=utf-8',
  });
});

test('markup and script formats are refused', async () => {
  const html = Buffer.from('<!doctype html><script>alert(1)</script>');
  for (const name of ['page.html', 'page.htm', 'image.svg', 'feed.xml', 'app.js', 'run.exe', 'noextension']) {
    const result = await checkLibraryFile(name, html);
    assert.equal(result.ok, false, name);
    if (!result.ok) assert.equal(result.status, 415);
  }
});

test('a file whose bytes do not match its extension is refused', async () => {
  const disguised = await checkLibraryFile('poems.pdf', Buffer.from('MZ\x90\x00 not really a pdf'));
  assert.equal(disguised.ok, false);
  const htmlAsText = await checkLibraryFile('notes.txt', Buffer.from('  <html><body>hi</body></html>'));
  assert.equal(htmlAsText.ok, false);
  const pngAsText = await checkLibraryFile('notes.txt', png);
  assert.equal(pngAsText.ok, false);
});

test('files over the server limit are refused with a clear message', () => {
  const tooBig = checkLibraryFileSize(LIBRARY_MAX_FILE_BYTES + 1);
  assert.ok(tooBig && !tooBig.ok);
  if (tooBig && !tooBig.ok) {
    assert.equal(tooBig.status, 413);
    assert.match(tooBig.error, /4 MB/);
  }
  assert.equal(checkLibraryFileSize(LIBRARY_MAX_FILE_BYTES), undefined);
  assert.equal(checkLibraryFileSize(0)?.ok, false);
});

test('only PDFs and raster images open inline; everything else downloads with nosniff', () => {
  const pdfHeaders = libraryFileResponseHeaders({ filename: 'a.pdf', contentType: 'application/pdf' });
  assert.match(pdfHeaders['content-disposition']!, /^inline;/);
  assert.equal(pdfHeaders['x-content-type-options'], 'nosniff');

  const docx = libraryFileResponseHeaders({
    filename: 'a.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  assert.match(docx['content-disposition']!, /^attachment;/);

  // Stored before the allowlist existed, with a browser-supplied type.
  const legacyHtml = libraryFileResponseHeaders({ filename: 'x.html', contentType: 'text/html' });
  assert.equal(legacyHtml['content-type'], 'application/octet-stream');
  assert.match(legacyHtml['content-disposition']!, /^attachment;/);

  const mislabelled = libraryFileResponseHeaders({ filename: 'x.png', contentType: 'text/html' });
  assert.equal(mislabelled['content-type'], 'application/octet-stream');
  assert.match(mislabelled['content-disposition']!, /^attachment;/);
});
