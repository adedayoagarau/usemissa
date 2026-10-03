import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from './review/route';

test('publication review API returns 401 without a session', async () => {
  const response = await POST(new Request('http://localhost/api/admin/radar/review', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jobId: 'job_1', decision: 'approved' }),
  }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Not authenticated' });
});
