import assert from 'node:assert/strict';
import test from 'node:test';
import { GET, POST } from './route';

test('agent controls API requires a platform-admin session', async () => {
  assert.equal((await GET(new Request('http://localhost/api/admin/agents'))).status, 401);
  assert.equal((await POST(new Request('http://localhost/api/admin/agents', { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': 'agent-test-key-0001' }, body: JSON.stringify({ targetType: 'review-job', targetId: 'job_one', action: 'requeue' }) }))).status, 401);
});
