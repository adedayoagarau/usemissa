import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDecisionLetter, deliverDecisionEmail } from './decision-letter';

test('renderDecisionLetter renders accepted decision letter with editorial notes', () => {
  const rendered = renderDecisionLetter({
    submitterName: 'Jane Doe',
    organizationName: 'The Paris Review',
    workTitle: 'Three Seasons',
    outcome: 'accepted',
    editorialNote: 'We loved the closing stanza in particular.',
    nextSteps: 'Our managing editor will contact you with contracts next week.',
  });

  assert.ok(rendered.subject.includes('Three Seasons'));
  assert.ok(rendered.subject.includes('The Paris Review'));
  assert.ok(rendered.html.includes('Dear Jane Doe,'));
  assert.ok(rendered.html.includes('We are delighted to inform you'));
  assert.ok(rendered.html.includes('We loved the closing stanza in particular.'));
  assert.ok(rendered.html.includes('Our managing editor will contact you'));
  assert.ok(rendered.text.includes('Dear Jane Doe,'));
});

test('renderDecisionLetter renders polite decline letter', () => {
  const rendered = renderDecisionLetter({
    submitterName: 'John Smith',
    organizationName: 'Granta',
    workTitle: 'Winter Tale',
    outcome: 'declined',
  });

  assert.ok(rendered.html.includes('it is not the right fit for <strong>Granta</strong>'));
});

test('deliverDecisionEmail dispatches actionable email idempotently', async () => {
  const result = await deliverDecisionEmail({
    submitterName: 'Jane Doe',
    organizationName: 'The Paris Review',
    workTitle: 'Three Seasons',
    outcome: 'accepted',
    recipientEmail: 'jane@example.com',
    recipientAccountId: 'acc_jane_1',
    organizationId: 'org_paris_review',
    actorAccountId: 'acc_editor_1',
    workId: 'work_123',
    decisionId: 'dec_456',
  });

  assert.equal(result.status, 'sent');
  assert.ok(result.providerMessageId?.startsWith('mock_re_'));
});
