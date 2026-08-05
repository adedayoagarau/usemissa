import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from './route';

test('customers API returns 401 without a session', async () => {
  const response = await GET(new Request('http://localhost/api/admin/customers'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Not authenticated' });
});
