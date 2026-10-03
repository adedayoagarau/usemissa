import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSubmissionReceiptEmail } from './submission-receipt';
import { renderEmailChoiceConfirmationEmail } from './email-choice-confirmation';

test('a submission receipt comes from the organisation and records what arrived', () => {
  const rendered = renderSubmissionReceiptEmail({
    organizationName: 'Poets House',
    callTitle: 'Poetry Fellowship 2027',
    givenName: 'Tola',
    submittedAt: new Date('2026-10-04T18:12:00Z'),
    works: ['Ten poems'],
    fileCount: 3,
    reference: 'PH-2027-0412',
    feePaidCents: 2500,
    feeCurrency: 'USD',
  });
  assert.equal(rendered.subject, 'We received your submission for Poetry Fellowship 2027');
  assert.ok(rendered.html.includes('Poets House'));
  assert.ok(rendered.html.includes('Sent with Missa'));
  assert.ok(rendered.html.includes('Thank you, Tola. Your application for Poetry Fellowship 2027 arrived complete.'));
  assert.ok(rendered.html.includes('Sunday 4 October 2026, 6:12pm UTC'));
  assert.ok(rendered.html.includes('3 files'));
  assert.ok(rendered.html.includes('$25'));
  assert.ok(rendered.html.includes('PH-2027-0412'));
  assert.ok(rendered.html.includes('Poets House sent this through Missa'));
  assert.ok(rendered.text.includes('Reference: PH-2027-0412'));
});

test('a receipt with several works and no fee says so plainly', () => {
  const rendered = renderSubmissionReceiptEmail({
    organizationName: '<b>Org</b>',
    callTitle: 'Open Call',
    submittedAt: new Date('2026-10-04T09:00:00Z'),
    works: ['One', 'Two'],
    fileCount: 1,
    reference: 'sub_1',
  });
  assert.ok(rendered.html.includes('2 works'));
  assert.ok(rendered.html.includes('1 file<'));
  assert.ok(!rendered.html.includes('Entry fee paid'));
  assert.ok(!rendered.html.includes('<b>Org</b>'));
  assert.ok(rendered.html.includes('Thank you. Your application'));
});

test('the email-on confirmation names both emails and where to change them', () => {
  const rendered = renderEmailChoiceConfirmationEmail();
  assert.equal(rendered.subject, 'Reminder emails are on');
  assert.ok(rendered.html.includes('Deadline reminders you set'));
  assert.ok(rendered.html.includes('The Sunday List'));
  assert.ok(rendered.html.includes('Open Inbox settings'));
  assert.ok(rendered.html.includes('/inbox'));
});
