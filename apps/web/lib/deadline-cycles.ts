/**
 * Recurring cycles: forecasts of the next opening from past cycles, and the
 * opens-soon and it-opened alerts.
 *
 * Slice B owns this module. The Foundation commit wires it into the creator
 * tick with these signatures.
 */

export type ForecastRefreshResult = { processed: number; skipped?: string };
export type OpeningAlertTickResult = { processed: number };

/** Recompute forecasts that are stale. Cheap to call every tick; it throttles itself. */
export async function refreshCycleForecasts(_now = new Date()): Promise<ForecastRefreshResult> {
  return { processed: 0, skipped: "not-implemented" };
}

/** Opens-soon and it-opened notices for followed, tracked and closed-with-forecast calls. */
export async function tickOpeningAlerts(_accountId?: string): Promise<OpeningAlertTickResult> {
  return { processed: 0 };
}
