import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWeeklyDigestEmail } from './weekly-digest';

const now = new Date('2026-10-04T18:00:00Z');

const item = (id: string, title: string, reason = 'Because you chose Poetry', deadline: string | null = '2026-10-20') => ({
  opportunityId: id,
  title,
  organizationName: 'Fixture Review',
  deadline,
  reason,
  type: 'residency',
  feeStatus: 'no-fee',
  feeCents: null,
  feeCurrency: null,
  prize: null,
});

test('The Sunday List leads with the Tracker deadline and uses product section names', () => {
  const rendered = renderWeeklyDigestEmail({
    accountId: 'acc_1',
    email: 'creator@example.com',
    now,
    digest: {
      recipientName: 'Tola',
      newForYou: [item('opp_new', 'New Poetry Prize')],
      closingSoon: [],
      yourDeadlines: [item('opp_saved', 'Saved Fellowship', 'You saved this', '2026-10-07')],
    },
  });
  assert.equal(rendered.subject, 'The Sunday List: Saved Fellowship closes on Wednesday');
  assert.ok(rendered.html.includes('The Sunday List'));
  assert.ok(rendered.html.includes('In your Tracker'));
  assert.ok(rendered.html.includes('Just opened'));
  assert.ok(!rendered.html.includes('Closing soon'), 'empty sections are omitted');
  assert.ok(!rendered.html.includes('Closing this week'), 'empty sections are omitted');
  assert.ok(rendered.html.includes('Because you chose Poetry'));
  assert.ok(rendered.html.includes('Residency · Free to enter'));
  assert.ok(rendered.html.includes('/opportunities/opp_new'));
  assert.ok(rendered.html.includes('Two calls for Tola this week.'));
  assert.ok(rendered.text.includes('Saved Fellowship'));
  assert.ok(rendered.text.includes('You saved this'));
});

test('without a Tracker deadline the first new call leads and closing calls say this week', () => {
  const rendered = renderWeeklyDigestEmail({
    accountId: 'acc_1',
    email: 'creator@example.com',
    now,
    digest: {
      newForYou: [item('opp_a', 'First New Call'), item('opp_b', 'Second New Call', 'Because you chose Fiction', null)],
      closingSoon: [item('opp_c', 'Closing Grant', 'Because you chose Fiction', '2026-10-09')],
      yourDeadlines: [],
    },
  });
  assert.equal(rendered.subject, 'The Sunday List: two calls just opened for you');
  assert.ok(!rendered.html.includes('In your Tracker'));
  assert.ok(rendered.html.includes('Closing this week'));
  assert.ok(rendered.html.includes('No fixed deadline'));
  assert.ok(rendered.html.includes('Three calls for you this week.'));
});

test('weekly digest escapes opportunity text', () => {
  const rendered = renderWeeklyDigestEmail({
    accountId: 'acc_1',
    email: 'creator@example.com',
    now,
    digest: { newForYou: [item('opp_x', '<script>alert(1)</script>')], closingSoon: [], yourDeadlines: [] },
  });
  assert.ok(!rendered.html.includes('<script>alert(1)</script>'));
});

const planning = {
  upcoming: [
    { kind: 'obligation' as const, id: 'obl_1', opportunityId: 'opp_saved', title: 'Saved Fellowship', label: 'Ask for references', dueOn: '2026-10-05' },
    { kind: 'deadline' as const, id: 'opp_saved', opportunityId: 'opp_saved', title: 'Saved Fellowship', label: 'Application deadline', dueOn: '2026-10-07' },
    { kind: 'obligation' as const, id: 'obl_2', opportunityId: 'opp_b', title: 'Second Grant', label: 'Final draft', dueOn: '2026-10-12' },
    { kind: 'deadline' as const, id: 'opp_b', opportunityId: 'opp_b', title: 'Second Grant', label: 'Application deadline', dueOn: '2026-10-19' },
  ],
  applications: [
    { opportunityId: 'opp_saved', title: 'Saved Fellowship', deadline: '2026-10-07' },
    { opportunityId: 'opp_b', title: 'Second Grant', deadline: '2026-10-19' },
    { opportunityId: 'opp_c', title: 'Third Prize', deadline: '2026-10-21' },
    { opportunityId: 'opp_d', title: 'Fourth Residency', deadline: '2026-10-23' },
    { opportunityId: 'opp_e', title: 'Spring Call', deadline: '2027-01-20' },
    { opportunityId: 'opp_f', title: 'Rolling Call', deadline: null },
  ],
};

