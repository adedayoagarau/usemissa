import assert from 'node:assert/strict';
import test from 'node:test';
import { renderPasswordResetEmail } from './password-reset';

test('renderPasswordResetEmail generates valid HTML and plain text with reset link', () => {
  const rendered = renderPasswordResetEmail({
    accountId: 'acct-123',
    email: 'user@example.com',
    resetToken: 'test-reset-token-xyz',
    displayName: 'Jane Doe',
  });

  assert.equal(rendered.subject, 'Reset your Missa password');
  assert.match(rendered.html, /Hello Jane Doe,/);
  assert.match(rendered.html, /user@example\.com/);
  assert.match(rendered.html, /reset-password\?token=test-reset-token-xyz/);
  assert.match(rendered.html, /Reset password/);
  assert.match(rendered.text, /Hello Jane Doe,/);
  assert.match(rendered.text, /reset-password\?token=test-reset-token-xyz/);
});
