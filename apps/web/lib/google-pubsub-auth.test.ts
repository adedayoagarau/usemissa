import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import { clearGooglePubSubCertificateCache, verifyGooglePubSubOidc } from './google-pubsub-auth';

function token(privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'], claims: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'RS256', kid: 'test-key', typ: 'JWT' });
  const payload = encode(claims);
  const signer = createSign('RSA-SHA256'); signer.update(`${header}.${payload}`); signer.end();
  return `${header}.${payload}.${signer.sign(privateKey).toString('base64url')}`;
}

test('Google Pub/Sub OIDC accepts a valid signed token and rejects a wrong audience', async () => {
  clearGooglePubSubCertificateCache();
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const now = 1_780_000_000_000;
  const jwt = token(keys.privateKey, { iss: 'https://accounts.google.com', aud: 'https://missa.test/api/inbound/gmail/push', sub: 'publisher', email: 'pubsub@missa.iam.gserviceaccount.com', iat: now / 1_000 - 10, exp: now / 1_000 + 300 });
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({ 'test-key': keys.publicKey.export({ type: 'spki', format: 'pem' }) }), { headers: { 'content-type': 'application/json' } });
  const valid = await verifyGooglePubSubOidc(`Bearer ${jwt}`, 'https://missa.test/api/inbound/gmail/push', 'pubsub@missa.iam.gserviceaccount.com', fetcher, now);
  assert.equal(valid?.subject, 'publisher');
  const invalid = await verifyGooglePubSubOidc(`Bearer ${jwt}`, 'https://other.test/push', undefined, fetcher, now);
  assert.equal(invalid, undefined);
});
