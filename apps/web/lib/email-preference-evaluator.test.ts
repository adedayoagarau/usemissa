import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEmailDelivery } from './email-preference-evaluator';
import type { CreatorNotificationPreferences } from '@missa/radar-adapters';

const defaultPrefs: CreatorNotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: true,
  digestCadence: 'daily',
  savedSearchEnabled: true,
  followEnabled: true,
  reminderEnabled: true,
  providerState: 'available',
  revision: 1,
};

test('security_critical messages are allowed even when user opted out of email', () => {
  const result = evaluateEmailDelivery({
    accountId: 'acc_1',
    category: 'security_critical',
    preference: { ...defaultPrefs, emailEnabled: false },
    accountActive: true,
  });

  assert.equal(result.allowed, true);
});

test('application_actionable messages are allowed for active users', () => {
  const result = evaluateEmailDelivery({
    accountId: 'acc_1',
    category: 'application_actionable',
    preference: { ...defaultPrefs, emailEnabled: false },
    accountActive: true,
  });

  assert.equal(result.allowed, true);
});

test('suppressed recipients are blocked across all categories', () => {
  const result = evaluateEmailDelivery({
    accountId: 'acc_1',
    category: 'security_critical',
    recipientSuppressed: true,
  });

  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.reason, 'suppressed');
  }
});

test('inactive accounts are blocked', () => {
  const result = evaluateEmailDelivery({
    accountId: 'acc_1',
    category: 'notification_digest',
    accountActive: false,
    preference: defaultPrefs,
  });

  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.reason, 'account_inactive');
  }
});

test('notification_digest respects digestCadence and category flags', () => {
  // Digest cadence off
  const offResult = evaluateEmailDelivery({
    accountId: 'acc_1',
    category: 'notification_digest',
    preference: { ...defaultPrefs, digestCadence: 'off' },
  });
  assert.equal(offResult.allowed, false);
  if (!offResult.allowed) assert.equal(offResult.reason, 'digest_cadence_off');

  // Saved search disabled
  const searchResult = evaluateEmailDelivery({
    accountId: 'acc_1',
    category: 'notification_digest',
    subtype: 'saved_search',
    preference: { ...defaultPrefs, savedSearchEnabled: false },
  });
  assert.equal(searchResult.allowed, false);
  if (!searchResult.allowed) assert.equal(searchResult.reason, 'saved_search_disabled');

  // Reminders disabled
  const reminderResult = evaluateEmailDelivery({
    accountId: 'acc_1',
    category: 'notification_digest',
    subtype: 'deadline_reminder',
    preference: { ...defaultPrefs, reminderEnabled: false },
  });
  assert.equal(reminderResult.allowed, false);
  if (!reminderResult.allowed) assert.equal(reminderResult.reason, 'reminders_disabled');

  // Valid settings return allowed with cadence
  const validResult = evaluateEmailDelivery({
    accountId: 'acc_1',
    category: 'notification_digest',
    subtype: 'saved_search',
    preference: defaultPrefs,
  });
  assert.equal(validResult.allowed, true);
  if (validResult.allowed) assert.equal(validResult.cadence, 'daily');
});
