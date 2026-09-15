import assert from 'node:assert/strict';
import test from 'node:test';
import { handleNeonAuthWebhook } from './route';
import type { NeonAuthWebhookPayload } from '@/lib/neonAuthWebhook';

const payload: NeonAuthWebhookPayload = {
  event_id: 'event-otp-123',
  event_type: 'send.otp',
  timestamp: '2026-09-15T04:30:00.000Z',
  user: { email: 'creator@example.com' },
  event_data: {
    otp_code: '123456',
    otp_type: 'email-verification',
    expires_at: '2026-09-15T04:40:00.000Z',
  },
};

test('delivers one verified send.otp event', async () => {
  const delivered: NeonAuthWebhookPayload[] = [];
  const response = await handleNeonAuthWebhook(
    new Request('http://localhost/api/webhooks/neon-auth', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    {
      verify: async () => payload,
      deliver: async (event) => {
        delivered.push(event);
      },
    },
  );

  assert.equal(response.status, 204);
  assert.deepEqual(delivered, [payload]);
});

test('fails closed when signature verification fails', async () => {
  const response = await handleNeonAuthWebhook(
    new Request('http://localhost/api/webhooks/neon-auth', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    {
      verify: async () => {
        throw new Error('invalid');
      },
      deliver: async () => undefined,
    },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'Invalid Neon Auth webhook signature.',
  });
});

test('returns a retryable failure when provider delivery fails', async () => {
  const response = await handleNeonAuthWebhook(
    new Request('http://localhost/api/webhooks/neon-auth', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    {
      verify: async () => payload,
      deliver: async () => {
        throw new Error('provider unavailable');
      },
    },
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'OTP delivery failed.' });
});
