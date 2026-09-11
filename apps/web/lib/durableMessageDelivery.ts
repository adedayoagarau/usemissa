export type MessageEffectReplayState =
  | 'queued' | 'attempted' | 'accepted' | 'delivered' | 'bounced'
  | 'failed' | 'unknown' | 'suppressed';

export type DurableProviderDeliveryResult<T> =
  | { outcome: 'accepted'; providerResult: T }
  | { outcome: 'replayed-accepted' }
  | { outcome: 'provider-failed'; error: unknown }
  | { outcome: 'unavailable'; error?: unknown };

/**
 * Keeps provider failure separate from post-acceptance ledger failure. Once the
 * provider accepts a send, a finalization error is ambiguous/unavailable and
 * must never be rewritten as provider failure.
 */
export async function runDurableProviderDelivery<T>(input: {
  shouldDeliver: boolean;
  currentStatus: string;
  send: () => Promise<T>;
  recordAccepted: (providerResult: T) => Promise<void>;
  recordFailed: (error: unknown) => Promise<void>;
}): Promise<DurableProviderDeliveryResult<T>> {
  if (!input.shouldDeliver) {
    return input.currentStatus === 'accepted' || input.currentStatus === 'delivered'
      ? { outcome: 'replayed-accepted' }
      : { outcome: 'unavailable' };
  }

  let providerResult: T;
  try {
    providerResult = await input.send();
  } catch (error) {
    await input.recordFailed(error).catch(() => undefined);
    return { outcome: 'provider-failed', error };
  }

  try {
    await input.recordAccepted(providerResult);
    return { outcome: 'accepted', providerResult };
  } catch (error) {
    return { outcome: 'unavailable', error };
  }
}
