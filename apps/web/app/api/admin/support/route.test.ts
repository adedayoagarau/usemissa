import assert from 'node:assert/strict';
import test from 'node:test';
import { GET, POST } from './route';

test('support API returns 401 without a platform-admin session', async () => {
  const getResponse = await GET(new Request('http://localhost/api/admin/support'));
  assert.equal(getResponse.status, 401);

  const postResponse = await POST(new Request('http://localhost/api/admin/support', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Idempotency-Key': '00000000-0000-4000-8000-000000000001' },
    body: JSON.stringify({ caseId: 'issue_one', status: 'resolved' }),
  }));
  assert.equal(postResponse.status, 401);
});