test("This week's three lists the next three dates across saved applications", () => {
  const rendered = renderWeeklyDigestEmail({
    accountId: 'acc_1',
    email: 'creator@example.com',
    now,
    digest: { newForYou: [], closingSoon: [], yourDeadlines: [item('opp_saved', 'Saved Fellowship', 'You saved this', '2026-10-07')], planning },
  });
  assert.ok(rendered.html.includes('This week&#39;s three') || rendered.html.includes("This week's three"));
  assert.ok(rendered.html.includes('Ask for references'));
  assert.ok(rendered.html.includes('Final draft'));
  assert.ok(!rendered.html.includes('2026-10-19'), 'the fourth date is left out');
  assert.ok(rendered.text.includes("THIS WEEK'S THREE"));
  assert.ok(rendered.text.includes('- Tomorrow: Ask for references, Saved Fellowship'));
  assert.ok(rendered.text.includes('- Wednesday: Saved Fellowship closes'));
  assert.ok(rendered.html.indexOf('This week') < rendered.html.indexOf('In your Tracker'), 'the plan comes first');
});

test('the season section counts triage buckets and names busy weeks', () => {
  const rendered = renderWeeklyDigestEmail({
    accountId: 'acc_1',
    email: 'creator@example.com',
    now,
    digest: { newForYou: [], closingSoon: [], yourDeadlines: [], planning },
  });
  assert.ok(rendered.text.includes('YOUR SEASON'));
  assert.ok(rendered.text.includes('- Act now: 4 applications'));
  assert.ok(rendered.text.includes('- Plan ahead: 1 application'));
  assert.ok(rendered.text.includes('- Rolling or undated: 1 application'));
  assert.ok(rendered.text.includes('- Busy: Week of 19 October, 3 deadlines'));
  assert.equal(rendered.subject, 'The Sunday List: your week ahead');
  assert.ok(rendered.text.includes('Next up: Ask for references tomorrow.'));
});

test('without saved applications the planning sections are left out', () => {
  const rendered = renderWeeklyDigestEmail({
    accountId: 'acc_1',
    email: 'creator@example.com',
    now,
    digest: { newForYou: [item('opp_a', 'First New Call')], closingSoon: [], yourDeadlines: [] },
  });
  assert.ok(!rendered.text.includes("THIS WEEK'S THREE"));
  assert.ok(!rendered.text.includes('YOUR SEASON'));
});

test('every card is one link to its opportunity and Forest text survives Gmail dark mode', () => {
  const rendered = renderWeeklyDigestEmail({
    accountId: 'acc_1',
    email: 'creator@example.com',
    now,
    digest: {
      newForYou: [item('opp_a', 'First New Call'), item('opp_b', 'Second New Call')],
      closingSoon: [item('opp_c', 'Closing Grant', 'Because you chose Fiction', '2026-10-09')],
      yourDeadlines: [item('opp_saved', 'Saved Fellowship', 'You saved this', '2026-10-07')],
    },
  });
  for (const id of ['opp_saved', 'opp_a', 'opp_b', 'opp_c']) {
    assert.match(rendered.html, new RegExp(`<a href="[^"]*/opportunities/${id}" style="display:block;`));
  }
  assert.ok(rendered.html.includes('<body class="body"'));
  assert.ok(rendered.html.includes('u + .body .gmail-blend-screen'));
  assert.ok(rendered.html.includes('background-image:linear-gradient(#1d4037,#1d4037)'));
});
