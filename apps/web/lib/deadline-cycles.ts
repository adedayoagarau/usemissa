import {
  backfillCycleHistory,
  confirmForecasts,
  creatorPoolFor,
  ensureDefaultOpeningAlerts,
  fireOpeningAlerts,
  refreshForecasts,
  cycleRelationsReady,
  suggestCycleCarries,
  type CycleDb,
} from '@missa/radar-adapters';

/**
 * Recurring cycles: forecasts of the next opening from past cycles, the
 * opens-soon and it-opened alerts, and carry-to-next-cycle suggestions.
 *
 * Slice B owns this module. The Foundation commit wires it into the creator
 * tick with these signatures.
 */

export type ForecastRefreshResult = { processed: number; skipped?: string };
export type OpeningAlertTickResult = { processed: number };

/** platform_settings key holding the last forecast refresh, which throttles the work. */
export const FORECAST_REFRESH_KEY = 'deadline-cycles.forecast-refresh';
export const FORECAST_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Claims the refresh slot when the last run is older than the interval. The
 * claim is one conditional upsert, so two workers ticking at once cannot both
 * run the refresh. Returns the previous run's start, or null on a first run.
 */
export async function claimForecastRefresh(
  db: CycleDb,
  now: Date,
): Promise<{ claimed: boolean; previous: Date | null }> {
  const cutoff = new Date(now.getTime() - FORECAST_REFRESH_INTERVAL_MS).toISOString();
  const before = await db.query<{ last: string | null }>(
    "select value->>'lastStartedAt' as last from platform_settings where key = $1",
    [FORECAST_REFRESH_KEY],
  );
  const claimed = await db.query(
    `insert into platform_settings (key, value, updated_at, updated_by)
     values ($1, jsonb_build_object('lastStartedAt', $2::text), now(), 'creator-worker')
     on conflict (key) do update set value = platform_settings.value || excluded.value, updated_at = now()
     where coalesce((platform_settings.value->>'lastStartedAt')::timestamptz, '-infinity'::timestamptz) < $3::timestamptz`,
    [FORECAST_REFRESH_KEY, now.toISOString(), cutoff],
  );
  const last = before.rows[0]?.last;
  return { claimed: (claimed.rowCount ?? 0) > 0, previous: last ? new Date(last) : null };
}

/** Recompute forecasts that are stale. Cheap to call every tick; it throttles itself. */
export async function refreshCycleForecasts(now = new Date()): Promise<ForecastRefreshResult> {
  if (!process.env.DATABASE_URL) return { processed: 0, skipped: 'no-database' };
  const pool = creatorPoolFor(process.env.DATABASE_URL);
  if (!(await cycleRelationsReady(pool, ['opportunity_cycle_history', 'opportunity_cycle_forecasts', 'platform_settings']))) {
    return { processed: 0, skipped: 'not-migrated' };
  }
  const claim = await claimForecastRefresh(pool, now);
  if (!claim.claimed) return { processed: 0, skipped: 'throttled' };
  // Confirm first, so a newly published cycle is compared with the forecast
  // made before it; then record new observations and forecast what comes next.
  const confirmed = await confirmForecasts(pool, { now });
  const history = await backfillCycleHistory(pool, claim.previous ? { since: claim.previous } : {});
  const forecasts = await refreshForecasts(pool, { now });
  await pool.query(
    `update platform_settings
        set value = value || jsonb_build_object('lastCompletedAt', $2::text, 'confirmed', $3::int, 'cycles', $4::int, 'forecasts', $5::int),
            updated_at = now()
      where key = $1`,
    [FORECAST_REFRESH_KEY, new Date().toISOString(), confirmed.confirmed, history.written, forecasts.upserted],
  );
  return { processed: confirmed.confirmed + history.written + forecasts.upserted + forecasts.removed };
}

/** Opens-soon and it-opened notices for followed, tracked and closed-with-forecast calls. */
export async function tickOpeningAlerts(accountId?: string, now = new Date()): Promise<OpeningAlertTickResult> {
  if (!process.env.DATABASE_URL) return { processed: 0 };
  const pool = creatorPoolFor(process.env.DATABASE_URL);
  const scope = { accountId, now };
  await ensureDefaultOpeningAlerts(pool, scope);
  const fired = await fireOpeningAlerts(pool, scope);
  const carries = await suggestCycleCarries(pool, scope);
  return { processed: fired.notices + carries.notices };
}
