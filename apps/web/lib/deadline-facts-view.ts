import type {
  OpportunityCycleForecast,
  OpportunityDeadlineFacts,
  OpportunityDeadlineTier,
  OpportunityStage,
} from "@missa/radar-engine";
import { describeDeadline, formatShortDate, type DeadlineMoment, type DeadlineMomentOptions } from "./deadline-moment";

/**
 * Presentation rules for the deadline facts on an Opportunity page: the
 * confidence label, "last checked", the previous date, fee tiers, stages and
 * the reopening forecast. Pure so the copy is testable.
 */

export type DeadlineFactsDeadline = {
  kind?: string | null;
  date?: string | null;
  time?: string | null;
  timezone?: string | null;
};

export type DeadlineConfidenceView = {
  state: OpportunityDeadlineFacts["provenance"]["state"];
  /** "Last checked Oct 2", when Missa has checked the source. */
  lastChecked?: string;
  /** "Previously Sep 28", when the organization moved the date. */
  previously?: string;
};

function calendarDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

export function deadlineConfidenceView(
  facts: OpportunityDeadlineFacts | undefined,
  now = new Date(),
): DeadlineConfidenceView | undefined {
  if (!facts) return undefined;
  const checked = calendarDate(facts.provenance.lastCheckedAt);
  const previous = facts.provenance.state === "changed" ? calendarDate(facts.provenance.previousDate) : undefined;
  return {
    state: facts.provenance.state,
    ...(checked ? { lastChecked: `Last checked ${formatShortDate(checked, now)}` } : {}),
    ...(previous ? { previously: `Previously ${formatShortDate(previous, now)}` } : {}),
  };
}

export type FeeTierView = {
  id: string;
  label: string;
  /** "Mar 1" or "Mar 1, 2027". */
  dateLabel: string;
  closesOn: string;
  moment: DeadlineMoment;
  feeCents?: number;
  feeCurrency?: string;
  /** The tier that is open now: the earliest one that has not closed. */
  current: boolean;
  probable: boolean;
};

export function feeTierViews(
  tiers: readonly OpportunityDeadlineTier[] | undefined,
  options: DeadlineMomentOptions = {},
): FeeTierView[] {
  if (!tiers?.length) return [];
  const now = options.now ?? new Date();
  const views = [...tiers]
    .sort((a, b) => a.closesOn.localeCompare(b.closesOn))
    .map((tier) => ({
      id: tier.id,
      label: tier.label,
      dateLabel: formatShortDate(tier.closesOn, now),
      closesOn: tier.closesOn,
      moment: describeDeadline({ kind: "exact", date: tier.closesOn, time: tier.closesAt, timezone: tier.timezone }, options),
      ...(tier.feeCents !== undefined ? { feeCents: tier.feeCents } : {}),
      ...(tier.feeCurrency ? { feeCurrency: tier.feeCurrency } : {}),
      current: false,
      probable: tier.confidence === "probable",
    }));
  const current = views.find((view) => view.moment.state === "open");
  if (current) current.current = true;
  return views;
}

export type StageView = {
  id: string;
  label: string;
  dateLabel: string;
  dueOn: string;
  /** "5:00 pm EDT, Jun 1" when the stage has an exact time. */
  timeLabel?: string;
  past: boolean;
  probable: boolean;
};

export function stageViews(
  stages: readonly OpportunityStage[] | undefined,
  options: DeadlineMomentOptions = {},
): StageView[] {
  if (!stages?.length) return [];
  const now = options.now ?? new Date();
  return [...stages]
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    .map((stage) => {
      const moment = describeDeadline({ kind: "exact", date: stage.dueOn, time: stage.dueAt, timezone: stage.timezone }, options);
      return {
        id: stage.id,
        label: stage.label,
        dateLabel: formatShortDate(stage.dueOn, now),
        dueOn: stage.dueOn,
        ...(moment.closesSource ? { timeLabel: moment.closesSource } : {}),
        past: moment.state === "closed",
        probable: stage.confidence === "probable",
      };
    });
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthName(isoDate: string, now: Date): string {
  const [year, month] = isoDate.split("-").map(Number) as [number, number];
  const name = MONTHS[month - 1] ?? isoDate;
  return year === now.getFullYear() ? name : `${name} ${year}`;
}

/**
 * "Expected to reopen around March — predicted from 3 past cycles". Shown only
 * when the call is closed or has no published date, so a prediction never
 * sits beside a confirmed deadline.
 */
export function forecastLine(
  forecast: OpportunityCycleForecast | undefined,
  deadline: DeadlineFactsDeadline,
  options: DeadlineMomentOptions = {},
): string | undefined {
  if (!forecast?.expectedOpenStart || forecast.basedOnCycles < 1) return undefined;
  const now = options.now ?? new Date();
  const moment = describeDeadline({ kind: deadline.kind, date: deadline.date, time: deadline.time, timezone: deadline.timezone }, options);
  if (moment.state === "open") return undefined;
  const start = monthName(forecast.expectedOpenStart, now);
  const end = forecast.expectedOpenEnd ? monthName(forecast.expectedOpenEnd, now) : start;
  const window = end !== start ? `${start} to ${end}` : start;
  const cycles = forecast.basedOnCycles === 1 ? "1 past cycle" : `${forecast.basedOnCycles} past cycles`;
  return `Expected to reopen around ${window} — predicted from ${cycles}`;
}

/** Whether the facts section has anything to show beyond the main deadline. */
export function hasDeadlineFactsDetail(
  facts: OpportunityDeadlineFacts | undefined,
  deadline: DeadlineFactsDeadline,
  options: DeadlineMomentOptions = {},
): boolean {
  if (!facts) return false;
  return facts.tiers.length > 0 || facts.stages.length > 0 || Boolean(forecastLine(facts.forecast, deadline, options));
}
