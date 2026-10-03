import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDeadlineReminderEmail, deliverDeadlineReminderEmail } from './deadline-reminder';

test('renderDeadlineReminderEmail handles single opportunity countdown', () => {
  const rendered = renderDeadlineReminderEmail({
    accountId: 'acc_creator_1',
    email: 'creator@example.com',
    now: new Date('2026-03-13T09:00:00Z'),
    opportunities: [
      {
        id: 'opp_1',
        title: 'Spring Poetry Prize',
        organizationName: 'The Kenyon Review',
        deadlineFormatted: 'March 15, 2026',
        daysRemaining: 2,
        categoryLabel: 'Poetry',
      },
    ],
  });

  assert.equal(rendered.subject, 'Spring Poetry Prize closes in 2 days');
  assert.ok(rendered.html.includes('The Kenyon Review'));
  assert.ok(rendered.html.includes('days left.'));
  assert.ok(rendered.html.includes('Sunday 15 March'));
  assert.ok(rendered.html.includes('/opportunities/opp_1'));
  assert.ok(rendered.html.includes('/tracker'));
  assert.ok(rendered.text.includes('Spring Poetry Prize'));
});

test('renderDeadlineReminderEmail handles multiple opportunity countdowns', () => {
  const rendered = renderDeadlineReminderEmail({
    accountId: 'acc_creator_2',
    email: 'creator@example.com',
    opportunities: [
      {
        id: 'opp_1',
        title: 'Spring Poetry Prize',
        organizationName: 'The Kenyon Review',
        deadlineFormatted: 'March 15, 2026',
        daysRemaining: 2,
      },
      {
        id: 'opp_2',
        title: 'Nonfiction Fellowship',
        organizationName: 'Tin House',
        deadlineFormatted: 'March 18, 2026',
        daysRemaining: 5,
      },
    ],
  });

  assert.equal(rendered.subject, 'Two of your deadlines are close');
  assert.ok(rendered.html.includes('Spring Poetry Prize, The Kenyon Review'));
  assert.ok(rendered.html.includes('Nonfiction Fellowship, Tin House'));
  assert.ok(rendered.text.includes('/opportunities/opp_2'));
});

test('deliverDeadlineReminderEmail sends idempotently', async () => {
  const result = await deliverDeadlineReminderEmail({
    accountId: 'acc_creator_test',
    email: 'creator@example.com',
    opportunities: [
      {
        id: 'opp_1',
        title: 'Spring Poetry Prize',
        organizationName: 'The Kenyon Review',
        deadlineFormatted: 'March 15, 2026',
        daysRemaining: 2,
      },
    ],
  });

  assert.equal(result.status, 'sent');
  assert.ok(result.providerMessageId?.startsWith('mock_re_'));
});
