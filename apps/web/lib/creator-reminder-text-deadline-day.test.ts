import assert from 'node:assert/strict';
import test from 'node:test';
import { smsLength } from './sms';
import { REMINDER_TEXT_LIMIT, renderReminderText } from './creator-reminder-text';

test('the deadline-day alarm text says the call closes today within one segment', () => {
  const text = renderReminderText({ kind: 'deadline-day', opportunityId: 'opp-1', title: 'Harbor Studio Residency', organizationName: 'Harbor', deadline: '2026-10-04', trackedStatus: 'preparing' }, new Date('2026-10-04T08:00:00Z'));
  assert.match(text, /^Missa: Harbor Studio Residency closes today\./);
  assert.match(text, /Reply STOP to end\.$/);
  assert.ok(smsLength(text) <= REMINDER_TEXT_LIMIT);
  const long = renderReminderText({ kind: 'deadline-day', opportunityId: 'opp-1', title: 'A very long call title '.repeat(10), organizationName: 'Harbor', deadline: '2026-10-04', trackedStatus: null });
  assert.ok(smsLength(long) <= REMINDER_TEXT_LIMIT);
});
