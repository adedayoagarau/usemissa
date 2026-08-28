import assert from 'node:assert/strict';
import test from 'node:test';
import { billingEventType, crmNoteEvidence, platformAdminFoundationsSchema, platformAgentControlPrecondition, platformAgentControlReplayStatus, platformAgentControlRequestIdentity, platformBillingReceiptDigest, providerEventEffectStatus, reducePlatformMessageProviderEvents, sanitizePlatformMessageError, summarizeDurableCrmRows } from '../src/platformAdminFoundations.js';

test('message provider errors redact personal, network, URL, and credential values while retaining safe context', () => {
  const original = 'recipient artist@example.com sender=staff@usemissa.com diagnostic https://provider.test/events/evt_123 click http://click.test/a?token=visible ipv4 203.0.113.42 ipv6 2001:db8:85a3::8a2e:370:7334 database postgres://dbuser:dbpass@db.test/missa password="open sesame" category=recipient_rejected';
  const sanitized = sanitizePlatformMessageError(original);

  assert.ok(sanitized);
  for (const prohibited of ['artist@example.com', 'staff@usemissa.com', 'https://provider.test/events/evt_123', 'http://click.test/a?token=visible', '203.0.113.42', '2001:db8:85a3::8a2e:370:7334', 'postgres://dbuser:dbpass@db.test/missa', 'open sesame']) {
    assert.equal(sanitized.includes(prohibited), false, prohibited);
  }
  assert.match(sanitized, /category=recipient_rejected/);
  assert.ok(sanitized.length <= 500);
});

test('message provider error redaction handles bracketed and punctuated IPv6 plus database URL variants', () => {
  const sanitized = sanitizePlatformMessageError('timeout from [2001:db8::1] or 2001:db8::2. via redis://user:pass@cache.test/0; api_key: abc-123 safe=timeout');

  assert.equal(sanitized?.includes('2001:db8::1'), false);
  assert.equal(sanitized?.includes('2001:db8::2'), false);
  assert.equal(sanitized?.includes('redis://user:pass@cache.test/0'), false);
  assert.equal(sanitized?.includes('abc-123'), false);
  assert.match(sanitized ?? '', /safe=timeout/);
});

test('billing event classification keeps refunds and disputes distinct from subscription state', () => {
  assert.equal(billingEventType('customer.subscription.updated'), 'subscription');
  assert.equal(billingEventType('invoice.payment_succeeded'), 'invoice');
  assert.equal(billingEventType('charge.refunded'), 'refund');
  assert.equal(billingEventType('charge.dispute.created'), 'dispute');
  assert.equal(billingEventType('account.updated'), 'connect');
});

test('Stripe receipt digest replays only an identical allowlisted envelope', () => {
  const receipt = { provider: 'stripe', providerEventId: 'evt_1', eventType: 'charge.succeeded', entryType: 'payment', status: 'received' as const, organizationId: 'org_1', providerObjectId: 'ch_1', providerObjectType: 'charge', amountCents: 100, currency: 'USD', customerId: 'cus_1', subscriptionId: 'sub_1', invoiceId: 'in_1', occurredAt: '2026-08-27T00:00:00.000Z' };
  assert.equal(platformBillingReceiptDigest(receipt), platformBillingReceiptDigest({ ...receipt }));
  assert.notEqual(platformBillingReceiptDigest(receipt), platformBillingReceiptDigest({ ...receipt, amountCents: 101 }));
  assert.notEqual(platformBillingReceiptDigest(receipt), platformBillingReceiptDigest({ ...receipt, status: 'ignored' }));
  for (const field of ['customerId', 'subscriptionId', 'invoiceId', 'providerObjectType'] as const) {
    assert.notEqual(platformBillingReceiptDigest(receipt), platformBillingReceiptDigest({ ...receipt, [field]: `${receipt[field]}_changed` }), field);
  }
  assert.equal(platformBillingReceiptDigest(receipt), platformBillingReceiptDigest({ ...receipt, ignoredPayload: 'secret' } as typeof receipt));
});

test('CRM durable summary excludes separately projected compatibility activity', () => {
  const durable = [{ id: 'crm_1', subjectType: 'organization', subjectId: 'org_1', eventType: 'note', source: 'operator', title: 'Note', createdAt: '2026-08-27T00:00:00.000Z' }];
  const compatibility = [{ id: 'audit_1', subjectType: 'organization', subjectId: 'org_2', eventType: 'audit', source: 'system-audit', title: 'Legacy' }];
  assert.deepEqual(summarizeDurableCrmRows(durable), { timelineEvents: 1, notes: 1, accountsWithActivity: 0, organizationsWithActivity: 1, latestAt: '2026-08-27T00:00:00.000Z' });
  assert.equal(summarizeDurableCrmRows(durable).timelineEvents, 1);
  assert.equal(compatibility.length, 1);
});

