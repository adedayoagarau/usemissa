import assert from 'node:assert/strict';
import test from 'node:test';
import { renderSubmitterQuestionAnswerEmail } from './submitter-question-answer';

test('a question answer quotes the question, escapes the answer, and links the receipt', () => {
  const rendered = renderSubmitterQuestionAnswerEmail({
    organizationName: 'North River Review',
    opportunityTitle: 'Spring Prize',
    question: 'Can I send a revised draft?',
    answer: 'Yes, until 1 May.\n\n<i>Thank you</i>',
    submissionId: 'submission_0001',
  });
  assert.equal(rendered.subject, 'North River Review answered your question about Spring Prize');
  assert.ok(rendered.html.includes('Can I send a revised draft?'));
  assert.ok(rendered.html.includes('Yes, until 1 May.'));
  assert.ok(rendered.html.includes('&lt;i&gt;Thank you&lt;/i&gt;'));
  assert.ok(rendered.html.includes('/tracker/submissions/submission_0001'));
  assert.ok(rendered.text.includes('North River Review'));
});
