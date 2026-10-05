import test from 'node:test';
import assert from 'node:assert/strict';
import { renderGoalCheckInEmail } from './goal-check-in';

const now = new Date('2026-10-03T09:00:00Z');
const base = {
  accountId: 'acc_1',
  email: 'creator@example.com',
  givenName: 'Tola',
  goal: { id: 'goal_1', progress: 4, target: 10, endsOn: '2026-12-31', nextStep: 'Send the chapbook manuscript.' },
  closing: [
    { opportunityId: 'opp_a', title: 'Poetry Fellowship 2027', status: 'preparing', deadline: '2026-10-07' },
    { opportunityId: 'opp_b', title: 'Short Fiction Grant', status: 'interested', deadline: '2026-10-10' },
    { opportunityId: 'opp_c', title: 'The Chapbook Prize', status: 'draft-started', deadline: '2026-12-15' },
  ],
  closingCount: 3,
  now,
};

test('a goal check-in counts submissions, draws progress and lists calls closing before the goal date', () => {
  const rendered = renderGoalCheckInEmail(base);
  assert.equal(rendered.subject, '4 of 10 submissions towards your goal');
  assert.ok(rendered.text.startsWith('4 of 10 submissions, Tola.'));
  assert.ok(rendered.html.includes('Six more to reach your goal by 31 December. Three calls in your Tracker close before then. Your next step: Send the chapbook manuscript.'));
  assert.ok(rendered.html.includes('aria-label="4 of 10"'));
  assert.equal(rendered.html.match(/border-radius:11px;background-color:#ddf45b/g)?.length, 4);
  assert.ok(rendered.html.includes('Poetry Fellowship 2027 · preparing'));
  assert.ok(rendered.html.includes('The Chapbook Prize · draft started'));
  assert.ok(rendered.html.includes('Your goal, October'));
  assert.ok(rendered.html.includes('/goals?goal=goal_1'));
  assert.ok(rendered.html.includes('Only submissions count towards a goal.'));
});

test('with nothing closing before the goal date the panel says so, and large targets skip the dots', () => {
  const rendered = renderGoalCheckInEmail({ ...base, goal: { ...base.goal, target: 40, nextStep: null }, closing: [], closingCount: 0 });
  assert.ok(rendered.html.includes('Nothing in your Tracker closes before then.'));
  assert.ok(rendered.html.includes('None before 31 December'));
  assert.ok(!rendered.html.includes('aria-label="4 of 40"'));
  assert.ok(!rendered.html.includes('Your next step'));
});
