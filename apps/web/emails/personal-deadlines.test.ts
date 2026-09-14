import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPersonalDeadlinesEmail, type PersonalDeadlineItem } from './personal-deadlines';

const item = (overrides: Partial<PersonalDeadlineItem> & { id: string }): PersonalDeadlineItem => ({
  title: 'Winter Poetry Prize',
  organizationName: 'The Paris Review',
  deadlineFormatted: 'Fri, 26 Sep 2026',
  daysRemaining: 3,
  ...overrides,
});

test('deadlines are grouped by urgency and sorted by how close they are', () => {
  const rendered = renderPersonalDeadlinesEmail({
    accountId: 'acc_1',
    email: 'writer@example.com',
    displayName: 'Ada',
    items: [
      item({ id: 'b', title: 'Later Call', daysRemaining: 20 }),
      item({ id: 'a', title: 'Closes First', daysRemaining: 2 }),
    ],
  });

  assert.ok(rendered.html.includes('This week'));
  assert.ok(rendered.html.includes('Later this month'));
  assert.ok(rendered.html.indexOf('Closes First') < rendered.html.indexOf('Later Call'));
  assert.equal(rendered.subject, '1 of your deadlines land this week');
});

test('the draft state is what makes this personal, and it shows on every record', () => {
  const rendered = renderPersonalDeadlinesEmail({
    accountId: 'acc_1',
    email: 'writer@example.com',
    items: [
      item({ id: 'a', draftStarted: true }),
      item({ id: 'b', title: 'Untouched', draftStarted: false, savedDaysAgo: 30 }),
    ],
  });

  assert.ok(rendered.html.includes('You have a draft going'));
  assert.ok(rendered.html.includes('No draft yet'));
  assert.ok(rendered.html.includes('saved 30 days ago'));
  assert.ok(rendered.text.includes('no draft yet'));
});

test('the intro changes with how much is actually started', () => {
  const none = renderPersonalDeadlinesEmail({
    accountId: 'a',
    email: 'e@x.com',
    items: [item({ id: 'a' }), item({ id: 'b' })],
  });
  assert.ok(none.html.includes('None of these have a draft yet'));

  const all = renderPersonalDeadlinesEmail({
    accountId: 'a',
    email: 'e@x.com',
    items: [item({ id: 'a', draftStarted: true })],
  });
  assert.ok(all.html.includes('draft going on all of these'));

  const some = renderPersonalDeadlinesEmail({
    accountId: 'a',
    email: 'e@x.com',
    items: [item({ id: 'a', draftStarted: true }), item({ id: 'b', draftStarted: false })],
  });
  assert.ok(some.html.includes('1 of these have no draft yet'));
});

test('a recently saved call does not get the nagging "saved N days ago" line', () => {
  const rendered = renderPersonalDeadlinesEmail({
    accountId: 'a',
    email: 'e@x.com',
    items: [item({ id: 'a', draftStarted: false, savedDaysAgo: 2 })],
  });

  assert.ok(rendered.html.includes('No draft yet'));
  assert.ok(!rendered.html.includes('saved 2 days ago'));
});

test('the closing-day warning only appears when something closes this week', () => {
  const soon = renderPersonalDeadlinesEmail({
    accountId: 'a',
    email: 'e@x.com',
    items: [item({ id: 'a', daysRemaining: 3 })],
  });
  assert.ok(soon.html.includes('send it a day early'));

  const later = renderPersonalDeadlinesEmail({
    accountId: 'a',
    email: 'e@x.com',
    items: [item({ id: 'a', daysRemaining: 25 })],
  });
  assert.ok(!later.html.includes('send it a day early'));
  assert.equal(later.subject, 'Your 1 deadline coming up');
});
