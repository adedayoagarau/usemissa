import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpFetcher, isSafeTextPayload, type Source } from '../src/index.js';

const source: Source = {
  id: 'source_fetcher',
  name: 'Example source',
  url: 'https://example.com/call',
  kind: 'organization-website',
  active: true,
  checkIntervalHours: 24,
  consecutiveFailures: 0,
  consecutiveProcessingFailures: 0,
};

test('rejects binary content types before decoding them as opportunity text', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('\u0000PNG', {
    status: 200,
    headers: { 'content-type': 'image/png' },
  });
  try {
    assert.deepEqual(await new HttpFetcher().fetch(source), { status: 'error', content: '', failureReason: 'unsupported-content-type' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects control characters even when a server mislabels binary content as text', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('Open call\u0000\u0001', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });
  try {
    assert.equal(isSafeTextPayload('Open call\n\tworks'), true);
    assert.equal(isSafeTextPayload('Open call\u0000works'), false);
    assert.deepEqual(await new HttpFetcher().fetch(source), { status: 'error', content: '', failureReason: 'unsafe-payload' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
