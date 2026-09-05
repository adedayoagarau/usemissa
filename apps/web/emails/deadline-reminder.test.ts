import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDeadlineReminderEmail, deliverDeadlineReminderEmail } from './deadline-reminder';

test('renderDeadlineReminderEmail handles single opportunity countdown', () => {
  const rendered = renderDeadlineReminderEmail({
    accountId: 'acc_creator_1',
    email: 'creator@example.com',
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

  assert.ok(rendered.subject.includes('Spring Poetry Prize'));
  assert.ok(rendered.subject.includes('2 days left'));
  assert.ok(rendered.html.includes('The Kenyon Review'));
  assert.ok(rendered.html.includes('Closes in 2 days'));
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

  assert.ok(rendered.subject.includes('2 submission deadlines approaching'));
  assert.ok(rendered.html.includes('Spring Poetry Prize'));
  assert.ok(rendered.html.includes('Nonfiction Fellowship'));
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
