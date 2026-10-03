import test from 'node:test';
import assert from 'node:assert/strict';
import type { CalendarSyncLease } from '@missa/radar-adapters';
import { CalendarProviderError, CalendarReconnectRequiredError, deliverCalendarSync, providerAccessToken } from './calendar-providers';
import { calendarSyncTickLimits, drainCalendarSyncJobs, processCalendarSyncLease, type CalendarSyncRepository } from './calendar-sync';

const lease = (overrides: Partial<CalendarSyncLease> = {}): CalendarSyncLease => ({
  jobId: 'job-1',
  accountId: 'acc-1',
  connectionId: 'conn-1',
  provider: 'microsoft',
  operation: 'upsert',
  eventId: 'event-1',
  attempt: 1,
  refreshToken: 'refresh-old',
  calendarId: 'calendar-1',
  event: {
    id: 'event-1',
    title: 'Draft due',
    startAt: '2026-11-01T10:00:00.000Z',
    endAt: '2026-11-01T11:00:00.000Z',
    allDay: false,
    color: 'ink',
    revision: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
  ...overrides,
});

function fakeRepository(leases: CalendarSyncLease[], terminalAfter = Infinity) {
  const calls: string[] = [];
  const rotated: Array<[string, string]> = [];
  const repository: CalendarSyncRepository = {
    async leaseSyncJob(accountId?: string) {
      calls.push(`lease:${accountId ?? '*'}`);
      return leases.shift();
    },
    async completeSyncJob(item: CalendarSyncLease, providerEventId?: string) {
      calls.push(`complete:${item.jobId}:${providerEventId ?? ''}`);
    },
    async failSyncJob(jobId: string, code: string) {
      calls.push(`fail:${jobId}:${code}`);
      return { terminal: calls.filter((call) => call.startsWith(`fail:${jobId}`)).length >= terminalAfter };
    },
    async requireCalendarReconnect(item: Pick<CalendarSyncLease, 'jobId' | 'connectionId'>, code?: string) {
      calls.push(`reconnect:${item.connectionId}:${code}`);
    },
    async rotateCalendarRefreshToken(connectionId: string, refreshToken: string) {
      rotated.push([connectionId, refreshToken]);
      return { rotated: true };
    },
  };
  return { repository, calls, rotated };
}

function withEnv(values: Record<string, string>, run: () => Promise<void>) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  return run().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function withFetch(handler: (url: string, init?: RequestInit) => Response, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => handler(String(input), init)) as typeof fetch;
  return run().finally(() => {
    globalThis.fetch = original;
  });
}

const providerEnv = {
  MICROSOFT_CALENDAR_CLIENT_ID: 'client',
  MICROSOFT_CALENDAR_CLIENT_SECRET: 'secret',
  GOOGLE_CALENDAR_CLIENT_ID: 'client',
  GOOGLE_CALENDAR_CLIENT_SECRET: 'secret',
};

test('a Microsoft refresh persists the rotated refresh token before the event is written', async () => {
  const { repository, calls, rotated } = fakeRepository([]);
  const order: string[] = [];
  await withEnv(providerEnv, () =>
    withFetch((url, init) => {
      if (url.includes('/oauth2/v2.0/token')) {
        assert.match(String(init?.body), /refresh_token=refresh-old/);
        order.push('token');
        return Response.json({ access_token: 'access-1', refresh_token: 'refresh-new' });
      }
      order.push('event');
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer access-1');
      return Response.json({ id: 'provider-event-1' });
    }, async () => {
      const outcome = await processCalendarSyncLease(repository, lease(), (item, hooks) =>
        deliverCalendarSync(item, {
          onRefreshTokenRotated: async (token) => {
            order.push('persist');
            return hooks.onRefreshTokenRotated?.(token);
          },
        }),
      );
      assert.equal(outcome, 'succeeded');
    }),
  );
  assert.deepEqual(rotated, [['conn-1', 'refresh-new']]);
  assert.deepEqual(order, ['token', 'persist', 'event']);
  assert.deepEqual(calls, ['complete:job-1:provider-event-1']);
});

