import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  buildUnsubscribeUrl,
  buildOneClickUnsubscribeHeaders,
} from './email-tokens';

test('createUnsubscribeToken and verifyUnsubscribeToken roundtrip successfully', () => {
  const accountId = 'acc_test_123';
  const email = 'CREATOR@example.com';
  const token = createUnsubscribeToken({ accountId, email, category: 'saved_search', secret: 'test-secret-key' });

  const result = verifyUnsubscribeToken(token, 'test-secret-key');
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.accountId, accountId);
    assert.equal(result.email, 'creator@example.com'); // Normalized to lower case
    assert.equal(result.category, 'saved_search');
    assert.ok(result.expiresAt > Math.floor(Date.now() / 1000));
  }
});

test('verifyUnsubscribeToken rejects invalid signature or tampered token', () => {
  const token = createUnsubscribeToken({
    accountId: 'acc_test_123',
    email: 'creator@example.com',
    secret: 'test-secret-key',
  });

  // Verify with wrong secret
  const resultWrongSecret = verifyUnsubscribeToken(token, 'different-secret');
  assert.equal(resultWrongSecret.valid, false);
  if (!resultWrongSecret.valid) {
    assert.equal(resultWrongSecret.reason, 'invalid_signature');
  }

  // Verify with tampered payload
  const parts = token.split('.');
  const tamperedToken = `tampered${parts[0]?.slice(8)}.${parts[1]}`;
  const resultTampered = verifyUnsubscribeToken(tamperedToken, 'test-secret-key');
  assert.equal(resultTampered.valid, false);
});

test('verifyUnsubscribeToken rejects expired token', () => {
  const token = createUnsubscribeToken({
    accountId: 'acc_test_123',
    email: 'creator@example.com',
    expiresInSeconds: -10, // Expired in the past
    secret: 'test-secret-key',
  });

  const result = verifyUnsubscribeToken(token, 'test-secret-key');
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(result.reason, 'expired');
  }
});

test('buildUnsubscribeUrl produces valid URL with token parameter', () => {
  const url = buildUnsubscribeUrl({
    accountId: 'acc_123',
    email: 'test@example.com',
    baseUrl: 'https://usemissa.com',
    secret: 'test-secret-key',
  });
  assert.ok(url.startsWith('https://usemissa.com/unsubscribe?token='));
});

test('buildOneClickUnsubscribeHeaders produces RFC 8058 compliant headers', () => {
  const headers = buildOneClickUnsubscribeHeaders({
    accountId: 'acc_123',
    email: 'test@example.com',
    baseUrl: 'https://usemissa.com',
    secret: 'test-secret-key',
  });

  assert.equal(headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.ok(headers['List-Unsubscribe']?.includes('https://usemissa.com/api/me/unsubscribe?token='));
  assert.ok(headers['List-Unsubscribe']?.includes('https://usemissa.com/unsubscribe?token='));
});
