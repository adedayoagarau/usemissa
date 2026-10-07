import assert from 'node:assert/strict';
import test from 'node:test';
import type { CreatorNotificationPreferences } from '@missa/radar-adapters';
import type { RadarEngine } from '@missa/radar-engine';
import {
  creatorReminderPathAuthoritative,
  deadlineReminderEmailAllowed,
  deliverPendingDeadlineEmails,
} from './alert-delivery';

const untouchedEngine = new Proxy({} as RadarEngine, {
  get() {
    throw new Error('the engine should not be read');
  },
});

function withEnv(values: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return run().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

const preference = (overrides: Partial<CreatorNotificationPreferences>): CreatorNotificationPreferences => ({
  inAppEnabled: true,
  emailEnabled: true,
  digestCadence: 'weekly',
  savedSearchEnabled: true,
  followEnabled: true,
  reminderEnabled: true,
  providerState: 'available',
  revision: 1,
  ...overrides,
});

test('legacy deadline emails stand down when the creator reminder path is authoritative', async () => {
  await withEnv(
    { MISSA_CREATOR_RELATIONAL_AUTHORITY: '1', RESEND_API_KEY: 'key', RESEND_FROM: 'Missa <hi@example.com>', DATABASE_URL: 'postgres://db' },
    async () => {
      assert.equal(creatorReminderPathAuthoritative(), true);
      const report = await deliverPendingDeadlineEmails(untouchedEngine);
      assert.equal(report.status, 'skipped');
      assert.equal(report.reason, 'Creator reminder emails are authoritative');
    },
  );
});

test('legacy deadline emails never send without stored preferences', async () => {
  await withEnv(
    { MISSA_CREATOR_RELATIONAL_AUTHORITY: undefined, RESEND_API_KEY: 'key', RESEND_FROM: 'Missa <hi@example.com>', DATABASE_URL: undefined },
    async () => {
      const report = await deliverPendingDeadlineEmails(untouchedEngine);
      assert.equal(report.status, 'skipped');
      assert.equal(report.reason, 'Email preferences are unavailable');
    },
  );
});

test('deadline reminder emails need email, reminders, a working provider and a plan with reminder email', () => {
  assert.equal(deadlineReminderEmailAllowed(preference({}), 'plus'), true);
  assert.equal(deadlineReminderEmailAllowed(preference({}), 'pro'), true);
  assert.equal(deadlineReminderEmailAllowed(preference({ emailEnabled: false }), 'plus'), false);
  assert.equal(deadlineReminderEmailAllowed(preference({ reminderEnabled: false }), 'plus'), false);
  assert.equal(deadlineReminderEmailAllowed(preference({ providerState: 'unavailable' }), 'plus'), false);
});

test('Free keeps deadline reminders in the Inbox, whatever its email settings say', () => {
  assert.equal(deadlineReminderEmailAllowed(preference({}), 'free'), false);
});
