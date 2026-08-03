import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GoogleGmailProvider } from '../src/email/gmail/google.js';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('Google Gmail adapter exchanges OAuth code and binds the stable account identity', async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input); calls.push(url);
    if (url === 'https://token.test') return response({ access_token: 'access', refresh_token: 'refresh', scope: 'https://www.googleapis.com/auth/gmail.readonly' });
    if (url === 'https://userinfo.test') return response({ sub: 'google-subject', email: 'creator@example.com', email_verified: true });
    throw new Error(`unexpected ${url}`);
  };
  const provider = new GoogleGmailProvider('client', 'secret', { fetch: fetcher, tokenEndpoint: 'https://token.test', userInfoEndpoint: 'https://userinfo.test' });
  const exchange = await provider.exchangeCode({ code: 'one-time-code', redirectUri: 'https://missa.test/callback', codeVerifier: 'pkce-verifier' });
  assert.deepEqual(exchange, { googleSubjectId: 'google-subject', accountEmail: 'creator@example.com', refreshToken: 'refresh', grantedScopes: ['https://www.googleapis.com/auth/gmail.readonly'] });
  assert.deepEqual(calls, ['https://token.test', 'https://userinfo.test']);
});

test('Google Gmail adapter normalizes message text and keeps attachment bodies out of the envelope', async () => {
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('/messages/message-1')) return response({ id: 'message-1', internalDate: '1780000000000', payload: { headers: [{ name: 'From', value: 'editor@example.org' }, { name: 'To', value: 'creator@example.com' }, { name: 'Subject', value: 'Submission received' }, { name: 'Message-ID', value: '<message-1@example.org>' }], parts: [{ mimeType: 'text/plain', body: { data: Buffer.from('We received your submission.').toString('base64url') } }, { filename: 'portfolio.pdf', mimeType: 'application/pdf', body: { attachmentId: 'attachment-1', size: 42 } }] } });
    throw new Error(`unexpected ${url}`);
  };
  const provider = new GoogleGmailProvider('client', 'secret', { fetch: fetcher, gmailApiBase: 'https://gmail.test/v1' });
  const envelope = await provider.getMessageText('access', 'message-1');
  assert.equal(envelope.provider, 'gmail-sync');
  assert.equal(envelope.textBody, 'We received your submission.');
  assert.equal(envelope.attachments[0]?.filename, 'portfolio.pdf');
  assert.equal(envelope.attachments[0]?.byteLength, 42);
  assert.equal(envelope.attachments[0]?.sha256, undefined);
});
