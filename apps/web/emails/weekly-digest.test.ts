import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWeeklyDigestEmail } from './weekly-digest';

const item = (id: string, title: string, reason = 'Because you chose Poetry') => ({
  opportunityId: id,
  title,
  organizationName: 'Fixture Review',
  deadline: '2026-10-20',
  reason,
});

test('weekly digest renders each non-empty section with its reasons', () => {
  const rendered = renderWeeklyDigestEmail({
    accountId: 'acc_1',
    email: 'creator@example.com',
    digest: {
      newForYou: [item('opp_new', 'New Poetry Prize')],
      closingSoon: [],
      yourDeadlines: [item('opp_saved', 'Saved Fellowship', 'You saved this')],
    },
  });
  assert.equal(rendered.subject, 'Your week in calls');
  assert.ok(rendered.html.includes('New for you'));
  assert.ok(rendered.html.includes('Your deadlines'));
  assert.ok(!rendered.html.includes('Closing soon'), 'empty sections are omitted');
  assert.ok(rendered.html.includes('Because you chose Poetry'));
  assert.ok(rendered.html.includes('/opportunities/opp_new'));
  assert.ok(rendered.text.includes('Saved Fellowship'));
  assert.ok(rendered.text.includes('You saved this'));
});

test('weekly digest escapes opportunity text', () => {
  const rendered = renderWeeklyDigestEmail({
    accountId: 'acc_1',
    email: 'creator@example.com',
    digest: { newForYou: [item('opp_x', '<script>alert(1)</script>')], closingSoon: [], yourDeadlines: [] },
  });
  assert.ok(!rendered.html.includes('<script>alert(1)</script>'));
});
