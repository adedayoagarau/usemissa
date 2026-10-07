import assert from 'node:assert/strict';
import test from 'node:test';
import { deliverOrganizationCommunication, renderCommunicationForRecipient, renderOrganizationCommunication } from './organization-communication';

test('organization letters lead with the organization and keep the body as plain paragraphs', () => {
  const rendered = renderOrganizationCommunication({
    kind: 'longlist',
    organizationName: 'North River Review',
    subject: 'You are on the longlist',
    body: 'Dear Rosa,\n\nSaltwater is on the longlist.\nWe will write again.\n\n<b>Not markup</b>',
    signoff: 'The editors',
    submissionId: 'submission_0001',
  });
  assert.equal(rendered.subject, 'You are on the longlist');
  assert.ok(rendered.html.includes('North River Review'));
  assert.ok(rendered.html.includes('You are on the longlist'));
  assert.ok(rendered.html.includes('Saltwater is on the longlist. We will write again.'), 'single newlines join a paragraph');
  assert.ok(rendered.html.includes('&lt;b&gt;Not markup&lt;/b&gt;'), 'organization text is escaped');
  assert.ok(rendered.html.includes('/tracker/submissions/submission_0001'));
  assert.ok(rendered.text.includes('The editors'));
});

test('merge fields are rendered per recipient before the letter is built', () => {
  const rendered = renderCommunicationForRecipient({
    kind: 'rejection-with-dignity',
    organizationName: 'Granta',
    subjectTemplate: 'About {{workTitles}}, from {{organizationName}}',
    bodyTemplate: 'Dear {{submitterName}},\n\nThank you for sending {{workTitles}}.',
    signoff: 'Granta',
    values: { submitterName: 'Ivo', workTitles: 'Notes and Night bus', organizationName: 'Granta' },
  });
  assert.equal(rendered.subject, 'About Notes and Night bus, from Granta');
  assert.ok(rendered.text.includes('Dear Ivo,'));
});

test('delivery goes through the durable mail service with a per-recipient idempotency key', async () => {
  const rendered = renderOrganizationCommunication({ kind: 'custom', organizationName: 'Granta', subject: 'Update', body: 'Hello', signoff: 'Granta' });
  const report = await deliverOrganizationCommunication({
    rendered,
    recipientEmail: 'ivo@example.com',
    recipientAccountId: 'acct_ivo',
    organizationId: 'org_granta',
    actorAccountId: 'acct_admin',
    batchId: 'communication_0001',
    submissionId: 'submission_0001',
    kind: 'custom',
    templateVersion: 'abc',
  });
  assert.equal(report.status, 'sent');
  assert.ok(report.providerMessageId?.startsWith('mock_re_'));
});