test('an unchanged or absent refresh token is not rewritten', async () => {
  for (const body of [{ access_token: 'a' }, { access_token: 'a', refresh_token: 'refresh-old' }]) {
    const rotations: string[] = [];
    await withEnv(providerEnv, () =>
      withFetch(() => Response.json(body), async () => {
        assert.equal(await providerAccessToken('google', 'refresh-old', { onRefreshTokenRotated: async (token) => rotations.push(token) }), 'a');
      }),
    );
    assert.deepEqual(rotations, []);
  }
});

test('invalid_grant marks the connection for reconnect for both providers', async () => {
  for (const provider of ['google', 'microsoft'] as const) {
    const { repository, calls } = fakeRepository([]);
    await withEnv(providerEnv, () =>
      withFetch(() => Response.json({ error: 'invalid_grant', error_description: 'AADSTS70008: expired' }, { status: 400 }), async () => {
        await assert.rejects(providerAccessToken(provider, 'refresh-old'), CalendarReconnectRequiredError);
        assert.equal(await processCalendarSyncLease(repository, lease({ provider })), 'reconnect-required');
      }),
    );
    assert.deepEqual(calls, ['reconnect:conn-1:reconnect_required']);
  }
});

test('other provider failures are retried with a short error code', async () => {
  const { repository, calls } = fakeRepository([]);
  await withEnv(providerEnv, () =>
    withFetch(() => Response.json({ error: 'temporarily_unavailable' }, { status: 503 }), async () => {
      await assert.rejects(providerAccessToken('google', 'refresh-old'), CalendarProviderError);
      assert.equal(await processCalendarSyncLease(repository, lease({ provider: 'google' })), 'failed');
    }),
  );
  assert.deepEqual(calls, ['fail:job-1:token_refresh_503']);
});

test('an upsert whose event was deleted settles without calling the provider', async () => {
  const { repository, calls } = fakeRepository([]);
  const outcome = await processCalendarSyncLease(repository, lease({ event: undefined }), async () => {
    throw new Error('provider must not be called');
  });
  assert.equal(outcome, 'succeeded');
  assert.deepEqual(calls, ['complete:job-1:']);
});

test('the drain stops at its batch size, time budget, or an empty queue', async () => {
  const many = () => Array.from({ length: 10 }, (_, index) => lease({ jobId: `job-${index}` }));
  const ok = async () => 'provider-event';

  const batch = fakeRepository(many());
  const batchResult = await drainCalendarSyncJobs(batch.repository, { maxJobs: 3, deliver: ok });
  assert.deepEqual(batchResult, { processed: 3, failed: 0, terminal: 0, reconnectRequired: 0, truncated: true });
  assert.ok(batch.calls.every((call) => call !== 'lease:acc-1'), 'the scheduled drain is not account scoped');

  let clock = 0;
  const timed = fakeRepository(many());
  const timedResult = await drainCalendarSyncJobs(timed.repository, {
    maxJobs: 50,
    timeBudgetMs: 25,
    now: () => clock,
    deliver: async () => {
      clock += 10;
      return 'provider-event';
    },
  });
  assert.equal(timedResult.processed, 3);
  assert.equal(timedResult.truncated, true);

  const empty = fakeRepository([lease()], 1);
  const emptyResult = await drainCalendarSyncJobs(empty.repository, {
    accountId: 'acc-1',
    maxJobs: 20,
    deliver: async () => {
      throw new Error('provider_http_500');
    },
  });
  assert.deepEqual(emptyResult, { processed: 0, failed: 1, terminal: 1, reconnectRequired: 0, truncated: false });
  assert.deepEqual(empty.calls, ['lease:acc-1', 'fail:job-1:provider_http_500', 'lease:acc-1']);
});

test('tick limits read positive integers and fall back otherwise', () => {
  assert.deepEqual(calendarSyncTickLimits({}), { maxJobs: 50, timeBudgetMs: 30_000 });
  assert.deepEqual(calendarSyncTickLimits({ MISSA_CALENDAR_SYNC_BATCH_SIZE: '5', MISSA_CALENDAR_SYNC_TIME_BUDGET_MS: '-1' }), { maxJobs: 5, timeBudgetMs: 30_000 });
});
