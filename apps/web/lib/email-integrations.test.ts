import assert from 'node:assert/strict';
import test from 'node:test';
import { emailForwardingEnabled, emailIntegrationFlags, gmailSyncEnabled } from './email-integrations';
import { GET as gmailStart } from '../app/api/me/email-sync/gmail/start/route';
import { POST as forwardedEmail } from '../app/api/inbound/email/forwarded/route';
import { GET as forwardingAddress } from '../app/api/me/email-forwarding/route';
import { GET as gmailCron } from '../app/api/cron/gmail-sync/route';

delete process.env.MISSA_GMAIL_SYNC_ENABLED;
delete process.env.MISSA_EMAIL_FORWARDING_ENABLED;

test('email integrations are off unless explicitly enabled', () => {
  assert.equal(gmailSyncEnabled({}), false);
  assert.equal(emailForwardingEnabled({}), false);
  assert.equal(gmailSyncEnabled({ MISSA_GMAIL_SYNC_ENABLED: 'true' }), false);
  assert.deepEqual(emailIntegrationFlags({ MISSA_GMAIL_SYNC_ENABLED: '1', MISSA_EMAIL_FORWARDING_ENABLED: '1' }), {
    gmailSync: true,
    emailForwarding: true,
  });
});

test('Gmail Sync and forwarding routes return 404 while their flags are off', async () => {
  const responses = await Promise.all([
    gmailStart(new Request('https://usemissa.com/api/me/email-sync/gmail/start')),
    gmailCron(new Request('https://usemissa.com/api/cron/gmail-sync', { headers: { authorization: 'Bearer x' } })),
    forwardedEmail(new Request('https://usemissa.com/api/inbound/email/forwarded', { method: 'POST', body: '{}' })),
    forwardingAddress(new Request('https://usemissa.com/api/me/email-forwarding')),
  ]);
  for (const response of responses) assert.equal(response.status, 404);
});
