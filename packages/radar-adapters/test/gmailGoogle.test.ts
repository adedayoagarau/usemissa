import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GoogleGmailProvider } from '../src/email/gmail/google.js';

const scope = 'https://www.googleapis.com/auth/gmail.readonly';
const encoded = (value: string) => Buffer.from(value, 'utf8').toString('base64url');

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('Google Gmail adapter exchanges OAuth, resolves stable identity, and refreshes without logging secrets', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const request: typeof fetch = async (input, init = {}) => {
    const url = String(input); calls.push({ url, init });
    if (url === 'https://oauth.test/token') {
      const params = new URLSearchParams(String(init?.body));
      return params.get('grant_type') === 'refresh_token' ? json({ access_token: 'refreshed-access-token', expires_in: 3600 }) : json({ access_token: 'access-token', refresh_token: 'refresh-token', scope });
    }
    if (url === 'https://identity.test/userinfo') return json({ sub: 'google-subject-123', email: 'creator@example.com' });
    throw new Error(`unexpected ${url}`);
  };
  const provider = new GoogleGmailProvider('client-id', 'client-secret', { fetch: request, tokenEndpoint: 'https://oauth.test/token', userInfoEndpoint: 'https://identity.test/userinfo' });
  const exchange = await provider.exchangeCode({ code: 'one-time-code', redirectUri: 'https://missa.test/callback', codeVerifier: 'pkce-verifier' });
  assert.deepEqual(exchange, { googleSubjectId: 'google-subject-123', accountEmail: 'creator@example.com', refreshToken: 'refresh-token', grantedScopes: [scope] });
  const tokenBody = String(calls[0]?.init.body);
  assert.match(tokenBody, /grant_type=authorization_code/);
  assert.match(tokenBody, /code=one-time-code/);
  assert.match(tokenBody, /client_secret=client-secret/);
  const refreshed = await provider.refreshAccessToken('refresh-token');
  assert.ok(refreshed.accessToken);
  assert.ok(Date.parse(refreshed.expiresAt) > Date.now());
});

