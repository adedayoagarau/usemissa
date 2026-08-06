import assert from 'node:assert/strict';
import test from 'node:test';
import { GET, PATCH, POST } from './route';

test('CRM API requires a platform-admin session for reads and notes', async () => {
  assert.equal((await GET(new Request('http://localhost/api/admin/crm'))).status, 401);
  assert.equal((await POST(new Request('http://localhost/api/admin/crm', { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': 'crm-test-key-0001' }, body: JSON.stringify({ organizationId: 'org_one', title: 'Note', body: 'Body' }) }))).status, 401);
  assert.equal((await PATCH(new Request('http://localhost/api/admin/crm', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taskId: 'task_one', status: 'done' }) }))).status, 401);
});
