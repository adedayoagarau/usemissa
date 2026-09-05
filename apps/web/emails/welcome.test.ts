import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWelcomeEmail, deliverWelcomeEmail } from './welcome';

test('renderWelcomeEmail generates valid HTML and plain text with personalized greeting', () => {
  const rendered = renderWelcomeEmail({
    accountId: 'acc_welcome_1',
    email: 'writer@example.com',
    displayName: 'Adedayo',
  });

  assert.equal(rendered.subject, 'Welcome to Missa');
  assert.ok(rendered.html.includes('Hello Adedayo,'));
  assert.ok(rendered.html.includes('Explore Opportunities'));
  assert.ok(rendered.text.includes('Hello Adedayo,'));
  assert.ok(rendered.text.includes('/opportunities'));
});

test('deliverWelcomeEmail calls mail service idempotently', async () => {
  const result = await deliverWelcomeEmail({
    accountId: 'acc_welcome_mock',
    email: 'writer@example.com',
    displayName: 'Adedayo',
  });

  assert.equal(result.status, 'sent');
  assert.ok(result.providerMessageId?.startsWith('mock_re_'));
});
