import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWeeklyDigestEmail, isWorthSending, type WeeklyDigestEmailProps } from './weekly-digest';

const base: WeeklyDigestEmailProps = {
  accountId: 'acc_1',
  email: 'writer@example.com',
  displayName: 'Ada',
  weekOfFormatted: '13 September',
  newCalls: [],
  closingSoon: [],
};

test('a full week leads with the new calls and lists both sections', () => {
  const rendered = renderWeeklyDigestEmail({
    ...base,
    newCalls: [
      { id: '1', title: 'Open Fiction Submissions', organizationName: 'Granta', deadlineFormatted: 'Mon, 6 Oct', categoryLabel: 'Magazine' },
      { id: '2', title: 'Winter Poetry Prize', organizationName: 'The Paris Review', deadlineFormatted: 'Fri, 26 Sep', categoryLabel: 'Prize' },
    ],
    closingSoon: [
      { id: '3', title: 'Emerging Writers Residency', organizationName: 'MacDowell', deadlineFormatted: 'Wed, 1 Oct', daysRemaining: 2 },
    ],
  });

  assert.equal(rendered.subject, '2 new calls this week');
  assert.ok(rendered.html.includes('New this week'));
  assert.ok(rendered.html.includes('Closing soon'));
  assert.ok(rendered.html.includes('Granta'));
  assert.ok(rendered.html.includes('2 days left'));
  assert.ok(rendered.text.includes('Open Fiction Submissions'));
});

test('a week with only closing calls leads with the deadlines instead', () => {
  const rendered = renderWeeklyDigestEmail({
    ...base,
    closingSoon: [
      { id: '3', title: 'Emerging Writers Residency', organizationName: 'MacDowell', deadlineFormatted: 'Wed, 1 Oct', daysRemaining: 5 },
    ],
  });

  assert.equal(rendered.subject, '1 deadline coming up');
  assert.ok(rendered.html.includes('Nothing new opened this week'));
  assert.ok(!rendered.html.includes('New this week'));
});

test('a quiet week renders an empty state and the sender is told to skip it', () => {
  assert.equal(isWorthSending(base), false);

  const rendered = renderWeeklyDigestEmail(base);
  assert.equal(rendered.subject, 'Nothing new this week');
  assert.ok(rendered.html.includes('No calls opened this week'));
  assert.ok(rendered.html.includes('Change what you follow'));

  // A quiet week gets no citron: there is no news to mark.
  const title = rendered.html.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? '';
  assert.ok(!title.includes('m-mark'));
});

test('isWorthSending is true as soon as either list has something', () => {
  assert.equal(isWorthSending({ newCalls: [{ id: '1', title: 't', organizationName: 'o' }], closingSoon: [] }), true);
  assert.equal(
    isWorthSending({
      newCalls: [],
      closingSoon: [{ id: '1', title: 't', organizationName: 'o', deadlineFormatted: 'd', daysRemaining: 3 }],
    }),
    true,
  );
});

test('singular and plural counts read correctly', () => {
  const one = renderWeeklyDigestEmail({
    ...base,
    newCalls: [{ id: '1', title: 'Only One', organizationName: 'Granta' }],
  });
  assert.equal(one.subject, '1 new call this week');
  // The count sits inside the citron span, so the title is split in the markup.
  assert.ok(one.html.includes('1 new call'));
  assert.ok(one.html.includes('this week.'));
});
