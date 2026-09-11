import assert from 'node:assert/strict';
import test from 'node:test';
import { createPasswordResetToken, verifyPasswordResetToken } from './password-reset-tokens';

test('createPasswordResetToken creates verifiable tokens and checks expiration and hash prefix', () => {
  const secret = 'custom-test-secret';
  const token = createPasswordResetToken({
    accountId: 'acct-456',
    email: 'test@example.com',
    passwordHashPrefix: 'hash1234567890abcdef',
    expiresInSeconds: 3600,
    secret,
  });

  const verified = verifyPasswordResetToken(token, 'hash1234567890abcdef', secret);
  assert.equal(verified.valid, true);
  if (verified.valid) {
    assert.equal(verified.accountId, 'acct-456');
    assert.equal(verified.email, 'test@example.com');
  }

  // Mismatched password hash prefix (e.g. password was already changed)
  const rejectedHash = verifyPasswordResetToken(token, 'newhash_different_123', secret);
  assert.equal(rejectedHash.valid, false);
  if (!rejectedHash.valid) {
    assert.equal(rejectedHash.reason, 'invalid_signature');
  }

  // Expired token
  const expiredToken = createPasswordResetToken({
    accountId: 'acct-456',
    email: 'test@example.com',
    expiresInSeconds: -10,
    secret,
  });
  const rejectedExpired = verifyPasswordResetToken(expiredToken, undefined, secret);
  assert.equal(rejectedExpired.valid, false);
  if (!rejectedExpired.valid) {
    assert.equal(rejectedExpired.reason, 'expired');
  }
});
