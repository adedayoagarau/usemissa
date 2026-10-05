import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from './route';

test('pause API returns 401 without a session', async () => {
  const read = await GET(new Request('http://localhost/api/admin/sms/pause'));
  assert.equal(read.status, 401);
  const write = await POST(new Request('http://localhost/api/admin/sms/pause', { method: 'POST', body: JSON.stringify({ paused: true }) }));
  assert.equal(write.status, 401);
});
