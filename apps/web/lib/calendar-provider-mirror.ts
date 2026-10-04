import {
  creatorPoolFor,
  mirrorCalendarProviderAccount,
  mirrorCalendarProviderEvents,
  type CalendarMirrorTickResult,
  type ProviderMirrorPurpose,
} from "@missa/radar-adapters";
import type { Pool } from "pg";

const positiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/** Scheduled mirror bounds; see docs/railway-topology.md (creator-worker). */
export function calendarMirrorTickLimits(env: Record<string, string | undefined> = process.env) {
  return {
    maxAccounts: positiveInt(env.MISSA_CALENDAR_MIRROR_ACCOUNTS, 200),
    timeBudgetMs: positiveInt(env.MISSA_CALENDAR_MIRROR_TIME_BUDGET_MS, 15_000),
  };
}

/**
 * The creator tick's mirror step: plan steps, stages, fee-tier closes and
 * forecasts become calendar events for creators with a Google or Microsoft
 * connection, right before the provider drain delivers them.
 */
export async function mirrorCalendarProviderTick(
  pool: Pool | undefined,
  accountId?: string,
): Promise<CalendarMirrorTickResult | undefined> {
  if (!pool) return undefined;
  return mirrorCalendarProviderEvents(pool, { accountId, ...calendarMirrorTickLimits() });
}

/**
 * Called after a plan step is created, edited, completed, skipped or removed,
 * so the provider copy changes on the next drain instead of waiting for the
 * next mirror pass. Best effort: the scheduled pass repairs anything missed.
 */
export async function mirrorCalendarProviderAfterEdit(
  accountId: string,
  purposes: readonly ProviderMirrorPurpose[] = ["plan-step"],
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await mirrorCalendarProviderAccount(creatorPoolFor(process.env.DATABASE_URL), accountId, { purposes }).catch(
    () => undefined,
  );
}
