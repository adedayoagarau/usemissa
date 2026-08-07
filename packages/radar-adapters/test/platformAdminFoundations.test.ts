import assert from 'node:assert/strict';
import test from 'node:test';
import { billingEventType, platformAdminFoundationsSchema } from '../src/platformAdminFoundations.js';

test('billing event classification keeps refunds and disputes distinct from subscription state', () => {
  assert.equal(billingEventType('customer.subscription.updated'), 'subscription');
  assert.equal(billingEventType('invoice.payment_succeeded'), 'invoice');
  assert.equal(billingEventType('charge.refunded'), 'refund');
  assert.equal(billingEventType('charge.dispute.created'), 'dispute');
  assert.equal(billingEventType('account.updated'), 'connect');
});

test('platform foundation schema carries idempotency and control boundaries', () => {
  assert.match(platformAdminFoundationsSchema, /platform_message_effects/);
  assert.match(platformAdminFoundationsSchema, /platform_message_attempts/);
  assert.match(platformAdminFoundationsSchema, /platform_billing_ledger/);
  assert.match(platformAdminFoundationsSchema, /platform_agent_control_requests/);
  assert.match(platformAdminFoundationsSchema, /policy_version/);
  assert.match(platformAdminFoundationsSchema, /policy_version/);
  assert.match(platformAdminFoundationsSchema, /platform_crm_contacts/);
  assert.match(platformAdminFoundationsSchema, /platform_crm_tasks/);
  assert.match(platformAdminFoundationsSchema, /platform_analytics_events/);
  assert.match(platformAdminFoundationsSchema, /radar_agent_runs_lifecycle_idx/);
});
