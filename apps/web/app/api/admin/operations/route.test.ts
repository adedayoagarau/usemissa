import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from './route';

test('operations mutation API rejects an unauthenticated request before reading queues', async () => {
  const response = await POST(new Request('http://localhost/api/admin/operations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'run-radar-tick' }),
  }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Not authenticated' });
});
