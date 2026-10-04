import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

/**
 * Small shared helpers for the recurring-cycle modules (forecasts, opening
 * alerts, carry to next cycle): calendar-date arithmetic on ISO strings and
 * the one Inbox insert they all use.
 */

export type CycleDb = Pool | PoolClient;

const DAY_MS = 86_400_000;

export function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function shiftIsoDate(iso: string, days: number): string {
  return isoDay(new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS));
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function isoDaysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** The middle day of an inclusive window. */
export function isoMidpoint(start: string, end: string): string {
  return shiftIsoDate(start, Math.floor(isoDaysBetween(start, end) / 2));
}

/** "Oct 3", or "Oct 3, 2027" outside the reference year. */
export function shortDate(iso: string, now = new Date()): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(date.getUTCFullYear() !== now.getUTCFullYear() ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}

export function dateWindowLabel(start: string | null, end: string | null, now = new Date()): string | null {
  if (start && end && start !== end) return `between ${shortDate(start, now)} and ${shortDate(end, now)}`;
  const single = start ?? end;
  return single ? `around ${shortDate(single, now)}` : null;
}

export async function relationsReady(db: CycleDb, relations: string[]): Promise<boolean> {
  const result = await db.query<{ ready: boolean }>(
    "select bool_and(to_regclass(name) is not null) as ready from unnest($1::text[]) as r(name)",
    [relations.map((name) => `public.${name}`)],
  );
  return Boolean(result.rows[0]?.ready);
}

export type CycleNotice = {
  accountId: string;
  opportunityId: string;
  kind: "opens-soon" | "forecast-changed" | "cycle-carry-suggested" | "call-reopened";
  title: string;
  body: string;
  reason: string;
  dedupeKey: string;
  actionHref: string;
};

/** Inserts one Inbox notice; returns 1 when new, 0 when the dedupe key already exists. */
export async function insertCycleNotice(db: CycleDb, notice: CycleNotice): Promise<number> {
  const inserted = await db.query(
    `insert into creator_inbox_alerts(id,account_id,opportunity_id,kind,title,body,reason,dedupe_key,delivery_eligibility,action_href)
     values($1,$2,$3,$4,$5,$6,$7,$8,'in-app',$9)
     on conflict (account_id,dedupe_key) do nothing`,
    [
      randomUUID(),
      notice.accountId,
      notice.opportunityId,
      notice.kind,
      notice.title,
      notice.body,
      notice.reason,
      notice.dedupeKey,
      notice.actionHref,
    ],
  );
  return inserted.rowCount ?? 0;
}

export function opportunityHref(opportunityId: string): string {
  return `/opportunities/${encodeURIComponent(opportunityId)}`;
}

export function trackerHref(opportunityId: string): string {
  return `/tracker?view=saved&application=${encodeURIComponent(opportunityId)}`;
}
