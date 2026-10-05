import type {
  CalendarSyncLease,
  PostgresCreatorCalendarRepository,
} from "@missa/radar-adapters";
import {
  CalendarProviderError,
  CalendarReconnectRequiredError,
  deliverCalendarSync,
  type CalendarDeliveryHooks,
} from "./calendar-providers";

/** The repository surface the drain needs; tests pass an in-memory double. */
export type CalendarSyncRepository = Pick<
  PostgresCreatorCalendarRepository,
  | "leaseSyncJob"
  | "completeSyncJob"
  | "failSyncJob"
  | "requireCalendarReconnect"
  | "rotateCalendarRefreshToken"
>;

export type CalendarDeliver = (
  lease: CalendarSyncLease,
  hooks: CalendarDeliveryHooks,
) => Promise<string | undefined>;

export type CalendarSyncJobOutcome =
  | "succeeded"
  | "failed"
  | "failed-terminal"
  | "reconnect-required";

export type CalendarSyncDrainResult = {
  processed: number;
  failed: number;
  terminal: number;
  reconnectRequired: number;
  /** True when the batch or time budget ran out before the queue was empty. */
  truncated: boolean;
};

const errorCode = (error: unknown) =>
  error instanceof CalendarProviderError
    ? error.code
    : error instanceof Error
      ? error.message
      : "provider_failed";

/**
 * Delivers one leased job and settles it. Shared by the in-app sync request
 * and the scheduled creator tick so both apply the same retry, attempt-cap,
 * reconnect and token-rotation rules.
 */
export async function processCalendarSyncLease(
  repository: CalendarSyncRepository,
  lease: CalendarSyncLease,
  deliver: CalendarDeliver = deliverCalendarSync,
): Promise<CalendarSyncJobOutcome> {
  // The event was deleted after this upsert was queued; its delete job owns
  // the provider side, so there is nothing left to deliver.
  if (lease.operation === "upsert" && !lease.event) {
    await repository.completeSyncJob(lease);
    return "succeeded";
  }
  try {
    const providerEventId = await deliver(lease, {
      onRefreshTokenRotated: (refreshToken) =>
        repository.rotateCalendarRefreshToken(lease.connectionId, refreshToken),
    });
    await repository.completeSyncJob(lease, providerEventId);
    return "succeeded";
  } catch (error) {
    if (error instanceof CalendarReconnectRequiredError) {
      await repository.requireCalendarReconnect(lease, error.code);
      return "reconnect-required";
    }
    const { terminal } = await repository.failSyncJob(
      lease.jobId,
      errorCode(error),
    );
    return terminal ? "failed-terminal" : "failed";
  }
}

/**
 * Leases and delivers due jobs until the queue is empty, `maxJobs` have been
 * handled, or `timeBudgetMs` has elapsed. The budget is checked before each
 * lease, so one slow provider call can overrun it by at most its own timeout.
 */
export async function drainCalendarSyncJobs(
  repository: CalendarSyncRepository,
  options: {
    accountId?: string;
    maxJobs: number;
    timeBudgetMs?: number;
    deliver?: CalendarDeliver;
    now?: () => number;
  },
): Promise<CalendarSyncDrainResult> {
  const now = options.now ?? Date.now;
  const deadline =
    options.timeBudgetMs === undefined
      ? Number.POSITIVE_INFINITY
      : now() + options.timeBudgetMs;
  const result: CalendarSyncDrainResult = {
    processed: 0,
    failed: 0,
    terminal: 0,
    reconnectRequired: 0,
    truncated: false,
  };
  for (let handled = 0; ; handled++) {
    if (handled >= options.maxJobs || now() >= deadline) {
      result.truncated = true;
      break;
    }
    const lease = await repository.leaseSyncJob(options.accountId);
    if (!lease) break;
    const outcome = await processCalendarSyncLease(
      repository,
      lease,
      options.deliver,
    );
    if (outcome === "succeeded") result.processed++;
    else if (outcome === "reconnect-required") result.reconnectRequired++;
    else {
      result.failed++;
      if (outcome === "failed-terminal") result.terminal++;
    }
  }
  return result;
}

const positiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/** Scheduled drain bounds; see docs/railway-topology.md (creator-worker). */
export function calendarSyncTickLimits(
  env: Record<string, string | undefined> = process.env,
) {
  return {
    maxJobs: positiveInt(env.MISSA_CALENDAR_SYNC_BATCH_SIZE, 50),
    timeBudgetMs: positiveInt(env.MISSA_CALENDAR_SYNC_TIME_BUDGET_MS, 30_000),
  };
}
