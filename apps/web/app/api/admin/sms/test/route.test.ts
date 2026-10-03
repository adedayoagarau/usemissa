import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from './route';

test('test text API returns 401 without a session', async () => {
  const response = await POST(new Request('http://localhost/api/admin/sms/test', { method: 'POST', body: JSON.stringify({ phone: '+447700900123' }) }));
  assert.equal(response.status, 401);
});
