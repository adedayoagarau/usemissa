import type { CreatorCalendarItem } from "@missa/radar-adapters";
import type { ApplicationReminder } from "./creator-reminders.ts";

export type PlanningEvent = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string;
  revision: number;
  kind: PlanningEventKind;
  opportunityId?: string | null;
  sourceId?: string;
  sourceRevision?: number;
  purpose?: string;
  sourceLabel?: string;
  actionHref?: string;
  syncStatus?: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  syncError?: string;
  syncNextAttemptAt?: string;
  previousDeadline?: string;
  deadlineChangedAt?: string;
  deadlineReconciliationStatus?: "current" | "needs-review" | "dismissed";
  deadlineTime?: string;
  deadlineTimezone?: string;
  /** Whether the date is the organization's, predicted, changed or unconfirmed. */
  confidence?: PlanningDateConfidence;
  /** When Missa last checked the official source for this date. */
  lastCheckedAt?: string;
};

export type PlanningEventKind =
  | "personal"
  | "tracker"
  | "reminder"
  | "goal"
  | "stage"
  | "tier"
  | "obligation"
  | "forecast";

export type PlanningDateConfidence =
  | "confirmed"
  | "predicted"
  | "changed"
  | "needs-checking";

export function canSetDeadlineReminder(event: PlanningEvent): boolean {
  return (
    event.kind === "tracker" &&
    ["application-deadline", "official-deadline"].includes(event.purpose ?? "")
  );
}
type GoalDate = {
  id: string;
  title: string;
  ends_on: string;
  revision: number;
  state: string;
  progress: number;
  target: number;
};
const preparing = new Set([
  "interested",
  "saved",
  "preparing",
  "draft-started",
  "ready-to-submit",
]);
const awaiting = new Set([
  "submitted",
  "received",
  "in-review",
  "longlisted",
  "finalist",
  "waitlisted",
  "revision-requested",
  "partially-withdrawn",
  "shortlisted",
]);
const day = (
  id: string,
  title: string,
  date: string,
  kind: PlanningEvent["kind"],
  sourceLabel: string,
  actionHref: string,
  sourceId?: string,
  sourceRevision?: number,
  opportunityId?: string,
  details?: Pick<
    PlanningEvent,
    "purpose" | "deadlineTime" | "deadlineTimezone"
  >,
): PlanningEvent => ({
  id,
  title,
  startAt: `${date.slice(0, 10)}T00:00:00`,
  endAt: `${date.slice(0, 10)}T23:59:59.999`,
  allDay: true,
  color: kind === "goal" ? "forest" : "ochre",
  revision: 1,
  kind,
  sourceLabel,
  actionHref,
  sourceId,
  sourceRevision,
  opportunityId,
  ...details,
});
export function calendarSourceEvents(
  items: CreatorCalendarItem[],
  reminders: ApplicationReminder[] = [],
  goals: GoalDate[] = [],
): PlanningEvent[] {
  const result: PlanningEvent[] = [];
  const todayIso = new Date().toISOString().slice(0, 10);
  for (const item of items) {
    const href = `/tracker?application=${encodeURIComponent(item.opportunityId)}`;

    // 1. Opening date event for scheduled/upcoming opportunities
    if (
      item.openDate &&
      (item.oppStatus === "opening-soon" || item.openDate >= todayIso) &&
      preparing.has(item.myStatus)
    ) {
      result.push(
        day(
          `opens:${item.opportunityId}`,
          `Opens: ${item.title}`,
          item.openDate,
          "tracker",
          "Submissions opening date",
          href,
          undefined,
          undefined,
          item.opportunityId,
          { purpose: "application-open" },
        ),
      );
    }

    // 2. Closing deadline event
    if (item.deadline && preparing.has(item.myStatus))
      result.push(
        day(
          `deadline:${item.opportunityId}`,
          item.title,
          item.deadline,
          "tracker",
          ["exact", "fixed"].includes(item.deadlineKind ?? "")
            ? "Application deadline"
            : "Deadline needs checking",
          href,
          undefined,
          undefined,
          item.opportunityId,
          {
            purpose: "application-deadline",
            deadlineTime: item.deadlineTime,
            deadlineTimezone: item.deadlineTimezone,
          },
        ),
      );
    if (item.expectedResponseBy && awaiting.has(item.myStatus))
      result.push(
        day(
          `response:${item.opportunityId}`,
          `Response check-in · ${item.title}`,
          item.expectedResponseBy,
          "tracker",
          "Estimated date · not a promised reply",
          href,
          undefined,
          undefined,
          item.opportunityId,
          { purpose: "response-check-in" },
        ),
      );
  }
  for (const r of reminders) {
    if (r.state !== "scheduled" || !r.dueAt) continue;
    const startAt = new Date(r.dueAt).toISOString();
    result.push({
      id: `reminder:${r.id}`,
      title: r.title,
      startAt,
      endAt: startAt,
      allDay: false,
      color: "sage",
      revision: r.revision,
      kind: "reminder",
      sourceLabel: `${r.kind === "response" ? "Response check-in" : r.kind === "deadline" ? "Deadline reminder" : "Preparation reminder"} · ${r.inAppEnabled ? "In-app reminders enabled" : "Notifications off"}`,
      actionHref: `/inbox?reminder=${encodeURIComponent(r.id)}`,
    });
  }
  for (const g of goals)
    if (g.state === "active" && g.progress < g.target)
      result.push(
        day(
          `goal:${g.id}`,
          g.title,
          g.ends_on,
          "goal",
          "Your goal date",
          `/goals?goal=${encodeURIComponent(g.id)}`,
          g.id,
          g.revision,
        ),
      );
  return result;
}
export type CalendarView = "month" | "week" | "day" | "agenda";

