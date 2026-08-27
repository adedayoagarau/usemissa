import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-strip runtime resolves this source extension directly.
import { runDurableProviderDelivery } from './durableMessageDelivery.ts';

for (const producer of ['alert digest', 'waitlist confirmation', 'decision email']) {
  test(`${producer}: provider rejection records failed`, async () => {
    const writes: string[] = [];
    const result = await runDurableProviderDelivery({
      shouldDeliver: true,
      currentStatus: 'attempted',
      send: async () => { throw new Error('provider rejected'); },
      recordAccepted: async () => { writes.push('accepted'); },
      recordFailed: async () => { writes.push('failed'); },
    });
    assert.equal(result.outcome, 'provider-failed');
    assert.deepEqual(writes, ['failed']);
  });

  test(`${producer}: accepted-finalization failure is unavailable and never records failed`, async () => {
    const writes: string[] = [];
    const result = await runDurableProviderDelivery({
      shouldDeliver: true,
      currentStatus: 'attempted',
      send: async () => ({ id: 'provider-accepted' }),
      recordAccepted: async () => { writes.push('accepted'); throw new Error('ledger unavailable'); },
      recordFailed: async () => { writes.push('failed'); },
    });
    assert.equal(result.outcome, 'unavailable');
    assert.deepEqual(writes, ['accepted']);
  });
}

test('waitlist replay maps only accepted and delivered to compatibility success', async () => {
  for (const currentStatus of ['accepted', 'delivered'] as const) {
    const result = await runDurableProviderDelivery({ shouldDeliver: false, currentStatus, send: async () => 'never', recordAccepted: async () => {}, recordFailed: async () => {} });
    assert.equal(result.outcome, 'replayed-accepted');
  }
  for (const currentStatus of ['attempted', 'bounced', 'failed', 'unknown', 'suppressed'] as const) {
    let called = false;
    const result = await runDurableProviderDelivery({ shouldDeliver: false, currentStatus, send: async () => { called = true; return 'bad'; }, recordAccepted: async () => {}, recordFailed: async () => {} });
    assert.equal(result.outcome, 'unavailable');
    assert.equal(called, false);
  }
});
