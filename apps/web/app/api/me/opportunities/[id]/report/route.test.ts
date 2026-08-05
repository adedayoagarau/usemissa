import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from './route';

test('issue report API returns 401 without a session', async () => {
  const response = await POST(new Request('http://localhost/api/me/opportunities/opp_one/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      reason: 'other',
      idempotencyKey: '00000000-0000-4000-8000-000000000001',
    }),
  }), { params: Promise.resolve({ id: 'opp_one' }) });
  assert.equal(response.status, 401);
});
