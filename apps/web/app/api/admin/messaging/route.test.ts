import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from './route';

test('messaging API returns 401 without a session', async () => {
  const response = await GET(new Request('http://localhost/api/admin/messaging'));
  assert.equal(response.status, 401);
});
