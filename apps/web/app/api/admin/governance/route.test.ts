import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from './route';

test('governance API returns 401 without a session', async () => {
  const response = await GET(new Request('http://localhost/api/admin/governance'));
  assert.equal(response.status, 401);
});
