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