/** The initial Calendar view from `?view=`; month when absent or unknown. */
export function parseCalendarView(
  value: string | null | undefined,
): CalendarView {
  return value === "week" || value === "day" || value === "agenda"
    ? value
    : "month";
}

export type CalendarFilter =
  | "deadline"
  | "stage"
  | "preparation"
  | "obligation"
  | "predicted"
  | "goal"
  | "reminder"
  | "personal";

/** Which legend toggle shows or hides an event. Fee tier closes count as deadlines. */
export function calendarFilterFor(event: PlanningEvent): CalendarFilter {
  switch (event.kind) {
    case "tracker":
    case "tier":
      return "deadline";
    case "stage":
      return "stage";
    case "obligation":
      return "obligation";
    case "forecast":
      return "predicted";
    case "goal":
      return "goal";
    case "reminder":
      return "reminder";
    default:
      return event.purpose === "preparation" ? "preparation" : "personal";
  }
}

const OFFICIAL_DEADLINE_PURPOSES = new Set([
  "application-deadline",
  "official-deadline",
]);

/**
 * Week and Day views show official dates in an all-day "Deadlines" lane
 * above the day's own time: the deadline itself, fee tier closes and stages.
 */
export function isDeadlineLaneEvent(event: PlanningEvent): boolean {
  if (!event.allDay) return false;
  if (event.kind === "tier" || event.kind === "stage") return true;
  return (
    event.kind === "tracker" &&
    OFFICIAL_DEADLINE_PURPOSES.has(event.purpose ?? "")
  );
}

export type CalendarStageInput = {
  opportunityId: string;
  title: string;
  stage: {
    id: string;
    kind: string;
    label: string;
    dueOn: string;
    confidence: "confirmed" | "probable";
  };
};

export type CalendarTierInput = {
  opportunityId: string;
  title: string;
  /** The call's official deadline; a tier closing that day is the deadline itself. */
  deadline?: string;
  tier: {
    id: string;
    tier: string;
    label: string;
    closesOn: string;
    closesAt?: string;
    timezone?: string;
    feeCents?: number;
    feeCurrency?: string;
    confidence: "confirmed" | "probable";
  };
};

export type CalendarObligationInput = {
  id: string;
  opportunityId: string | null;
  opportunityTitle: string | null;
  kind: "start-by" | "sub-deadline" | "personal-target" | "obligation";
  label: string;
  dueOn: string;
  state: "open" | "done" | "skipped";
  revision: number;
};

