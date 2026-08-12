import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from './route.js';

test('Resend webhook fails closed before signature handling when production configuration is absent', async () => {
  const previousSecret = process.env.RESEND_WEBHOOK_SECRET;
  const previousDatabase = process.env.DATABASE_URL;
  delete process.env.RESEND_WEBHOOK_SECRET;
  delete process.env.DATABASE_URL;
  try {
    const response = await POST(new Request('http://localhost/api/webhooks/resend', { method: 'POST', body: '{}' }));
    assert.equal(response.status, 503);
  } finally {
    if (previousSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET; else process.env.RESEND_WEBHOOK_SECRET = previousSecret;
    if (previousDatabase === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousDatabase;
  }
});

test('Resend webhook rejects unsigned requests before persistence', async () => {
  const previousSecret = process.env.RESEND_WEBHOOK_SECRET;
  const previousDatabase = process.env.DATABASE_URL;
  process.env.RESEND_WEBHOOK_SECRET = 'whsec_test';
  process.env.DATABASE_URL = 'postgres://unused';
  try {
    const response = await POST(new Request('http://localhost/api/webhooks/resend', {
      method: 'POST',
      body: JSON.stringify({ type: 'email.sent' }),
    }));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Missing webhook signature.' });
  } finally {
    if (previousSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET; else process.env.RESEND_WEBHOOK_SECRET = previousSecret;
    if (previousDatabase === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousDatabase;
  }
});
