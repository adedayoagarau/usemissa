import { predictNextOpening, type OpportunityCycle } from "@missa/radar-engine";
import {
  dateWindowLabel,
  insertCycleNotice,
  isoDay,
  isoDaysBetween,
  isoMidpoint,
  opportunityHref,
  relationsReady,
  shiftIsoDate,
  shortDate,
  type CycleDb,
} from "./cycleNotices.js";

/**
 * Recurring cycles and the forecast of the next one.
 *
 * 1. `backfillCycleHistory` records one row per observed cycle year in
 *    `opportunity_cycle_history`, from yearly `opportunity_versions` snapshots,
 *    the opportunity's current dates and `opportunity_call_windows`.
 * 2. `confirmForecasts` runs before a refresh: when the source publishes the
 *    forecasted cycle's dates, the forecast is marked confirmed and, if Missa's
 *    prediction was off, everyone tracking or following the call is told the
 *    predicted and confirmed dates plainly.
 * 3. `refreshForecasts` turns two or more cycles into the next expected window
 *    with `predictNextOpening` from @missa/radar-engine (the same prediction the
 *    engine uses; this module only adapts its input and output).
 *
 * Forecasts are always predictions until confirmed; nothing here writes to the
 * opportunity's own dates.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Deadline kinds whose date is a real observation of a cycle. */
const DATED_KINDS = ["exact", "inferred"];
/** How far from the forecast a published date may be and still confirm it. */
const CONFIRMATION_RANGE_DAYS = 120;
const BATCH = 1000;

export type CycleSnapshot = {
  openDate?: string | null;
  deadlineDate?: string | null;
  deadlineKind?: string | null;
};

export type ObservedCycle = { cycleYear: number; openedOn: string | null; closedOn: string | null };

function validDate(value: string | null | undefined): string | null {
  return value && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? value : null;
}

/**
 * One cycle per year from snapshots, oldest first. A cycle belongs to the year
 * it closes (a call that opens in December and closes in February is the
 * February year's cycle); a later snapshot of the same year corrects an
 * earlier one field by field.
 */
export function cyclesFromSnapshots(snapshots: CycleSnapshot[]): ObservedCycle[] {
  const byYear = new Map<number, ObservedCycle>();
  for (const snapshot of snapshots) {
    const openedOn = validDate(snapshot.openDate);
    const kindDated = !snapshot.deadlineKind || DATED_KINDS.includes(snapshot.deadlineKind);
    const closedOn = kindDated ? validDate(snapshot.deadlineDate) : null;
    if (openedOn && closedOn && openedOn > closedOn) continue; // not one cycle
    const anchor = closedOn ?? openedOn;
    if (!anchor) continue;
    const cycleYear = Number(anchor.slice(0, 4));
    const existing = byYear.get(cycleYear);
    byYear.set(cycleYear, {
      cycleYear,
      openedOn: openedOn ?? existing?.openedOn ?? null,
      closedOn: closedOn ?? existing?.closedOn ?? null,
    });
  }
  return [...byYear.values()].sort((a, b) => a.cycleYear - b.cycleYear);
}

/**
 * History rows as engine cycles. The same opening recorded under two years (an
 * early snapshot before the deadline was known) is counted once.
 */
export function historyToCycles(rows: { openedOn: string | null; closedOn: string | null }[]): OpportunityCycle[] {
  const byOpening = new Map<string, OpportunityCycle>();
  const seenClose = new Set<string>();
  const cycles: OpportunityCycle[] = [];
  for (const row of rows) {
    const earlier = row.openedOn ? byOpening.get(row.openedOn) : undefined;
    const closedOn = row.closedOn && !seenClose.has(row.closedOn) ? row.closedOn : undefined;
    if (closedOn) seenClose.add(closedOn);
    if (earlier) {
      if (closedOn && !earlier.closedOn) earlier.closedOn = closedOn;
      continue;
    }
    const openedOn = row.openedOn ?? undefined;
    if (!openedOn && !closedOn) continue;
    const cycle: OpportunityCycle = { ...(openedOn ? { openedOn } : {}), ...(closedOn ? { closedOn } : {}) };
    if (openedOn) byOpening.set(openedOn, cycle);
    cycles.push(cycle);
  }
  return cycles;
}

export type ComputedForecast = {
  expectedOpenStart: string | null;
  expectedOpenEnd: string | null;
  expectedClose: string | null;
  confidence: "high" | "medium" | "low";
  basedOnCycles: number;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
}

