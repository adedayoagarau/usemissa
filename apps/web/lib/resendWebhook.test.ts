import assert from 'node:assert/strict';
import test from 'node:test';
import type { WebhookEventPayload } from 'resend';
import { RESEND_OUTBOUND_WEBHOOK_EVENTS, resendProviderEventRecord } from './resendWebhook.js';

test('Resend webhook event selection covers outbound delivery and engagement states', () => {
  assert.deepEqual(RESEND_OUTBOUND_WEBHOOK_EVENTS, [
    'email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced', 'email.complained',
    'email.failed', 'email.suppressed', 'email.opened', 'email.clicked',
  ]);
});

test('Resend webhook records omit recipient, subject, click, and IP data', () => {
  const record = resendProviderEventRecord({
    type: 'email.clicked',
    created_at: '2026-08-12T00:00:00.000Z',
    data: {
      email_id: 'email_123', created_at: '2026-08-12T00:00:00.000Z', from: 'Missa <hello@usemissa.com>',
      to: ['private@example.com'], subject: 'Private subject', click: { ipAddress: '127.0.0.1', link: 'https://private.example', timestamp: '2026-08-12T00:00:00.000Z', userAgent: 'private' },
    },
  } as WebhookEventPayload);
  assert.deepEqual(record, { eventType: 'email.clicked', providerMessageId: 'email_123', occurredAt: '2026-08-12T00:00:00.000Z', metadata: {} });
});

test('Resend webhook records retain bounded terminal failure facts', () => {
  const record = resendProviderEventRecord({
    type: 'email.bounced',
    created_at: '2026-08-12T00:00:00.000Z',
    data: {
      email_id: 'email_456', created_at: '2026-08-12T00:00:00.000Z', from: 'Missa <hello@usemissa.com>',
      to: ['private@example.com'], subject: 'Private subject', bounce: { message: 'Mailbox unavailable', type: 'Permanent', subType: 'General' },
    },
  } as WebhookEventPayload);
  assert.deepEqual(record?.metadata, { reason: 'Mailbox unavailable', failureType: 'Permanent', failureSubtype: 'General' });
});
