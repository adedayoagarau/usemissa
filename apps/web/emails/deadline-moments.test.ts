import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDeadlineMomentEmail, type DeadlineMomentNotice } from './deadline-moments';

const now = new Date('2026-10-04T09:00:00Z');
const notice: Omit<DeadlineMomentNotice, 'kind'> = {
  noticedAt: '2026-10-02T08:00:00Z',
  opportunityId: 'opp_fixture',
  title: 'Poetry Fellowship 2027',
  organizationName: 'Poets House',
  deadline: '2026-10-07',
  deadlineTime: '2026-10-08T03:59:00Z',
  deadlineTimezone: 'America/New_York',
  recipientTimezone: 'Africa/Lagos',
  givenName: 'Tola',
  trackedStatus: 'preparing',
  type: 'fellowship',
  feeStatus: 'no-fee',
  prize: '$5,000 and a residency',
  previousDeadline: '2026-10-07',
  listedDeadline: '2026-10-07',
  submittedAt: '2026-07-04T10:00:00Z',
  responseTimeDays: 60,
};
const render = (kind: DeadlineMomentNotice['kind'], extra: Partial<DeadlineMomentNotice> = {}) =>
  renderDeadlineMomentEmail({ accountId: 'acc_1', email: 'creator@example.com', now, notice: { ...notice, ...extra, kind } });

test('a deadline reminder counts down and gives the closing moment in both timezones', () => {
  const rendered = render('deadline-reminder');
  assert.equal(rendered.subject, 'Poetry Fellowship 2027 closes in 3 days');
  assert.ok(rendered.text.startsWith('3 days left, Tola.'));
  assert.ok(rendered.html.includes('Wednesday 7 October at 11:59pm New York time.'));
  assert.ok(rendered.html.includes("That&#39;s Thursday 8 October at 4:59am for you in Lagos."));
  assert.ok(rendered.html.includes('In your Tracker: preparing'));
  assert.ok(rendered.html.includes('$5,000 and a residency'));
  assert.ok(rendered.html.includes('/opportunities/opp_fixture'));
  assert.ok(rendered.html.includes('Reminder you set'));
});

test('a reminder on the day says it closes today, without a name when there is none', () => {
  const rendered = render('deadline-reminder', { deadline: '2026-10-04', deadlineTime: null, givenName: null });
  assert.equal(rendered.subject, 'Poetry Fellowship 2027 closes today');
  assert.ok(rendered.text.startsWith('It closes today.'));
});

test('a moved deadline shows what it was and what it is now', () => {
  const rendered = render('deadline-changed', { deadline: '2026-10-21' });
  assert.equal(rendered.subject, 'New deadline for Poetry Fellowship 2027: Wednesday 21 October');
  assert.ok(rendered.html.includes('The deadline moved.'));
  assert.ok(rendered.html.includes('Wed 7 October'));
  assert.ok(rendered.html.includes('Wed 21 October'));
  assert.ok(rendered.html.includes('text-decoration:line-through'));
  assert.ok(rendered.html.includes('Moved to the new date'));
});

test('an early closure keeps the call in the Tracker and says only what Missa saw', () => {
  const rendered = render('call-closed');
  assert.equal(rendered.subject, 'Poetry Fellowship 2027 closed early');
  assert.ok(rendered.html.includes('before the 7 October deadline it listed'));
  assert.ok(rendered.html.includes('Seen closed on the official page'));
  assert.ok(rendered.html.includes('#e7eff2'), 'the closure panel uses the mineral tint');
});

test('a response check-in counts days since submitting and never offers to contact the organisation', () => {
  const rendered = render('response-overdue', { trackedStatus: 'submitted' });
  assert.equal(rendered.subject, '91 days since you submitted to Poets House');
  assert.ok(rendered.html.includes('says it replies within 60 days'));
  assert.ok(rendered.html.includes('Log a response'));
  assert.ok(rendered.html.includes('Missa never contacts an organisation for you'));
});

test('deadline-moment letters escape call text and keep Forest text light in Gmail dark mode', () => {
  const rendered = render('deadline-changed', { title: '<script>alert(1)</script>', deadline: '2026-10-21' });
  assert.ok(!rendered.html.includes('<script>alert(1)</script>'));
  assert.ok(rendered.html.includes('background-image:linear-gradient(#1d4037,#1d4037)'));
  assert.ok(rendered.html.includes('gmail-blend-screen'));
});
