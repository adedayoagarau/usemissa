import test from 'node:test';
import assert from 'node:assert/strict';
import { noticeUnsubscribeCategory, renderDeadlineMomentEmail, type DeadlineMomentNotice } from './deadline-moments';

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

test('the deadline-day alarm says it closes today and points at the Tracker', () => {
  const rendered = render('deadline-day', {
    deadline: '2026-10-04',
    deadlineTime: null,
    noticeTitle: 'Poetry Fellowship 2027 closes today',
    noticeBody: 'Poetry Fellowship 2027 closes today. Send it when you are ready.',
    actionHref: '/tracker?view=saved&application=opp_fixture',
  });
  assert.equal(rendered.subject, 'Poetry Fellowship 2027 closes today');
  assert.ok(rendered.text.startsWith('It closes today, Tola.'));
  assert.ok(rendered.html.includes('Deadline day'));
  assert.ok(rendered.text.includes('/tracker?view=saved&application=opp_fixture'));
  assert.ok(rendered.html.includes('mark it submitted'));
});

test('a fee tier ending uses the notice copy and keeps the final deadline in view', () => {
  const rendered = render('tier-ending', {
    noticeTitle: 'Early-bird ends Friday, $15 less',
    noticeBody: 'The early-bird rate for Poetry Fellowship 2027 ends on Oct 9. Entering before then costs $15 less.',
  });
  assert.equal(rendered.subject, 'Early-bird ends Friday, $15 less');
  assert.ok(rendered.html.includes('A lower fee ends soon.'));
  assert.ok(rendered.html.includes('Final deadline'));
  assert.ok(rendered.html.includes('$15 less'));
});

test('change notices show was and now values from the notice body', () => {
  const moved = render('obligations-moved', {
    noticeTitle: 'Your plan moved with the date: Poetry Fellowship 2027',
    noticeBody: 'The deadline moved from 2026-10-03 to 2026-10-10, so 2 steps moved: Final draft, Upload.',
  });
  assert.equal(moved.subject, 'Your plan moved with the date: Poetry Fellowship 2027');
  assert.ok(moved.html.includes('text-decoration:line-through'));
  assert.ok(moved.html.includes('>Oct 3<'));
  assert.ok(moved.html.includes('>Oct 10<'));
  assert.ok(moved.text.includes('moved from Oct 3 to Oct 10'), 'ISO dates are written as short dates');

  const forecast = render('forecast-changed', {
    noticeTitle: 'Poetry Fellowship 2027 now has a confirmed opening date',
    noticeBody: 'The predicted opening moved from between Feb 1 and Feb 14 to Feb 20, now confirmed by the source. That is 6 days later than predicted.',
  });
  assert.ok(forecast.html.includes('between Feb 1 and Feb 14'));
  assert.ok(forecast.html.includes('#e7eff2'), 'confirmed dates are not time pressure, so the panel is mineral');
});

test('opening alerts carry a prediction note and their own preferences link', () => {
  const rendered = render('opens-soon', {
    noticeTitle: 'Poetry Fellowship 2027 may open soon',
    noticeBody: 'Based on 3 past cycles, Missa expects it to open between Nov 1 and Nov 8. This is a prediction until the source confirms the dates.',
    actionHref: '/opportunities/opp_fixture',
  });
  assert.equal(rendered.subject, 'Poetry Fellowship 2027 may open soon');
  assert.ok(rendered.html.includes('It opens soon.'));
  assert.ok(rendered.html.includes('Change opening alerts'));
  assert.ok(rendered.html.includes('Predicted dates come from past cycles'));
  assert.equal(noticeUnsubscribeCategory('opens-soon'), 'notification_digest');
  assert.equal(noticeUnsubscribeCategory('deadline-day'), 'deadline_reminder');
});

test('quiet, follow-up, suggestion and carry notices stay calm and never use the ochre panel', () => {
  for (const kind of ['gone-quiet', 'time-to-query', 'obligations-suggested', 'cycle-carry-suggested'] as const) {
    const rendered = render(kind, { noticeTitle: null, noticeBody: null, trackedStatus: kind === 'time-to-query' ? 'submitted' : 'preparing' });
    assert.ok(rendered.subject.length > 0, kind);
    assert.ok(rendered.html.includes('#e7eff2'), `${kind} uses the mineral tint`);
    assert.doesNotMatch(rendered.text, /urgent|overdue|hurry|last chance/i, kind);
  }
  assert.equal(render('gone-quiet', { noticeTitle: null }).subject, 'Still working on Poetry Fellowship 2027?');
  assert.ok(render('time-to-query', { noticeTitle: null, noticeBody: null }).html.includes('Missa never contacts an organisation for you'));
  assert.ok(render('obligations-suggested', { noticeTitle: null }).text.startsWith('Congratulations, Tola.'));
});

test('a milestone uses the notice title and links to the plan', () => {
  const rendered = render('milestone-due', {
    noticeTitle: 'Ask for references: Poetry Fellowship 2027',
    noticeBody: 'Ask for references is due on Oct 6 for Poetry Fellowship 2027.',
  });
  assert.equal(rendered.subject, 'Ask for references: Poetry Fellowship 2027');
  assert.ok(rendered.html.includes('Open your plan'));
});

test('notice links that leave Missa are ignored', () => {
  const rendered = render('milestone-due', { actionHref: '//elsewhere.example/page' });
  assert.ok(!rendered.html.includes('elsewhere.example'));
});
