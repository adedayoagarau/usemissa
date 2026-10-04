import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultOffsetSubject, defaultOffsetTitle, goneQuietCopy, goneQuietDedupeKey, milestoneTitle, reminderInboxKind, reminderNoticeDedupeKey,
  reminderNoticeReason, relativeDay, shouldNotifyResponseClock, tierEndingTitle, timeToQueryCopy, timeToQueryDedupeKey,
} from './deadline-reminder-copy';
import { responseClock } from './response-clock';

test('reminder kinds map to their Inbox kinds', () => {
  assert.equal(reminderInboxKind('deadline'), 'deadline-reminder');
  assert.equal(reminderInboxKind('preparation'), 'deadline-reminder');
  assert.equal(reminderInboxKind('response'), 'response-overdue');
  assert.equal(reminderInboxKind('deadline-day'), 'deadline-day');
  assert.equal(reminderInboxKind('tier'), 'tier-ending');
  assert.equal(reminderInboxKind('milestone'), 'milestone-due');
});

test('default offsets are named by subject and read plainly', () => {
  assert.equal(defaultOffsetSubject(7), 'offset:7');
  assert.equal(defaultOffsetTitle(0), 'Closes today');
  assert.equal(defaultOffsetTitle(1), 'Closes tomorrow');
  assert.equal(defaultOffsetTitle(3), 'Closes in 3 days');
  assert.equal(defaultOffsetTitle(7), 'Closes in a week');
  assert.equal(defaultOffsetTitle(14), 'Closes in two weeks');
  assert.equal(reminderNoticeReason('deadline', 'offset:7'), 'Missa adds deadline reminders when you save a call.');
  assert.equal(reminderNoticeReason('deadline', null), 'You scheduled this reminder.');
});

test('relative days name the weekday within a week', () => {
  assert.equal(relativeDay('2026-10-04', '2026-10-04'), 'today');
  assert.equal(relativeDay('2026-10-05', '2026-10-04'), 'tomorrow');
  assert.equal(relativeDay('2026-10-09', '2026-10-06'), 'Friday');
  assert.equal(relativeDay('2026-10-30', '2026-10-04'), 'on Oct 30');
});

test('a tier ending names the saving against the next tier', () => {
  assert.equal(
    tierEndingTitle({ label: 'Early-bird', closesOn: '2026-10-09', today: '2026-10-06', feeCents: 2500, nextLabel: 'Regular', nextFeeCents: 4000 }),
    'Early-bird closes Friday, $15 less than the regular fee',
  );
  assert.equal(
    tierEndingTitle({ label: 'Early', closesOn: '2026-10-07', today: '2026-10-06', feeCents: 1000, nextLabel: 'Standard fee', nextFeeCents: 1250, currency: 'EUR' }),
    'Early closes tomorrow, €2.50 less than the standard fee',
  );
  assert.equal(milestoneTitle(' Final draft ', '2026-10-05', '2026-10-04'), 'Final draft is due tomorrow');
});

test('dedupe keys use kind, subject and date for Missa reminders', () => {
  const base = { id: 'r1', opportunity_id: 'o1', effective_due: '2026-10-04T09:00:00Z' };
  assert.equal(reminderNoticeDedupeKey({ ...base, kind: 'tier', subject_id: 't1', source_deadline: '2026-10-09' }), 'tier-ending:t1:2026-10-09');
  assert.equal(reminderNoticeDedupeKey({ ...base, kind: 'milestone', subject_id: 'ob1', source_deadline: new Date('2026-10-05T00:00:00Z') }), 'milestone-due:ob1:2026-10-05');
  assert.equal(reminderNoticeDedupeKey({ ...base, kind: 'deadline', subject_id: 'offset:7', source_deadline: '2026-10-11' }), 'application-reminder:r1:2026-10-04T09:00:00.000Z');
});

test('a snoozed tier, milestone or deadline-day reminder gets a fresh dedupe key', () => {
  const base = { id: 'r1', opportunity_id: 'o1', source_deadline: '2026-10-09' };
  for (const [kind, subject] of [['tier', 't1'], ['milestone', 'ob1'], ['deadline-day', 'deadline-day:2026-10-09']] as const) {
    const delivered = reminderNoticeDedupeKey({ ...base, kind, subject_id: subject, effective_due: '2026-10-06T09:00:00Z', snoozed_until: null });
    const snoozed = reminderNoticeDedupeKey({ ...base, kind, subject_id: subject, effective_due: '2026-10-07T09:00:00Z', snoozed_until: '2026-10-07T09:00:00Z' });
    assert.notEqual(snoozed, delivered, kind);
    assert.ok(snoozed.startsWith(`${delivered}:`), kind);
  }
});

test('gone quiet sends one notice per quiet period', () => {
  assert.equal(goneQuietDedupeKey('t1', '2026-09-01', 21, 21), goneQuietDedupeKey('t1', '2026-09-01', 30, 21));
  assert.notEqual(goneQuietDedupeKey('t1', '2026-09-01', 30, 21), goneQuietDedupeKey('t1', '2026-09-01', 42, 21));
  assert.notEqual(goneQuietDedupeKey('t1', '2026-09-01', 30, 21), goneQuietDedupeKey('t1', '2026-09-20', 30, 21), 'new activity starts a new period');
  const copy = goneQuietCopy({ applicationTitle: 'Studio grant', periodDays: 21, deadline: '2026-11-03' });
  assert.equal(copy.title, 'No activity in 3 weeks');
  assert.match(copy.body, /^Studio grant closes Nov 3(, 2026)?\. Pick it up again when you're ready\.$/);
  assert.equal(goneQuietCopy({ applicationTitle: 'x', periodDays: 10, deadline: '2026-11-03' }).title, 'No activity in 10 days');
});

test('time to follow up only fires past a stated or observed window', () => {
  const waiting = responseClock({ submittedOn: '2026-09-01', today: '2026-09-20', statedDays: 30 });
  assert.equal(shouldNotifyResponseClock(waiting), false);
  assert.equal(shouldNotifyResponseClock(responseClock({ submittedOn: '2026-01-01', today: '2026-09-20' })), false, 'no window, no notice');
  const past = responseClock({ submittedOn: '2026-08-01', today: '2026-09-20', statedDays: 30 });
  assert.equal(shouldNotifyResponseClock(past), true);
  assert.deepEqual(timeToQueryCopy({ applicationTitle: 'Spring issue', organizationName: 'Harbor Review', clock: past }), {
    title: 'Past the stated response time',
    body: 'You sent Spring issue 50 days ago. Harbor Review says to expect a reply within 30 days. A short, polite note is reasonable.',
    reason: 'Stated by the organization.',
  });
  const observed = responseClock({ submittedOn: '2026-08-01', today: '2026-09-20', observed: { p50Days: 20, p90Days: 40, sampleSize: 8 } });
  assert.equal(observed.state, 'time-to-query');
  assert.equal(timeToQueryCopy({ applicationTitle: 'Spring issue', organizationName: 'Harbor Review', clock: observed }).body,
    'You sent Spring issue 50 days ago. Nine in ten Missa creators heard back within 40 days.');
  const few = responseClock({ submittedOn: '2026-08-01', today: '2026-09-20', observed: { p50Days: 20, p90Days: 40, sampleSize: 4 } });
  assert.equal(shouldNotifyResponseClock(few), false, 'fewer than five reports are ignored');
  assert.equal(timeToQueryDedupeKey('t1', '2026-08-01', 'past-stated'), 'time-to-query:t1:2026-08-01:past-stated', 'the Tracker status is not part of the key');
});
