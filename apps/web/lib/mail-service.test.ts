import test from 'node:test';
import assert from 'node:assert/strict';
import { sendMail, isRecipientSuppressed } from './mail-service';

test('isRecipientSuppressed flags malformed or empty addresses', async () => {
  assert.equal(await isRecipientSuppressed(''), true);
  assert.equal(await isRecipientSuppressed('invalid-email'), true);
  assert.equal(await isRecipientSuppressed('valid@example.com'), false);
});

test('sendMail succeeds in test/mock mode without credentials', async () => {
  const result = await sendMail({
    recipientEmail: 'creator@example.com',
    recipientAccountId: 'acc_test_1',
    kind: 'test-email',
    idempotencyKey: 'test-idem-key-1',
    subject: 'Test Subject',
    html: '<h1>Hello World</h1><p>Welcome to Missa.</p>',
    category: 'notification_digest',
  });

  assert.equal(result.status, 'sent');
  assert.ok(result.providerMessageId?.startsWith('mock_re_'));
  assert.equal(result.idempotent, false);
});

test('sendMail suppresses malformed emails immediately', async () => {
  const result = await sendMail({
    recipientEmail: 'not-an-email',
    idempotencyKey: 'test-idem-key-2',
    kind: 'test-email',
    subject: 'Will not send',
    html: '<p>Malformed</p>',
  });

  assert.equal(result.status, 'suppressed');
  assert.ok(result.reason?.includes('suppressed'));
});