test('Google Gmail adapter bounds list queries and normalizes metadata, MIME text, attachments, and history', async () => {
  const calls: string[] = [];
  const request: typeof fetch = async (input) => {
    const url = String(input); calls.push(url);
    if (url.includes('/users/me/watch')) return json({ historyId: 'history-9', expiration: String(Date.now() + 86_400_000) });
    if (url.includes('/users/me/stop')) return new Response(null, { status: 204 });
    if (url.includes('/users/me/messages?')) return json({ messages: [{ id: 'message-1', threadId: 'thread-1' }, { id: '' }] });
    if (url.includes('format=metadata')) return json({ id: 'message-1', internalDate: '1760000000000', payload: { headers: [{ name: 'From', value: 'Editor <editor@example.org>' }, { name: 'Subject', value: 'Submission update' }, { name: 'Date', value: 'Tue, 7 Oct 2025 12:00:00 +0000' }] } });
    if (url.includes('format=full')) return json({ id: 'message-1', internalDate: '1760000000000', payload: { headers: [{ name: 'From', value: 'Editor <editor@example.org>' }, { name: 'To', value: 'creator@example.com' }, { name: 'Subject', value: 'Submission update' }, { name: 'Message-ID', value: '<safe@example.org>' }, { name: 'Authentication-Results', value: 'spf=pass dkim=pass dmarc=pass' }], mimeType: 'multipart/alternative', parts: [{ mimeType: 'text/plain', body: { data: encoded('Thank you for your submission.') } }, { mimeType: 'text/html', body: { data: encoded('<p>Thank you for your <strong>submission</strong>.</p><script>secret()</script>') } }, { mimeType: 'application/pdf', filename: 'work.pdf', body: { attachmentId: 'attachment-1', size: 1234 } }] } });
    if (url.includes('/users/me/history')) return json({ historyId: 'history-10', history: [{ messagesAdded: [{ message: { id: 'message-1', threadId: 'thread-1' } }, { message: { id: 'message-2' } }] }] });
    throw new Error(`unexpected ${url}`);
  };
  const provider = new GoogleGmailProvider('client-id', 'client-secret', { fetch: request, gmailApiBase: 'https://gmail.test/v1' });
  const listed = await provider.listMessages('access-token', { after: '1750000000', labelIds: ['INBOX'], senderDomain: 'example.org', max: 9999 });
  assert.deepEqual(listed, [{ id: 'message-1', threadId: 'thread-1' }]);
  assert.match(calls[0]!, /maxResults=500/);
  assert.match(calls[0]!, /after%3A1750000000/);
  assert.equal((await provider.getMessageMetadata('access-token', 'message-1')).subject, 'Submission update');
  const envelope = await provider.getMessageText('access-token', 'message-1');
  assert.equal(envelope.providerMessageId, 'message-1');
  assert.equal(envelope.textBody, 'Thank you for your submission.');
  assert.equal(envelope.htmlBody, undefined);
  assert.deepEqual(envelope.attachments, [{ filename: 'work.pdf', contentType: 'application/pdf', byteLength: 1234 }]);
  assert.deepEqual(envelope.authResults, { spf: 'pass', dkim: 'pass', dmarc: 'pass' });
  assert.deepEqual(await provider.listHistory('access-token', 'history-9'), { historyId: 'history-10', messageIds: ['message-1', 'message-2'] });
  const previousTopic = process.env.GMAIL_PUBSUB_TOPIC;
  process.env.GMAIL_PUBSUB_TOPIC = 'projects/test/topics/gmail';
  const watch = await provider.watchMailbox('access-token'); assert.equal(watch.historyId, 'history-9');
  if (previousTopic === undefined) delete process.env.GMAIL_PUBSUB_TOPIC; else process.env.GMAIL_PUBSUB_TOPIC = previousTopic;
  await provider.stopWatch('access-token');
});

test('Google Gmail adapter uses tokeninfo identity fallback and fails closed on scope mismatch', async () => {
  let userInfoAttempts = 0;
  const request: typeof fetch = async (input) => {
    const url = String(input);
    if (url === 'https://oauth.test/token') return json({ access_token: 'access-token', refresh_token: 'refresh-token', scope });
    if (url === 'https://identity.test/userinfo') { userInfoAttempts += 1; return json({ error: 'insufficient_scope' }, 403); }
    if (url.startsWith('https://identity.test/tokeninfo')) return json({ user_id: 'google-subject-456', email: 'fallback@example.com' });
    throw new Error(`unexpected ${url}`);
  };
  const provider = new GoogleGmailProvider('client-id', 'client-secret', { fetch: request, tokenEndpoint: 'https://oauth.test/token', userInfoEndpoint: 'https://identity.test/userinfo', tokenInfoEndpoint: 'https://identity.test/tokeninfo' });
  const exchange = await provider.exchangeCode({ code: 'code', redirectUri: 'https://missa.test/callback', codeVerifier: 'verifier' });
  assert.equal(userInfoAttempts, 1);
  assert.equal(exchange.googleSubjectId, 'google-subject-456');
  assert.equal(exchange.accountEmail, 'fallback@example.com');

  const bad = new GoogleGmailProvider('client-id', 'client-secret', { fetch: async (input) => String(input) === 'https://oauth.test/token' ? json({ access_token: 'access-token', refresh_token: 'refresh-token', scope: 'https://www.googleapis.com/auth/gmail.modify' }) : json({ sub: 'subject', email: 'fallback@example.com' }), tokenEndpoint: 'https://oauth.test/token' });
  await assert.rejects(() => bad.exchangeCode({ code: 'code', redirectUri: 'https://missa.test/callback', codeVerifier: 'verifier' }), /gmail_scope_mismatch/);
});
