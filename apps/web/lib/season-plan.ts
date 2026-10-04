/**
 * Season page arithmetic: this week's three actions, crunch weeks, the fee
 * budget and calls predicted to come back. Pure so every rule is testable;
 * dates are ISO calendar dates (YYYY-MM-DD) in the creator's day.
 */
import { crunchWeeks, type CrunchWeek } from "./deadline-chain";
import { addDays, daysBetween } from "./deadline-moment";

export const PREPARING_STATUSES = new Set([
  "interested",
  "saved",
  "preparing",
  "draft-started",
  "ready-to-submit",
]);

export type SeasonCall = {
  trackedId: string;
  opportunityId: string;
  title: string;
  organizationName?: string;
  myStatus: string;
  revision: number;
  deadline?: string;
  deadlineKind: string;
  feeStatus: "no-fee" | "paid" | "unknown";
  feeCents?: number;
  feeCurrency?: string;
  personalTargetOn?: string;
};

export type SeasonObligation = {
  id: string;
  opportunityId: string | null;
  opportunityTitle: string | null;
  kind: "start-by" | "sub-deadline" | "personal-target" | "obligation";
  label: string;
  dueOn: string;
  state: "open" | "done" | "skipped";
};

export type SeasonTier = {
  id: string;
  label: string;
  closesOn: string;
  feeCents?: number;
  feeCurrency?: string;
};

export type SeasonForecast = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  deadline?: string;
  relation: "tracked" | "following";
  forecast: {
    expectedOpenStart?: string;
    expectedOpenEnd?: string;
    expectedClose?: string;
    confidence: "high" | "medium" | "low";
    basedOnCycles: number;
  };
};

export const trackerItemHref = (opportunityId: string) =>
  `/tracker?application=${encodeURIComponent(opportunityId)}`;

/** Calls still being prepared, with a date to work towards. */
export function preparingCalls(calls: readonly SeasonCall[]): SeasonCall[] {
  return calls.filter((call) => PREPARING_STATUSES.has(call.myStatus));
}

export type WeekAction = {
  id: string;
  kind: "deadline" | "start-by" | "step" | "target" | "after-acceptance";
  title: string;
  /** Plain reason, e.g. "Application deadline" or "Start by". */
  detail: string;
  date: string;
  /** Days from today; negative when the date has passed and the step is still open. */
  daysAway: number;
  href: string;
};

const ACTION_RANK: Record<WeekAction["kind"], number> = {
  deadline: 0,
  step: 1,
  "start-by": 2,
  target: 3,
  "after-acceptance": 4,
};

const OBLIGATION_ACTION: Record<SeasonObligation["kind"], { kind: WeekAction["kind"]; detail: string }> = {
  "start-by": { kind: "start-by", detail: "Start by" },
  "sub-deadline": { kind: "step", detail: "Step due" },
  "personal-target": { kind: "target", detail: "Your target date" },
  obligation: { kind: "after-acceptance", detail: "After acceptance" },
};

/**
 * The three most important things to do in the next seven days: open plan
 * steps still waiting (oldest first), then the soonest dates. On the same day
 * an official deadline comes before a step, a step before a start-by.
 */
export function thisWeeksThree(input: {
  calls: readonly SeasonCall[];
  obligations: readonly SeasonObligation[];
  today: string;
  limit?: number;
}): WeekAction[] {
  const end = addDays(input.today, 6);
  const actions: WeekAction[] = [];
  for (const call of preparingCalls(input.calls)) {
    if (!call.deadline || call.deadline < input.today || call.deadline > end) continue;
    actions.push({
      id: `deadline:${call.opportunityId}`,
      kind: "deadline",
      title: call.title,
      detail: "Application deadline",
      date: call.deadline,
      daysAway: daysBetween(input.today, call.deadline) ?? 0,
      href: trackerItemHref(call.opportunityId),
    });
  }
  const callStatus = new Map(input.calls.map((call) => [call.opportunityId, call.myStatus]));
  for (const obligation of input.obligations) {
    if (obligation.state !== "open" || obligation.dueOn > end) continue;
    const status = obligation.opportunityId ? callStatus.get(obligation.opportunityId) : undefined;
    // A preparation step for a call that is already submitted or closed is no longer an action.
    if (obligation.kind !== "obligation" && status && !PREPARING_STATUSES.has(status)) continue;
    const meta = OBLIGATION_ACTION[obligation.kind];
    actions.push({
      id: `obligation:${obligation.id}`,
      kind: meta.kind,
      title: obligation.opportunityTitle ? `${obligation.label} · ${obligation.opportunityTitle}` : obligation.label,
      detail: meta.detail,
      date: obligation.dueOn,
      daysAway: daysBetween(input.today, obligation.dueOn) ?? 0,
      href: obligation.opportunityId ? trackerItemHref(obligation.opportunityId) : "/tracker",
    });
  }
  return actions
    .sort((a, b) => a.date.localeCompare(b.date) || ACTION_RANK[a.kind] - ACTION_RANK[b.kind] || a.id.localeCompare(b.id))
    .slice(0, input.limit ?? 3);
}

/** Deadlines per week across calls in preparation. */
export function seasonCrunchWeeks(calls: readonly SeasonCall[], today: string, weeks = 26): CrunchWeek[] {
  return crunchWeeks(
    preparingCalls(calls)
      .filter((call) => call.deadline)
      .map((call) => ({ id: call.opportunityId, date: call.deadline! })),
    today,
    weeks,
  );
}

