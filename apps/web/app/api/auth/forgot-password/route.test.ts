import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeAuthRateLimit, PASSWORD_RESET_RATE_LIMIT_POLICY } from '@/lib/auth-rate-limit';
import { POST } from './route';

delete process.env.DATABASE_URL;
delete process.env.MISSA_DISABLE_AUTH_RATE_LIMIT;

function forgotRequest(email: string, ip: string): Request {
  return new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email }),
  });
}

test('forgot password limits repeated requests for one email without revealing whether it exists', async () => {
  const email = 'nobody-here@example.com';
  for (let attempt = 0; attempt < PASSWORD_RESET_RATE_LIMIT_POLICY.emailLimit; attempt += 1) {
    const response = await POST(forgotRequest(email, `198.51.100.${attempt + 1}`));
    assert.equal(response.status, 200);
    const body = (await response.json()) as { ok: boolean };
    assert.equal(body.ok, true);
  }
  const limited = await POST(forgotRequest(email, '198.51.100.250'));
  assert.equal(limited.status, 429);
  assert.ok(limited.headers.get('Retry-After'));
});

test('forgot password limits one network address across many emails', async () => {
  const ip = '203.0.113.7';
  for (let attempt = 0; attempt < PASSWORD_RESET_RATE_LIMIT_POLICY.ipLimit; attempt += 1) {
    const response = await POST(forgotRequest(`person-${attempt}@example.com`, ip));
    assert.equal(response.status, 200);
  }
  const limited = await POST(forgotRequest('one-more@example.com', ip));
  assert.equal(limited.status, 429);
});

test('password reset buckets are separate from sign-in buckets', async () => {
  const ip = '192.0.2.44';
  const email = 'shared-bucket@example.com';
  for (let attempt = 0; attempt < PASSWORD_RESET_RATE_LIMIT_POLICY.emailLimit; attempt += 1) {
    assert.equal(await consumeAuthRateLimit({ ip, email }, PASSWORD_RESET_RATE_LIMIT_POLICY), undefined);
  }
  assert.notEqual(await consumeAuthRateLimit({ ip, email }, PASSWORD_RESET_RATE_LIMIT_POLICY), undefined);
  assert.equal(await consumeAuthRateLimit({ ip, email }), undefined);
});
