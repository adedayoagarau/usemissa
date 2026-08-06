import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from './route';

test('first-party analytics ingestion requires an authenticated session', async () => {
  const response = await POST(new Request('http://localhost/api/analytics/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eventName: 'page_view', path: '/admin' }),
  }));
  assert.equal(response.status, 401);
});
