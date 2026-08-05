import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from './route';

test('billing ledger API requires a platform-admin session', async () => {
  assert.equal((await GET(new Request('http://localhost/api/admin/billing'))).status, 401);
});