/**
 * The next expected cycle from past ones. Openings go straight to
 * `predictNextOpening`; the expected close is the predicted opening plus the
 * usual time a call stays open. Calls Missa has only seen close are forecast
 * by giving the engine their closing dates in place of openings.
 */
export function forecastFromCycles(cycles: OpportunityCycle[], now: Date): ComputedForecast | undefined {
  const opening = predictNextOpening(cycles, now);
  if (opening) {
    const gaps = cycles
      .filter((cycle) => cycle.openedOn && cycle.closedOn)
      .map((cycle) => isoDaysBetween(cycle.openedOn!, cycle.closedOn!))
      .filter((gap) => gap > 0 && gap <= 366);
    const expectedClose = gaps.length
      ? shiftIsoDate(isoMidpoint(opening.expectedOpenStart, opening.expectedOpenEnd), median(gaps))
      : null;
    return {
      expectedOpenStart: opening.expectedOpenStart,
      expectedOpenEnd: opening.expectedOpenEnd,
      expectedClose,
      confidence: opening.confidence,
      basedOnCycles: opening.basedOnCycles,
    };
  }
  const closing = predictNextOpening(
    cycles.filter((cycle) => cycle.closedOn).map((cycle) => ({ openedOn: cycle.closedOn })),
    now,
  );
  if (!closing) return undefined;
  return {
    expectedOpenStart: null,
    expectedOpenEnd: null,
    expectedClose: isoMidpoint(closing.expectedOpenStart, closing.expectedOpenEnd),
    confidence: closing.confidence,
    basedOnCycles: closing.basedOnCycles,
  };
}

export type ForecastWindow = {
  expectedOpenStart: string | null;
  expectedOpenEnd: string | null;
  expectedClose: string | null;
};

export type ForecastConfirmation = {
  basis: "open" | "close";
  confirmedOn: string;
  /** 0 when the published date fell in the forecast window; negative when earlier. */
  deltaDays: number;
};

/**
 * Whether a published date confirms the forecast, and how far off it was. An
 * opening inside the predicted window counts as exact; a deadline is compared
 * with the single expected close.
 */
export function confirmationFor(
  forecast: ForecastWindow,
  published: { openDate: string | null; deadlineDate: string | null },
  today: string,
): ForecastConfirmation | undefined {
  const { expectedOpenStart: start, expectedOpenEnd: end, expectedClose } = forecast;
  const open = validDate(published.openDate);
  if (open && start && end) {
    const before = isoDaysBetween(start, open);
    const after = isoDaysBetween(end, open);
    if (before >= -CONFIRMATION_RANGE_DAYS && after <= CONFIRMATION_RANGE_DAYS) {
      return { basis: "open", confirmedOn: open, deltaDays: before < 0 ? before : after > 0 ? after : 0 };
    }
  }
  const deadline = validDate(published.deadlineDate);
  if (deadline && expectedClose && deadline >= today) {
    const delta = isoDaysBetween(expectedClose, deadline);
    if (Math.abs(delta) <= CONFIRMATION_RANGE_DAYS) return { basis: "close", confirmedOn: deadline, deltaDays: delta };
  }
  return undefined;
}

export const CYCLE_TABLES = ["opportunity_cycle_history", "opportunity_cycle_forecasts"];

export type BackfillOptions = {
  /** Only snapshots, windows and listings changed since this moment. */
  since?: Date;
  opportunityIds?: string[];
  /** Count what would be written without writing it. */
  dryRun?: boolean;
};

export type BackfillResult = { opportunities: number; cycles: number; written: number };

type HistoryWrite = ObservedCycle & { opportunityId: string; source: "version-history" | "call-window" };

