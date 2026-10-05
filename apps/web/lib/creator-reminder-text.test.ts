import assert from 'node:assert/strict';
import test from 'node:test';
import { deliverCreatorReminderTexts, renderReminderText, REMINDER_TEXT_LIMIT, type ReminderTextNotice } from './creator-reminder-text';
import { smsLength } from './sms';

const now = new Date('2026-10-03T09:00:00.000Z');
const notice: ReminderTextNotice = {
  kind: 'deadline-reminder',
  opportunityId: 'opp_fixture',
  title: 'Poetry Fellowship 2027',
  organizationName: 'Tidal Arts Trust',
  deadline: '2026-10-09',
  trackedStatus: 'preparing',
};

test('a deadline reminder names the call, the day, the Tracker status and the Tracker link', () => {
  assert.equal(
    renderReminderText(notice, now),
    'Missa: Poetry Fellowship 2027 closes Fri 9 Oct. In your Tracker: preparing. www.usemissa.com/tracker?application=opp_fixture Reply STOP to end.',
  );
  assert.match(renderReminderText({ ...notice, deadline: '2026-10-03', trackedStatus: null }, now), /closes today\. www\.usemissa\.com/);
  assert.match(renderReminderText({ ...notice, deadline: '2026-10-04' }, now), /closes tomorrow\./);
});

test('every notice kind has wording and ends with the opt-out line', () => {
  const kinds: Array<[ReminderTextNotice['kind'], RegExp]> = [
    ['deadline-changed', /^Missa: Poetry Fellowship 2027 has a new deadline, Fri 9 Oct\. /],
    ['call-closed', /^Missa: Poetry Fellowship 2027 has closed early\. /],
    ['response-overdue', /^Missa: Any reply from Tidal Arts Trust about Poetry Fellowship 2027\? Log it: /],
  ];
  for (const [kind, pattern] of kinds) {
    const text = renderReminderText({ ...notice, kind }, now);
    assert.match(text, pattern);
    assert.ok(text.endsWith('Reply STOP to end.'));
  }
});

test('long titles are shortened so the text stays in one 160-character GSM-7 segment', () => {
  const long = { ...notice, title: 'The Extraordinarily Long International Residency for Emerging and Mid-Career Writers, Translators and Editors — Spring “Open” Session', organizationName: 'A Very Long Organisation Name That Keeps Going On And On' };
  for (const kind of ['deadline-reminder', 'deadline-changed', 'call-closed', 'response-overdue'] as const) {
    const text = renderReminderText({ ...long, kind }, now);
    assert.ok(smsLength(text) <= REMINDER_TEXT_LIMIT, `${kind}: ${smsLength(text)} ${text}`);
    assert.match(text, /\.\.\./);
    assert.match(text, /usemissa\.com\/tracker/);
    assert.ok(text.endsWith('Reply STOP to end.'));
    assert.doesNotMatch(text, /[“”—]/);
  }
});

test('the status hint is dropped before the title is shortened', () => {
  const title = 'Short Fiction Grant for New Voices Across the Commonwealth 2027';
  const text = renderReminderText({ ...notice, title }, now);
  assert.ok(smsLength(text) <= REMINDER_TEXT_LIMIT);
  assert.ok(text.includes(title));
  assert.doesNotMatch(text, /In your Tracker/);
});

test('delivery is skipped without Telnyx configuration', async () => {
  assert.deepEqual(await deliverCreatorReminderTexts(now, { env: {} }), { status: 'skipped', sent: 0, failed: 0, skipped: 0, reason: 'Telnyx is not configured' });
  assert.equal((await deliverCreatorReminderTexts(now, { env: { TELNYX_API_KEY: 'key', TELNYX_MESSAGING_PROFILE_ID: 'profile' } })).reason, 'The text message ledger is unavailable');
});
