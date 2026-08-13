import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from './route';

test('v2 run trigger requires platform admin authentication', async () => {
  const response = await POST(new Request('http://localhost/api/admin/ingestion-v2', { method: 'POST', body: '{}' }));
  assert.equal(response.status, 401);
});

test('v2 run history requires platform admin authentication', async () => {
  const response = await GET(new Request('http://localhost/api/admin/ingestion-v2'));
  assert.equal(response.status, 401);
});