/** Records observed cycles. Admin and organization rows are never overwritten. */
export async function backfillCycleHistory(db: CycleDb, options: BackfillOptions = {}): Promise<BackfillResult> {
  if (!(await relationsReady(db, CYCLE_TABLES))) return { opportunities: 0, cycles: 0, written: 0 };
  const since = options.since?.toISOString() ?? null;
  const ids = options.opportunityIds ?? null;
  const writes: HistoryWrite[] = [];

  const versions = await db.query<{
    opportunity_id: string;
    open_date: string | null;
    deadline_date: string | null;
    deadline_kind: string | null;
  }>(
    `select v.opportunity_id, v.fields->>'openDate' as open_date,
            v.fields->'deadline'->>'date' as deadline_date, v.fields->'deadline'->>'kind' as deadline_kind
       from opportunity_versions v
      where ($1::timestamptz is null or v.created_at >= $1::timestamptz)
        and ($2::text[] is null or v.opportunity_id = any($2::text[]))
        and (v.fields ? 'openDate' or v.fields->'deadline' ? 'date')
      order by v.opportunity_id, v.created_at`,
    [since, ids],
  );
  const current = await db.query<{
    opportunity_id: string;
    open_date: string | null;
    deadline_date: string | null;
    deadline_kind: string | null;
  }>(
    `select o.id as opportunity_id, o.open_date::text as open_date, o.deadline_date::text as deadline_date, o.deadline_kind
       from opportunities o
      where (o.open_date is not null or o.deadline_date is not null)
        and ($1::timestamptz is null or o.updated_at >= $1::timestamptz)
        and ($2::text[] is null or o.id = any($2::text[]))
      order by o.id`,
    [since, ids],
  );
  const snapshotsByOpportunity = new Map<string, CycleSnapshot[]>();
  for (const row of [...versions.rows, ...current.rows]) {
    const list = snapshotsByOpportunity.get(row.opportunity_id) ?? [];
    list.push({ openDate: row.open_date, deadlineDate: row.deadline_date, deadlineKind: row.deadline_kind });
    snapshotsByOpportunity.set(row.opportunity_id, list);
  }
  for (const [opportunityId, snapshots] of snapshotsByOpportunity) {
    for (const cycle of cyclesFromSnapshots(snapshots)) writes.push({ ...cycle, opportunityId, source: "version-history" });
  }

  const windows = await db.query<{ opportunity_id: string; opens_at: string | null; closes_at: string | null }>(
    `select w.opportunity_id, w.opens_at::text as opens_at, w.closes_at::text as closes_at
       from opportunity_call_windows w
      where w.kind not in ('rolling', 'year-round')
        and (w.opens_at is not null or w.closes_at is not null)
        and ($1::timestamptz is null or w.updated_at >= $1::timestamptz)
        and ($2::text[] is null or w.opportunity_id = any($2::text[]))
      order by w.opportunity_id, w.updated_at`,
    [since, ids],
  );
  const windowsByOpportunity = new Map<string, CycleSnapshot[]>();
  for (const row of windows.rows) {
    const list = windowsByOpportunity.get(row.opportunity_id) ?? [];
    list.push({ openDate: row.opens_at, deadlineDate: row.closes_at });
    windowsByOpportunity.set(row.opportunity_id, list);
  }
  for (const [opportunityId, snapshots] of windowsByOpportunity) {
    for (const cycle of cyclesFromSnapshots(snapshots)) writes.push({ ...cycle, opportunityId, source: "call-window" });
  }

  const opportunities = new Set(writes.map((write) => write.opportunityId)).size;
  if (options.dryRun) return { opportunities, cycles: writes.length, written: 0 };
  let written = 0;
  for (let index = 0; index < writes.length; index += BATCH) {
    const batch = writes.slice(index, index + BATCH);
    const result = await db.query(
      `insert into opportunity_cycle_history as h (opportunity_id, cycle_year, opened_on, closed_on, source)
       select u.opportunity_id, u.cycle_year, u.opened_on, u.closed_on, u.source
         from unnest($1::text[], $2::smallint[], $3::date[], $4::date[], $5::text[])
              as u(opportunity_id, cycle_year, opened_on, closed_on, source)
        where exists (select 1 from opportunities o where o.id = u.opportunity_id)
       on conflict (opportunity_id, cycle_year) do update
         set opened_on = coalesce(excluded.opened_on, h.opened_on),
             closed_on = coalesce(excluded.closed_on, h.closed_on),
             source = excluded.source,
             recorded_at = now()
       where h.source in ('version-history', 'call-window')
         and (h.opened_on is distinct from coalesce(excluded.opened_on, h.opened_on)
           or h.closed_on is distinct from coalesce(excluded.closed_on, h.closed_on)
           or h.source is distinct from excluded.source)`,
      [
        batch.map((write) => write.opportunityId),
        batch.map((write) => write.cycleYear),
        batch.map((write) => write.openedOn),
        batch.map((write) => write.closedOn),
        batch.map((write) => write.source),
      ],
    );
    written += result.rowCount ?? 0;
  }
  return { opportunities, cycles: writes.length, written };
}