export type CalendarForecastInput = {
  opportunityId: string;
  title: string;
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

export type CalendarDeadlineFacts = {
  stages?: CalendarStageInput[];
  tiers?: CalendarTierInput[];
  obligations?: CalendarObligationInput[];
  forecasts?: CalendarForecastInput[];
};

const OBLIGATION_LABELS: Record<CalendarObligationInput["kind"], string> = {
  "start-by": "Start by",
  "sub-deadline": "Step due",
  "personal-target": "Your target date",
  obligation: "After acceptance",
};

/** An amount for compact calendar labels, e.g. "$15". */
export function calendarFee(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

const trackerHref = (opportunityId: string) =>
  `/tracker?application=${encodeURIComponent(opportunityId)}`;

/**
 * Calendar events for the deadline facts around the creator's calls: stages,
 * fee tier closes, open steps from their plan, and predicted next cycles.
 * Predictions only appear while no current deadline is published, and are
 * always labelled as predictions.
 */
export function calendarDeadlineFactEvents(
  facts: CalendarDeadlineFacts,
  today = new Date().toISOString().slice(0, 10),
): PlanningEvent[] {
  const result: PlanningEvent[] = [];
  for (const { opportunityId, title, stage } of facts.stages ?? []) {
    const event = day(
      `stage:${stage.id}`,
      `${stage.label} · ${title}`,
      stage.dueOn,
      "stage",
      stage.confidence === "confirmed" ? "Stage date" : "Stage date · likely",
      trackerHref(opportunityId),
      stage.id,
      undefined,
      opportunityId,
      { purpose: "stage" },
    );
    result.push({
      ...event,
      color: "mineral",
      confidence:
        stage.confidence === "confirmed" ? "confirmed" : "needs-checking",
    });
  }
  for (const { opportunityId, title, deadline, tier } of facts.tiers ?? []) {
    if (deadline && tier.closesOn.slice(0, 10) === deadline.slice(0, 10))
      continue;
    const fee =
      tier.feeCents === undefined
        ? ""
        : tier.feeCents === 0
          ? " · No fee"
          : ` · ${calendarFee(tier.feeCents, tier.feeCurrency)} fee`;
    const event = day(
      `tier:${tier.id}`,
      `${tier.label} closes · ${title}`,
      tier.closesOn,
      "tier",
      `Fee tier closes${fee}`,
      trackerHref(opportunityId),
      tier.id,
      undefined,
      opportunityId,
      {
        purpose: "tier-close",
        deadlineTime: tier.closesAt,
        deadlineTimezone: tier.timezone,
      },
    );
    result.push({
      ...event,
      confidence:
        tier.confidence === "confirmed" ? "confirmed" : "needs-checking",
    });
  }
  for (const obligation of facts.obligations ?? []) {
    if (obligation.state !== "open") continue;
    const event = day(
      `obligation:${obligation.id}`,
      obligation.opportunityTitle
        ? `${obligation.label} · ${obligation.opportunityTitle}`
        : obligation.label,
      obligation.dueOn,
      "obligation",
      OBLIGATION_LABELS[obligation.kind],
      obligation.opportunityId
        ? trackerHref(obligation.opportunityId)
        : "/tracker",
      obligation.id,
      obligation.revision,
      obligation.opportunityId ?? undefined,
      { purpose: `obligation-${obligation.kind}` },
    );
    result.push({ ...event, color: "plum" });
  }
  for (const item of facts.forecasts ?? []) {
    if (item.deadline && item.deadline.slice(0, 10) >= today) continue;
    const href =
      item.relation === "tracked"
        ? trackerHref(item.opportunityId)
        : `/opportunities/${encodeURIComponent(item.opportunityId)}`;
    const basis = `Predicted from ${item.forecast.basedOnCycles} past cycles`;
    const openStart = item.forecast.expectedOpenStart;
    const openEnd =
      item.forecast.expectedOpenEnd && openStart &&
      item.forecast.expectedOpenEnd >= openStart
        ? item.forecast.expectedOpenEnd
        : openStart;
    if (openStart && openEnd && openEnd >= today) {
      result.push({
        ...day(
          `forecast-open:${item.opportunityId}`,
          `Predicted opening · ${item.title}`,
          openStart,
          "forecast",
          basis,
          href,
          undefined,
          undefined,
          item.opportunityId,
          { purpose: "forecast-open" },
        ),
        endAt: `${openEnd}T23:59:59.999`,
        color: "predicted",
        confidence: "predicted",
      });
    }
    const close = item.forecast.expectedClose;
    if (close && close >= today)
      result.push({
        ...day(
          `forecast-close:${item.opportunityId}`,
          `Predicted deadline · ${item.title}`,
          close,
          "forecast",
          basis,
          href,
          undefined,
          undefined,
          item.opportunityId,
          { purpose: "forecast-close" },
        ),
        color: "predicted",
        confidence: "predicted",
      });
  }
  return result;
}

export function calendarEventsOnDay(events: PlanningEvent[], date: string) {
  const start = new Date(`${date}T00:00:00`),
    end = new Date(start);
  end.setDate(end.getDate() + 1);
  return events.filter(
    (e) =>
      new Date(e.startAt) < end &&
      (new Date(e.endAt) > start ||
        (e.startAt === e.endAt && new Date(e.startAt) >= start)),
  );
}
export function calendarConflicts(
  events: PlanningEvent[],
  candidate: Partial<PlanningEvent>,
) {
  if (!candidate.startAt || !candidate.endAt) return [];
  const startDate = new Date(candidate.startAt),
    endDate = new Date(candidate.endAt);
  if (candidate.allDay) {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(24, 0, 0, 0);
  }
  const start = startDate.getTime(),
    end = endDate.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return [];
  return events.filter(
    (e) =>
      e.kind === "personal" &&
      e.id !== candidate.id &&
      new Date(e.startAt).getTime() < end &&
      new Date(e.endAt).getTime() > start,
  );
}