/** First day of the month `offset` months after the month containing `date`. */
export function monthStart(date: string, offset = 0): string {
  const [year, month] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1 + offset, 1));
  return value.toISOString().slice(0, 10);
}

export type FeeLine = {
  opportunityId: string;
  title: string;
  /** Which month the deadline falls in. */
  month: "this" | "next";
  deadline: string;
  /** The fee that applies if you submit now; undefined when the fee is not published. */
  feeCents?: number;
  currency: string;
  /** The tier the fee comes from, when the call lists tiers. */
  tierLabel?: string;
  /** How much less you pay by submitting before the current tier closes. */
  savingsCents?: number;
  savingsUntil?: string;
};

export type FeeTotal = { currency: string; thisMonthCents: number; nextMonthCents: number; savingsCents: number };

export type FeeBudget = {
  lines: FeeLine[];
  totals: FeeTotal[];
  /** Calls whose fee is not published, so the totals leave them out. */
  unknownCount: number;
};

/**
 * Fees for calls in preparation with a deadline this month or next. When a
 * call lists fee tiers, the fee is the tier still open today, and the saving
 * is the gap to the fee at the deadline (the last tier).
 */
export function feeBudget(input: {
  calls: readonly SeasonCall[];
  tiersByOpportunity: ReadonlyMap<string, readonly SeasonTier[]>;
  today: string;
}): FeeBudget {
  const nextStart = monthStart(input.today, 1);
  const afterNext = monthStart(input.today, 2);
  const lines: FeeLine[] = [];
  let unknownCount = 0;
  for (const call of preparingCalls(input.calls)) {
    if (!call.deadline || call.deadline < input.today || call.deadline >= afterNext) continue;
    const month = call.deadline < nextStart ? "this" : "next";
    const tiers = [...(input.tiersByOpportunity.get(call.opportunityId) ?? [])]
      .filter((tier) => tier.feeCents !== undefined)
      .sort((a, b) => a.closesOn.localeCompare(b.closesOn));
    const current = tiers.find((tier) => tier.closesOn >= input.today);
    const last = tiers.at(-1);
    const base = { opportunityId: call.opportunityId, title: call.title, month, deadline: call.deadline } as const;
    if (current && current.feeCents !== undefined) {
      const saving = last && last !== current && last.feeCents !== undefined ? last.feeCents - current.feeCents : 0;
      lines.push({
        ...base,
        feeCents: current.feeCents,
        currency: current.feeCurrency ?? call.feeCurrency ?? "USD",
        tierLabel: current.label,
        ...(saving > 0 ? { savingsCents: saving, savingsUntil: current.closesOn } : {}),
      });
    } else if (call.feeStatus === "no-fee") {
      lines.push({ ...base, feeCents: 0, currency: call.feeCurrency ?? "USD" });
    } else if (call.feeStatus === "paid" && call.feeCents !== undefined) {
      lines.push({ ...base, feeCents: call.feeCents, currency: call.feeCurrency ?? "USD" });
    } else {
      unknownCount += 1;
      lines.push({ ...base, currency: call.feeCurrency ?? "USD" });
    }
  }
  const totals = new Map<string, FeeTotal>();
  for (const line of lines) {
    if (line.feeCents === undefined) continue;
    const total = totals.get(line.currency) ?? { currency: line.currency, thisMonthCents: 0, nextMonthCents: 0, savingsCents: 0 };
    if (line.month === "this") total.thisMonthCents += line.feeCents;
    else total.nextMonthCents += line.feeCents;
    total.savingsCents += line.savingsCents ?? 0;
    totals.set(line.currency, total);
  }
  return {
    lines: lines.sort((a, b) => a.deadline.localeCompare(b.deadline) || a.title.localeCompare(b.title)),
    totals: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    unknownCount,
  };
}

export type ComingBack = SeasonForecast & {
  /** The first predicted date to show: the opening window, else the close. */
  nextDate: string;
  label: string;
};

/**
 * Calls predicted to come back: forecasts for tracked or followed calls whose
 * current cycle has closed, soonest first. Always presented as predictions.
 */
export function comingBack(forecasts: readonly SeasonForecast[], today: string): ComingBack[] {
  const rows: ComingBack[] = [];
  for (const item of forecasts) {
    if (item.deadline && item.deadline >= today) continue;
    const { expectedOpenStart, expectedOpenEnd, expectedClose } = item.forecast;
    const openEnd = expectedOpenEnd ?? expectedOpenStart;
    if (expectedOpenStart && openEnd && openEnd >= today) {
      rows.push({ ...item, nextDate: expectedOpenStart, label: "Predicted to open" });
    } else if (expectedClose && expectedClose >= today) {
      rows.push({ ...item, nextDate: expectedClose, label: "Predicted deadline" });
    }
  }
  return rows.sort((a, b) => a.nextDate.localeCompare(b.nextDate) || a.title.localeCompare(b.title));
}

/**
 * A later personal target to offer as a one-tap fix: a week later, but never
 * after the official deadline. Null when there is no room to move.
 */
export function laterTarget(finishOn: string, deadline: string | undefined, days = 7): string | null {
  const proposed = addDays(finishOn, days);
  if (!deadline) return proposed;
  if (finishOn >= deadline) return null;
  return proposed > deadline ? deadline : proposed;
}