export type RefreshForecastsResult = { considered: number; upserted: number; removed: number; keptConfirmed: number };

/**
 * Recomputes forecasts from cycle history. A confirmed forecast whose cycle is
 * still under way is left alone; once that cycle has closed, the next one is
 * forecast and the confirmation is cleared.
 */
export async function refreshForecasts(
  db: CycleDb,
  options: { now?: Date; opportunityIds?: string[] } = {},
): Promise<RefreshForecastsResult> {
  const result: RefreshForecastsResult = { considered: 0, upserted: 0, removed: 0, keptConfirmed: 0 };
  if (!(await relationsReady(db, CYCLE_TABLES))) return result;
  const now = options.now ?? new Date();
  const today = isoDay(now);
  const rows = await db.query<{
    opportunity_id: string;
    opened: (string | null)[];
    closed: (string | null)[];
    open_date: string | null;
    deadline_date: string | null;
    confirmed_at: Date | null;
  }>(
    `select h.opportunity_id,
            array_agg(h.opened_on::text order by h.cycle_year) as opened,
            array_agg(h.closed_on::text order by h.cycle_year) as closed,
            o.open_date::text as open_date, o.deadline_date::text as deadline_date, f.confirmed_at
       from opportunity_cycle_history h
       join opportunities o on o.id = h.opportunity_id
       left join opportunity_cycle_forecasts f on f.opportunity_id = h.opportunity_id
      where ($1::text[] is null or h.opportunity_id = any($1::text[]))
      group by h.opportunity_id, o.open_date, o.deadline_date, f.confirmed_at
     having count(*) >= 2`,
    [options.opportunityIds ?? null],
  );
  for (const row of rows.rows) {
    result.considered += 1;
    if (row.confirmed_at && confirmedCycleUnderWay(row, today, now)) {
      result.keptConfirmed += 1;
      continue;
    }
    const cycles = historyToCycles(row.opened.map((openedOn, index) => ({ openedOn, closedOn: row.closed[index] ?? null })));
    const forecast = forecastFromCycles(cycles, now);
    if (!forecast) {
      const removed = await db.query("delete from opportunity_cycle_forecasts where opportunity_id = $1", [row.opportunity_id]);
      result.removed += removed.rowCount ?? 0;
      continue;
    }
    await db.query(
      `insert into opportunity_cycle_forecasts as f
         (opportunity_id, expected_open_start, expected_open_end, expected_close, confidence, based_on_cycles, computed_at, confirmed_at, confirmed_delta_days)
       values ($1, $2::date, $3::date, $4::date, $5, $6, now(), null, null)
       on conflict (opportunity_id) do update
         set expected_open_start = excluded.expected_open_start,
             expected_open_end = excluded.expected_open_end,
             expected_close = excluded.expected_close,
             confidence = excluded.confidence,
             based_on_cycles = excluded.based_on_cycles,
             computed_at = now(),
             confirmed_at = null,
             confirmed_delta_days = null`,
      [
        row.opportunity_id,
        forecast.expectedOpenStart,
        forecast.expectedOpenEnd,
        forecast.expectedClose,
        forecast.confidence,
        forecast.basedOnCycles,
      ],
    );
    result.upserted += 1;
  }
  return result;
}

function confirmedCycleUnderWay(
  row: { open_date: string | null; deadline_date: string | null; confirmed_at: Date | null },
  today: string,
  now: Date,
): boolean {
  if (row.deadline_date && row.deadline_date >= today) return true;
  if (row.open_date && row.open_date >= today) return true;
  // Confirmed by an opening with no deadline yet: keep it for a season.
  return !row.deadline_date && row.confirmed_at !== null && now.getTime() - new Date(row.confirmed_at).getTime() < 120 * 86_400_000;
}

export type ConfirmForecastsResult = { confirmed: number; notices: number };

/**
 * Marks forecasts confirmed once the source publishes the forecast cycle's
 * dates. When the published date differs from the prediction, accounts that
 * track the call or follow its organization get a `forecast-changed` notice
 * that says what Missa predicted and what is now confirmed.
 */
