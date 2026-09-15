import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  clearNeonAuthJwksCacheForTests,
  verifyNeonAuthWebhook,
} from './neonAuthWebhook';

const now = Date.parse('2026-09-15T04:30:00.000Z');

function signedRequest(body: string, timestamp = now) {
  const kid = 'missa-test-key';
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const jwk = publicKey.export({ format: 'jwk' });
  const headerB64 = Buffer.from(
    JSON.stringify({ alg: 'EdDSA', typ: 'JWS', kid }),
  ).toString('base64url');
  const bodyB64 = Buffer.from(body).toString('base64url');
  const boundPayload = Buffer.from(`${timestamp}.${bodyB64}`).toString(
    'base64url',
  );
  const signingInput = `${headerB64}.${boundPayload}`;
  const signature = crypto
    .sign(null, Buffer.from(signingInput), privateKey)
    .toString('base64url');
  const parsed = JSON.parse(body) as { event_id: string; event_type: string };

  return {
    headers: new Headers({
      'x-neon-signature': `${headerB64}..${signature}`,
      'x-neon-signature-kid': kid,
      'x-neon-timestamp': String(timestamp),
      'x-neon-event-type': parsed.event_type,
      'x-neon-event-id': parsed.event_id,
    }),
    fetcher: async () =>
      new Response(JSON.stringify({ keys: [{ ...jwk, kid }] }), {
        headers: { 'content-type': 'application/json' },
      }),
  };
}

test.beforeEach(() => clearNeonAuthJwksCacheForTests());

test('verifies a fresh Neon detached Ed25519 webhook signature', async () => {
  const body = JSON.stringify({
    event_id: 'event-123',
    event_type: 'send.otp',
    timestamp: new Date(now).toISOString(),
  });
  const signed = signedRequest(body);
  const payload = await verifyNeonAuthWebhook(body, signed.headers, {
    baseUrl: 'https://example.neonauth.test/auth',
    fetcher: signed.fetcher,
    now,
  });

  assert.equal(payload.event_id, 'event-123');
  assert.equal(payload.event_type, 'send.otp');
});

test('rejects a body changed after signing', async () => {
  const body = JSON.stringify({
    event_id: 'event-123',
    event_type: 'send.otp',
    timestamp: new Date(now).toISOString(),
  });
  const signed = signedRequest(body);

  await assert.rejects(
    verifyNeonAuthWebhook(`${body} `, signed.headers, {
      baseUrl: 'https://example.neonauth.test/auth',
      fetcher: signed.fetcher,
      now,
    }),
    /signature is invalid/u,
  );
});

test('rejects stale webhook timestamps before delivery', async () => {
  const body = JSON.stringify({
    event_id: 'event-123',
    event_type: 'send.otp',
    timestamp: new Date(now).toISOString(),
  });
  const signed = signedRequest(body, now - 6 * 60 * 1000);

  await assert.rejects(
    verifyNeonAuthWebhook(body, signed.headers, {
      baseUrl: 'https://example.neonauth.test/auth',
      fetcher: signed.fetcher,
      now,
    }),
    /timestamp is invalid or stale/u,
  );
});
