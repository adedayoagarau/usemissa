import assert from 'node:assert/strict';
import test from 'node:test';
import { getNeonSessionAccount } from '@/lib/neon-auth/account';

test('a request without a Neon session cookie never calls the Neon Auth service', async () => {
  process.env.NEON_AUTH_BASE_URL = 'https://neon-auth.invalid/neondb/auth';
  process.env.NEON_AUTH_COOKIE_SECRET = 'neon-session-lookup-test-secret-0123456789';
  const requested: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    requested.push(String(input instanceof Request ? input.url : input));
    return new Response('null', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    assert.equal(await getNeonSessionAccount(), undefined);
    assert.deepEqual(requested, []);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.NEON_AUTH_BASE_URL;
    delete process.env.NEON_AUTH_COOKIE_SECRET;
  }
});
