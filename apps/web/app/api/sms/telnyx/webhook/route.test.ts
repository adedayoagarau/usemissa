import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { POST } from './route';

const keys = ['TELNYX_API_KEY', 'TELNYX_MESSAGING_PROFILE_ID', 'TELNYX_PUBLIC_KEY', 'DATABASE_URL'] as const;

async function withEnv(values: Partial<Record<(typeof keys)[number], string>>, run: () => Promise<void>) {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    await run();
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

const body = JSON.stringify({ data: { event_type: 'message.received', payload: { from: { phone_number: '+447700900123' }, text: 'STOP' } } });

test('Telnyx webhook refuses requests when no public key is configured', async () => {
  await withEnv({}, async () => {
    const response = await POST(new Request('http://localhost/api/sms/telnyx/webhook', { method: 'POST', body }));
    assert.equal(response.status, 401);
  });
});

test('Telnyx webhook refuses unsigned and wrongly signed requests', async () => {
  const { publicKey } = crypto.generateKeyPairSync('ed25519');
  const other = crypto.generateKeyPairSync('ed25519');
  const raw = Buffer.from(publicKey.export({ format: 'der', type: 'spki' }).subarray(12)).toString('base64');
  await withEnv({ TELNYX_API_KEY: 'key', TELNYX_MESSAGING_PROFILE_ID: 'profile', TELNYX_PUBLIC_KEY: raw }, async () => {
    const unsigned = await POST(new Request('http://localhost/api/sms/telnyx/webhook', { method: 'POST', body }));
    assert.equal(unsigned.status, 401);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto.sign(null, Buffer.from(`${timestamp}|${body}`), other.privateKey).toString('base64');
    const forged = await POST(new Request('http://localhost/api/sms/telnyx/webhook', {
      method: 'POST',
      headers: { 'telnyx-signature-ed25519': signature, 'telnyx-timestamp': timestamp },
      body,
    }));
    assert.equal(forged.status, 401);
  });
});

test('Telnyx webhook answers a signed request with 200 even when it cannot store it', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const raw = Buffer.from(publicKey.export({ format: 'der', type: 'spki' }).subarray(12)).toString('base64');
  await withEnv({ TELNYX_API_KEY: 'key', TELNYX_MESSAGING_PROFILE_ID: 'profile', TELNYX_PUBLIC_KEY: raw }, async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto.sign(null, Buffer.from(`${timestamp}|${body}`), privateKey).toString('base64');
    const response = await POST(new Request('http://localhost/api/sms/telnyx/webhook', {
      method: 'POST',
      headers: { 'telnyx-signature-ed25519': signature, 'telnyx-timestamp': timestamp },
      body,
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true });
  });
});