test('CRM note audit and outbox evidence contains no note title or content', () => {
  assert.deepEqual(crmNoteEvidence('crm_1', 'organization'), { eventId: 'crm_1', eventType: 'note', subjectType: 'organization' });
});

test('agent worker preconditions reject expiry and stale policy before target mutation', () => {
  assert.equal(platformAgentControlPrecondition({ expiresAt: '2026-08-26T00:00:00.000Z', policyVersion: 'agent-control.v1' }, Date.parse('2026-08-27T00:00:00.000Z')), 'expired');
  assert.equal(platformAgentControlPrecondition({ expiresAt: '2026-08-28T00:00:00.000Z', policyVersion: 'agent-control.v0' }, Date.parse('2026-08-27T00:00:00.000Z')), 'stale-policy');
  assert.equal(platformAgentControlPrecondition({ expiresAt: '2026-08-28T00:00:00.000Z', policyVersion: 'agent-control.v1' }, Date.parse('2026-08-27T00:00:00.000Z')), undefined);
});

test('agent control idempotency replays normalized exact requests and conflicts when reason changes', () => {
  const request = { actorAccountId: 'acct_1', targetType: 'review-job' as const, targetId: 'job_1', action: 'requeue' as const, expectedState: 'failed', reason: 'Retry after provider recovery' };
  const storedIdentity = platformAgentControlRequestIdentity(request);

  assert.deepEqual(platformAgentControlReplayStatus(storedIdentity, platformAgentControlRequestIdentity({ ...request })), { status: 'replayed', idempotent: true });
  assert.equal(platformAgentControlRequestIdentity({ ...request, reason: '  Retry after provider recovery  ' }), storedIdentity, 'reason normalization matches persistence');
  assert.equal(platformAgentControlRequestIdentity({ ...request, reason: '   ' }), platformAgentControlRequestIdentity({ ...request, reason: null }), 'blank reasons persist and identify as null');
  assert.deepEqual(platformAgentControlReplayStatus(storedIdentity, platformAgentControlRequestIdentity({ ...request, reason: 'Retry after operator review' })), { status: 'conflict', idempotent: false });
});

test('provider delivery reduction distinguishes acceptance, delivery, and adverse evidence', () => {
  assert.equal(providerEventEffectStatus('email.sent'), 'accepted');
  assert.equal(providerEventEffectStatus('email.delivered'), 'delivered');
  assert.equal(providerEventEffectStatus('email.opened'), undefined);
  assert.equal(providerEventEffectStatus('email.clicked'), undefined);
  assert.equal(reducePlatformMessageProviderEvents(['email.delivered', 'email.opened']), 'delivered');
  assert.equal(reducePlatformMessageProviderEvents(['email.delivered', 'email.bounced']), 'bounced');
  assert.equal(reducePlatformMessageProviderEvents(['email.bounced', 'email.sent']), 'bounced');
  assert.equal(reducePlatformMessageProviderEvents(['email.opened']), 'unknown');
});

test('platform foundation schema carries idempotency and control boundaries', () => {
  assert.match(platformAdminFoundationsSchema, /platform_message_effects/);
  assert.match(platformAdminFoundationsSchema, /platform_message_attempts/);
  assert.match(platformAdminFoundationsSchema, /platform_message_provider_events/);
  assert.match(platformAdminFoundationsSchema, /tenant_key/);
  assert.match(platformAdminFoundationsSchema, /recipient_account_id/);
  assert.match(platformAdminFoundationsSchema, /template_version/);
  assert.match(platformAdminFoundationsSchema, /'accepted','delivered','bounced'/);
  assert.match(platformAdminFoundationsSchema, /platform_billing_ledger/);
  assert.match(platformAdminFoundationsSchema, /platform_agent_control_requests/);
  assert.match(platformAdminFoundationsSchema, /policy_version/);
  assert.match(platformAdminFoundationsSchema, /policy_version/);
  assert.match(platformAdminFoundationsSchema, /platform_crm_contacts/);
  assert.match(platformAdminFoundationsSchema, /platform_crm_tasks/);
  assert.match(platformAdminFoundationsSchema, /platform_analytics_events/);
  assert.match(platformAdminFoundationsSchema, /radar_agent_runs_lifecycle_idx/);
});

test('provider email events map terminal and observational states without inventing delivery', () => {
  assert.equal(providerEventEffectStatus('email.sent'), 'accepted');
  assert.equal(providerEventEffectStatus('email.delivered'), 'delivered');
  assert.equal(providerEventEffectStatus('email.opened'), undefined);
  assert.equal(providerEventEffectStatus('email.failed'), 'failed');
  assert.equal(providerEventEffectStatus('email.bounced'), 'bounced');
  assert.equal(providerEventEffectStatus('domain.updated'), undefined);
});
