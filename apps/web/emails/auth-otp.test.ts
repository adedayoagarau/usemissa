import assert from 'node:assert/strict';
import test from 'node:test';
import { renderAuthOtpEmail } from './auth-otp';

test('renders an accessible, code-first email-verification message', () => {
  const rendered = renderAuthOtpEmail({
    email: 'Creator@Example.com',
    code: '123456',
    type: 'email-verification',
    expiresInMinutes: 10,
  });

  assert.equal(rendered.subject, 'Verify your email for Missa');
  assert.match(rendered.html, /<html lang="en" dir="ltr">/u);
  assert.match(rendered.html, /role="presentation"/u);
  assert.match(rendered.html, /aria-label="Verification code 123456"/u);
  assert.match(rendered.html, />123456</u);
  assert.match(rendered.html, /creator@example\.com/u);
  assert.match(rendered.html, /expires in <strong>10 minutes<\/strong>/u);
  assert.doesNotMatch(rendered.html, /unsubscribe/iu);
  assert.match(rendered.text, /123456/u);
  assert.match(rendered.text, /expires in 10 minutes/u);
});

test('uses purpose-specific transactional copy for every Neon OTP type', () => {
  const signIn = renderAuthOtpEmail({
    email: 'creator@example.com',
    code: '654321',
    type: 'sign-in',
    expiresInMinutes: 5,
  });
  const reset = renderAuthOtpEmail({
    email: 'creator@example.com',
    code: '654321',
    type: 'forget-password',
    expiresInMinutes: 5,
  });

  assert.equal(signIn.subject, 'Your Missa sign-in code');
  assert.match(signIn.html, /Sign in to Missa/u);
  assert.equal(reset.subject, 'Reset your Missa password');
  assert.match(reset.html, /Reset your password/u);
});

test('refuses malformed authentication codes', () => {
  assert.throws(
    () =>
      renderAuthOtpEmail({
        email: 'creator@example.com',
        code: '<script>',
        type: 'email-verification',
        expiresInMinutes: 10,
      }),
    /exactly six digits/u,
  );
});