export async function confirmForecasts(
  db: CycleDb,
  options: { now?: Date; opportunityIds?: string[] } = {},
): Promise<ConfirmForecastsResult> {
  const result: ConfirmForecastsResult = { confirmed: 0, notices: 0 };
  if (!(await relationsReady(db, CYCLE_TABLES))) return result;
  const now = options.now ?? new Date();
  const today = isoDay(now);
  const candidates = await db.query<{
    opportunity_id: string;
    title: string;
    organization_id: string | null;
    open_date: string | null;
    deadline_date: string | null;
    expected_open_start: string | null;
    expected_open_end: string | null;
    expected_close: string | null;
  }>(
    `select f.opportunity_id, o.title, o.organization_id, o.open_date::text as open_date,
            case when o.deadline_kind = 'exact' then o.deadline_date::text end as deadline_date,
            f.expected_open_start::text as expected_open_start, f.expected_open_end::text as expected_open_end,
            f.expected_close::text as expected_close
       from opportunity_cycle_forecasts f
       join opportunities o on o.id = f.opportunity_id
      where f.confirmed_at is null
        and ($1::text[] is null or f.opportunity_id = any($1::text[]))
        and (o.open_date is not null or (o.deadline_kind = 'exact' and o.deadline_date >= $2::date))`,
    [options.opportunityIds ?? null, today],
  );
  for (const row of candidates.rows) {
    const forecast = {
      expectedOpenStart: row.expected_open_start,
      expectedOpenEnd: row.expected_open_end,
      expectedClose: row.expected_close,
    };
    const confirmation = confirmationFor(forecast, { openDate: row.open_date, deadlineDate: row.deadline_date }, today);
    if (!confirmation) continue;
    const updated = await db.query(
      `update opportunity_cycle_forecasts set confirmed_at = $2, confirmed_delta_days = $3
        where opportunity_id = $1 and confirmed_at is null`,
      [row.opportunity_id, now.toISOString(), confirmation.deltaDays],
    );
    if (!updated.rowCount) continue;
    result.confirmed += 1;
    if (confirmation.deltaDays === 0) continue;
    const copy = forecastChangedCopy(row.title, forecast, confirmation, now);
    const recipients = await db.query<{ account_id: string; reason: "tracked" | "follows" }>(
      `select t.account_id, 'tracked' as reason
         from tracked_opportunities t
        where t.opportunity_id = $1 and t.status not in ('archived', 'withdrawn')
       union
       select f.account_id, 'follows' as reason
         from organization_follows f
        where $2::text is not null and f.organization_id = $2
          and not exists (select 1 from tracked_opportunities t2 where t2.account_id = f.account_id and t2.opportunity_id = $1 and t2.status not in ('archived', 'withdrawn'))`,
      [row.opportunity_id, row.organization_id],
    );
    for (const recipient of recipients.rows) {
      result.notices += await insertCycleNotice(db, {
        accountId: recipient.account_id,
        opportunityId: row.opportunity_id,
        kind: "forecast-changed",
        title: copy.title,
        body: copy.body,
        reason: recipient.reason === "tracked" ? "You saved this opportunity." : "You follow this organization.",
        dedupeKey: `forecast-changed:${row.opportunity_id}:${confirmation.confirmedOn}`,
        actionHref: opportunityHref(row.opportunity_id),
      });
    }
  }
  return result;
}

/** Calm, plain copy naming the predicted and the confirmed date. */
export function forecastChangedCopy(
  title: string,
  forecast: ForecastWindow,
  confirmation: ForecastConfirmation,
  now = new Date(),
): { title: string; body: string } {
  const confirmed = shortDate(confirmation.confirmedOn, now);
  const days = Math.abs(confirmation.deltaDays);
  const direction = `${days} ${days === 1 ? "day" : "days"} ${confirmation.deltaDays < 0 ? "earlier" : "later"} than predicted`;
  if (confirmation.basis === "open") {
    const predicted = dateWindowLabel(forecast.expectedOpenStart, forecast.expectedOpenEnd, now) ?? "at another time";
    return {
      title: `${title} now has a confirmed opening date`,
      body: `The predicted opening moved from ${predicted} to ${confirmed}, now confirmed by the source. That is ${direction}.`,
    };
  }
  const predicted = forecast.expectedClose ? `around ${shortDate(forecast.expectedClose, now)}` : "another date";
  return {
    title: `${title} now has a confirmed deadline`,
    body: `The predicted deadline moved from ${predicted} to ${confirmed}, now confirmed by the source. That is ${direction}.`,
  };
}
