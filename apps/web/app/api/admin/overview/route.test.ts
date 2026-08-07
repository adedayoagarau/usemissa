import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from './route';

test('overview API returns 401 without a session and does not read admin data', async () => {
  const response = await GET(new Request('http://localhost/api/admin/overview'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Not authenticated' });
});
