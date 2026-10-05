import type { MyStatus } from "@missa/radar-engine";
import { calendarDaysUntil } from "./deadlineLabel.ts";
import {
  estimateStartBy,
  startByLabel,
  type StartBy,
  type StartByItem,
} from "./start-by.ts";
import { lifecycleStep, isBeforeSubmission } from "./application-lifecycle.ts";

/**
 * Creator Home is derived entirely from Tracker state. Every row links into
 * the same application record (`/tracker?application=…`). Home may complete a
 * preparation step or snooze a response check-in through the same APIs the
 * record uses, but it never holds state of its own.
 */
export type HomeApplication = {
  opportunityId: string;
  title: string;
  organizationName: string;
  /** Opportunity type, e.g. "residency"; optional for the legacy tracker. */
  type?: string;
  myStatus: MyStatus;
  deadline: string | null;
  deadlineKind: string;
  submittedAt: string | null;
  updatedAt: string;
  preparationTotal: number;
  preparationDone: number;
  preparationItems: StartByItem[];
};

export type HomeReminder = {
  /** Present for account-backed reminders; lets Home snooze a check-in. */
  id?: string;
  revision?: number;
  opportunityId: string;
  kind: "preparation" | "deadline" | "response";
  dueAt: string | null;
  state: string;
};

export type HomeGoal = {
  id: string;
  title: string;
  target: number;
  progress: number;
  endsOn: string;
  /** Goal start; without it pace cannot be judged and is not shown. */
  startsOn?: string;
};

export type HomeOpening = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  deadline?: string | null;
  reason: string;
  /** The recommendation matched an active goal. */
  goalFit?: boolean;
};

export type HomeSection =
  "overview" | "prepare" | "timing" | "materials" | "history";

/** Semantic tone; each maps to one Missa token family in the component. */
export type HomeTone =
  "warning" | "information" | "primary" | "success" | "neutral";

export type HomeMoveKind =
  | "start-passed"
  | "start-today"
  | "closing"
  | "ready"
  | "check-in"
  | "not-started"
  | "start-soon"
  | "opening";

/**
 * Time left against the work Missa estimates. Dates are ISO calendar days;
 * `behindDays` and `slackDays` are never both above zero.
 */
export type HomeRunway = {
  startBy: string;
  deadline: string;
  daysLeft: number;
  behindDays: number;
  slackDays: number;
  workDays: number;
};

export type HomeMove = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  reason: string;
  actionLabel: string;
  href: string;
  attention: boolean;
  kind: HomeMoveKind;
  /** Short state label for the move's badge, e.g. "Check-in due". */
  badge: string;
  tone: HomeTone;
  type?: string;
  startBy?: StartBy;
  runway?: HomeRunway;
  preparation?: { done: number; total: number };
  /** The response reminder behind a check-in move. */
  reminder?: { id: string; revision: number };
};

export type HomeRow = {
  opportunityId: string;
  title: string;
  organizationName: string;
  detail: string;
  href: string;
  attention: boolean;
  /** Preparation progress, for Preparing rows. */
  progress?: { done: number; total: number };
  /** Plain-language state for the row's right-hand column. */
  status?: { label: string; tone: HomeTone };
};

export type HomeWeekEventKind =
  "overdue" | "start-by" | "closes" | "check-in" | "submitted";

export type HomeWeekEvent = {
  opportunityId: string;
  title: string;
  kind: HomeWeekEventKind;
  label: string;
  detail: string;
  href: string;
  tone: HomeTone;
};

export type HomeWeekDay = {
  /** ISO calendar date. */
  date: string;
  isToday: boolean;
  events: HomeWeekEvent[];
};

export type HomeWeek = {
  days: HomeWeekDay[];
  /** Deadlines 7–30 days out, soonest first. */
  later: Array<HomeWeekEvent & { date: string }>;
};

export type HomeGoalPace = {
  goal: HomeGoal;
  status: "reached" | "on-pace" | "behind" | "unknown";
  /** Submissions an even spread would have reached by today. */
  expectedByNow: number | null;
  /** Calls being prepared that close on or before the goal's end. */
  inReach: number;
  weeksLeft: number;
  /** Where the goal lands if every in-reach call is submitted. */
  reachable: number;
  explanation: string[];
};

export type HomeSituation = "first-run" | "busy" | "waiting" | "quiet";

export type CreatorHome = {
  situation: HomeSituation;
  /** One sentence naming the week, e.g. "A busy week. …". */
  summary: string;
  thisWeek: HomeMove[];
  closingThisWeek: HomeRow[];
  preparing: HomeRow[];
  awaiting: HomeRow[];
  recentDecisions: HomeRow[];
  selectedForYou: HomeOpening[];
  goals: HomeGoal[];
  pace: HomeGoalPace | null;
  week: HomeWeek;
  counts: {
    tracked: number;
    active: number;
    awaiting: number;
    preparing: number;
    decided: number;
  };
};

const DAY = 86_400_000;

export function recordHref(
  opportunityId: string,
  section: HomeSection = "overview",
): string {
  return `/tracker?application=${encodeURIComponent(opportunityId)}${section === "overview" ? "" : `&section=${section}`}`;
}

function shortDate(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function weekday(isoDate: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

/** The server's calendar day, offset by `days`, as an ISO date. */
function isoDay(now: Date, days = 0): string {
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + days),
  )
    .toISOString()
    .slice(0, 10);
}

/** The calendar day an instant falls on, in the same frame as `isoDay`. */
function instantDay(value: string): string {
  const date = new Date(value);
  return isoDay(date);
}

function closesIn(days: number): string {
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  return `Closes in ${days} days`;
}

function prepLabel(application: HomeApplication): string {
  if (!application.preparationTotal) return "No preparation steps yet";
  if (application.preparationDone === application.preparationTotal)
    return "All steps ready";
  return `${application.preparationDone} of ${application.preparationTotal} steps ready`;
}

const NUMBER_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];
const word = (n: number) => NUMBER_WORDS[n] ?? String(n);
const capitalize = (text: string) =>
  text.replace(/^./u, (c) => c.toUpperCase());

function joinClauses(clauses: string[]): string {
  if (clauses.length <= 1) return clauses[0] ?? "";
  if (clauses.length === 2) return `${clauses[0]} and ${clauses[1]}`;
  return `${clauses.slice(0, -1).join(", ")}, and ${clauses.at(-1)}`;
}

const DECISION_LABELS: Partial<Record<MyStatus, string>> = {
  accepted: "Accepted",
  declined: "Not selected",
  withdrawn: "Withdrawn",
  "partially-withdrawn": "Partly withdrawn",
  delivered: "Delivered",
};

/** "Good morning" in the creator's own timezone; "Hello" when unknown. */
export function greetingFor(now: Date, timeZone?: string): string {
  if (!timeZone) return "Hello";
  let hour: number;
  try {
    hour = Number(
      new Intl.DateTimeFormat("en", {
        hour: "numeric",
        hourCycle: "h23",
        timeZone,
      }).format(now),
    );
  } catch {
    return "Hello";
  }
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

function goalPace(
  goal: HomeGoal,
  applications: ReadonlyArray<HomeApplication>,
  now: Date,
): HomeGoalPace {
  const today = isoDay(now);
  const remaining = Math.max(0, goal.target - goal.progress);
  const daysLeft = Math.max(
    0,
    calendarDaysUntil(goal.endsOn.slice(0, 10), now) ?? 0,
  );
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
  const inReach = applications.filter(
    (application) =>
      isBeforeSubmission(application.myStatus) &&
      application.deadline &&
      application.deadlineKind !== "rolling" &&
      application.deadline.slice(0, 10) >= today &&
      application.deadline.slice(0, 10) <= goal.endsOn.slice(0, 10),
  ).length;
  const reachable = Math.min(goal.target, goal.progress + inReach);
  const end = shortDate(goal.endsOn.slice(0, 10));

  if (remaining === 0)
    return {
      goal,
      status: "reached",
      expectedByNow: null,
      inReach,
      weeksLeft,
      reachable: goal.target,
      explanation: [`You reached ${goal.target} of ${goal.target}.`],
    };

  let expectedByNow: number | null = null;
  if (goal.startsOn) {
    const start = goal.startsOn.slice(0, 10);
    const total = Math.max(
      1,
      Math.round(
        (Date.parse(`${goal.endsOn.slice(0, 10)}T00:00:00Z`) -
          Date.parse(`${start}T00:00:00Z`)) /
          DAY,
      ),
    );
    const elapsed = Math.min(
      total,
      Math.max(0, -(calendarDaysUntil(start, now) ?? 0)),
    );
    expectedByNow = Math.floor((goal.target * elapsed) / total);
  }

  const explanation = [
    `${remaining} to go in ${weeksLeft} ${weeksLeft === 1 ? "week" : "weeks"}, by ${end}.`,
  ];
  if (expectedByNow !== null)
    explanation.unshift(
      `Spread evenly, about ${expectedByNow} of ${goal.target} would be submitted by now. You have ${goal.progress}.`,
    );
  if (inReach)
    explanation.push(
      `${capitalize(word(inReach))} ${inReach === 1 ? "call" : "calls"} you are preparing ${inReach === 1 ? "closes" : "close"} before ${end}.`,
    );
  explanation.push("Preparing never counts as submitted.");

  return {
    goal,
    status:
      expectedByNow === null
        ? "unknown"
        : goal.progress >= expectedByNow
          ? "on-pace"
          : "behind",
    expectedByNow,
    inReach,
    weeksLeft,
    reachable,
    explanation,
  };
}

export function buildCreatorHome({
  applications,
  reminders,
  goals,
  openings = [],
  now = new Date(),
}: {
  applications: ReadonlyArray<HomeApplication>;
  reminders: ReadonlyArray<HomeReminder>;
  goals: ReadonlyArray<HomeGoal>;
  openings?: ReadonlyArray<HomeOpening>;
  now?: Date;
}): CreatorHome {
  const today = isoDay(now);
  const daysLeft = (application: HomeApplication) =>
    application.deadline && application.deadlineKind !== "rolling"
      ? calendarDaysUntil(application.deadline.slice(0, 10), now)
      : null;
  const activeResponse = reminders.filter(
    (reminder) =>
      reminder.kind === "response" &&
      ["scheduled", "delivered"].includes(reminder.state) &&
      reminder.dueAt,
  );
  const responseDue = new Map(
    activeResponse
      .filter((reminder) => Date.parse(reminder.dueAt!) <= now.getTime())
      .map((reminder) => [reminder.opportunityId, reminder]),
  );

  const candidates: Array<HomeMove & { score: number }> = [];
  const closingThisWeek: Array<HomeRow & { days: number }> = [];
  const preparing: HomeRow[] = [];
  const awaiting: HomeRow[] = [];
  const recentDecisions: HomeRow[] = [];
  const weekEvents = new Map<string, HomeWeekEvent[]>();
  const later: Array<HomeWeekEvent & { date: string; days: number }> = [];
  const pushEvent = (date: string, event: HomeWeekEvent) =>
    weekEvents.set(date, [...(weekEvents.get(date) ?? []), event]);
  let startsPassed = 0;
  let startsThisWeek: string[] = [];

  for (const application of applications) {
    const step = lifecycleStep(application.myStatus);
    const days = daysLeft(application);
    const before = isBeforeSubmission(application.myStatus);
    const base = {
      opportunityId: application.opportunityId,
      title: application.title,
      organizationName: application.organizationName,
    };
    const preparation = application.preparationTotal
      ? {
          done: application.preparationDone,
          total: application.preparationTotal,
        }
      : undefined;
    const startBy =
      before && step !== "ready"
        ? estimateStartBy({
            deadline: application.deadline,
            deadlineKind: application.deadlineKind,
            items: application.preparationItems,
            now,
          })
        : null;
    const runway: HomeRunway | undefined =
      startBy && application.deadline && days !== null && days >= 0
        ? {
            startBy: startBy.date,
            deadline: application.deadline.slice(0, 10),
            daysLeft: days,
            behindDays: Math.max(0, -startBy.daysUntil),
            slackDays: Math.max(0, startBy.daysUntil),
            workDays: startBy.daysNeeded,
          }
        : undefined;

    if (before && days !== null && days >= 0) {
      const deadline = application.deadline!.slice(0, 10);
      if (days <= 7)
        closingThisWeek.push({
          ...base,
          days,
          detail: `${closesIn(days)} · ${prepLabel(application)}`,
          href: recordHref(application.opportunityId, "prepare"),
          attention: days <= 2,
        });
      if (days <= 6)
        pushEvent(deadline, {
          ...base,
          kind: "closes",
          label: days === 0 ? "Closes today" : "Closes",
          detail: prepLabel(application),
          href: recordHref(application.opportunityId, "prepare"),
          tone: "warning",
        });
      else if (days <= 30)
        later.push({
          ...base,
          date: deadline,
          days,
          kind: "closes",
          label: `Closes ${shortDate(deadline)}`,
          detail: application.organizationName || prepLabel(application),
          href: recordHref(application.opportunityId),
          tone: "warning",
        });

      if (startBy?.status === "passed") {
        startsPassed += 1;
        pushEvent(today, {
          ...base,
          kind: "overdue",
          label: "Overdue",
          detail: `${startByLabel(startBy)} · closes ${shortDate(deadline)}`,
          href: recordHref(application.opportunityId, "prepare"),
          tone: "warning",
        });
      } else if (startBy && startBy.daysUntil <= 6) {
        if (startBy.daysUntil > 0)
          startsThisWeek = [...startsThisWeek, startBy.date];
        pushEvent(startBy.date, {
          ...base,
          kind: "start-by",
          label: startBy.status === "today" ? "Start today" : "Start by",
          detail: `About ${startBy.daysNeeded} days of work · closes ${shortDate(deadline)}`,
          href: recordHref(application.opportunityId, "prepare"),
          tone: "primary",
        });
      }

      const shared = {
        ...base,
        type: application.type,
        preparation,
        runway,
        startBy: startBy ?? undefined,
      };
      if (step === "ready") {
        candidates.push({
          ...shared,
          score: 85 - days / 10,
          kind: "ready",
          badge: "Ready to record",
          tone: "primary",
          attention: days <= 2,
          reason: `Ready · ${closesIn(days).toLowerCase()}`,
          actionLabel: "Record submission",
          href: recordHref(application.opportunityId),
        });
      } else if (startBy && startBy.status !== "ahead") {
        candidates.push({
          ...shared,
          score: 100 - days / 10,
          kind: startBy.status === "passed" ? "start-passed" : "start-today",
          badge: startByLabel(startBy),
          tone: "warning",
          attention: true,
          reason: `${startByLabel(startBy)} · ${closesIn(days).toLowerCase()}`,
          actionLabel:
            step === "saved" ? "Start preparing" : "Continue preparing",
          href: recordHref(application.opportunityId, "prepare"),
        });
      } else if (days <= 7) {
        candidates.push({
          ...shared,
          score: 90 - days,
          kind: "closing",
          badge: closesIn(days),
          tone: "warning",
          attention: days <= 2,
          reason: `Closing this week · ${prepLabel(application).toLowerCase()}`,
          actionLabel: "Continue preparing",
          href: recordHref(application.opportunityId, "prepare"),
        });
      } else if (step === "saved" && days <= 21) {
        candidates.push({
          ...shared,
          score: 60 - days / 3,
          kind: "not-started",
          badge: "Not started",
          tone: "neutral",
          attention: false,
          reason: `${closesIn(days)} · not started`,
          actionLabel: "Start preparing",
          href: recordHref(application.opportunityId),
        });
      } else if (startBy) {
        candidates.push({
          ...shared,
          score: 30 - startBy.daysUntil / 3,
          kind: "start-soon",
          badge: startByLabel(startBy),
          tone: "primary",
          attention: false,
          reason: `${startByLabel(startBy)} · closes ${shortDate(application.deadline!)}`,
          actionLabel:
            step === "saved" ? "Start preparing" : "Continue preparing",
          href: recordHref(application.opportunityId, "prepare"),
        });
      }
    }

    if (step === "preparing" || step === "ready") {
      const status: HomeRow["status"] =
        step === "ready"
          ? { label: "Ready to record", tone: "primary" }
          : !application.deadline || application.deadlineKind === "rolling"
            ? { label: "No deadline recorded", tone: "neutral" }
            : !application.preparationTotal
              ? { label: "Add preparation steps", tone: "neutral" }
              : startBy?.status === "passed"
                ? {
                    label: `${-startBy.daysUntil} ${startBy.daysUntil === -1 ? "day" : "days"} behind`,
                    tone: "warning",
                  }
                : startBy?.status === "today"
                  ? { label: "Start today", tone: "warning" }
                  : { label: "On track", tone: "success" };
      preparing.push({
        ...base,
        detail:
          application.deadline && days !== null && days >= 0
            ? `Closes ${shortDate(application.deadline)}`
            : prepLabel(application),
        href: recordHref(application.opportunityId, "prepare"),
        attention: false,
        progress: preparation,
        status,
      });
    }

    if (step === "submitted" || step === "in-review") {
      const due = responseDue.get(application.opportunityId);
      awaiting.push({
        ...base,
        detail: `${application.submittedAt ? `Submitted ${shortDate(application.submittedAt)}` : "Submission date not recorded"}${due ? " · No response yet" : ""}`,
        href: recordHref(application.opportunityId),
        attention: Boolean(due),
        status: due
          ? { label: "Check-in due", tone: "information" }
          : {
              label: step === "in-review" ? "In review" : "Submitted",
              tone: "neutral",
            },
      });
      if (
        application.submittedAt &&
        instantDay(application.submittedAt) === today
      )
        pushEvent(today, {
          ...base,
          kind: "submitted",
          label: "Submitted",
          detail: "Recorded today",
          href: recordHref(application.opportunityId),
          tone: "neutral",
        });
      const upcoming = activeResponse.find(
        (reminder) => reminder.opportunityId === application.opportunityId,
      );
      if (upcoming) {
        const offset = calendarDaysUntil(instantDay(upcoming.dueAt!), now) ?? 0;
        if (offset <= 6)
          pushEvent(offset <= 0 ? today : instantDay(upcoming.dueAt!), {
            ...base,
            kind: "check-in",
            label: "Check in",
            detail: application.submittedAt
              ? `Submitted ${shortDate(application.submittedAt)} · no response recorded`
              : "No response recorded",
            href: recordHref(application.opportunityId),
            tone: "information",
          });
      }
      if (due)
        candidates.push({
          ...base,
          type: application.type,
          score: 70,
          kind: "check-in",
          badge: "Check-in due",
          tone: "information",
          attention: false,
          reason: "No response yet · your check-in is due",
          actionLabel: "Record a response",
          href: recordHref(application.opportunityId),
          reminder:
            due.id && due.revision
              ? { id: due.id, revision: due.revision }
              : undefined,
        });
    }

    if (
      step === "outcome" &&
      now.getTime() - Date.parse(application.updatedAt) <= 30 * DAY
    )
      recentDecisions.push({
        ...base,
        detail: `${DECISION_LABELS[application.myStatus] ?? "Outcome recorded"} · ${shortDate(application.updatedAt)}`,
        href: recordHref(application.opportunityId, "history"),
        attention: false,
        status: {
          label: DECISION_LABELS[application.myStatus] ?? "Outcome recorded",
          tone: application.myStatus === "accepted" ? "success" : "neutral",
        },
      });
  }

  for (const opening of openings)
    candidates.push({
      opportunityId: opening.opportunityId,
      title: opening.title,
      organizationName: opening.organizationName,
      score: 40,
      kind: "opening",
      badge: "Selected for you",
      tone: "information",
      attention: false,
      reason: `Selected for you · ${opening.reason}`,
      actionLabel: "Review opportunity",
      href: `/opportunities/${encodeURIComponent(opening.opportunityId)}`,
    });

  const seen = new Set<string>();
  const thisWeek = candidates
    .sort((a, b) => b.score - a.score)
    .filter((move) =>
      seen.has(move.opportunityId)
        ? false
        : (seen.add(move.opportunityId), true),
    )
    .slice(0, 3)
    .map(({ score: _score, ...move }) => move);

  const eventOrder: HomeWeekEventKind[] = [
    "overdue",
    "closes",
    "check-in",
    "start-by",
    "submitted",
  ];
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = isoDay(now, offset);
    return {
      date,
      isToday: offset === 0,
      events: (weekEvents.get(date) ?? []).sort(
        (a, b) => eventOrder.indexOf(a.kind) - eventOrder.indexOf(b.kind),
      ),
    };
  });

  const counts = {
    tracked: applications.length,
    active: applications.filter(
      (application) =>
        lifecycleStep(application.myStatus) !== "archived" &&
        lifecycleStep(application.myStatus) !== "outcome",
    ).length,
    awaiting: awaiting.length,
    preparing: preparing.length,
    decided: recentDecisions.length,
  };
  const activeGoals = [...goals].sort((a, b) =>
    a.endsOn.localeCompare(b.endsOn),
  );
  const pace = activeGoals.length
    ? goalPace(
        activeGoals.find((goal) => goal.progress < goal.target) ??
          activeGoals[0],
        applications,
        now,
      )
    : null;

  const ready = thisWeek.filter((move) => move.kind === "ready").length;
  const checkIns = responseDue.size;
  const closing = closingThisWeek.length;
  const busy =
    startsPassed + ready + closing > 0 ||
    days.reduce(
      (total, day) =>
        total + day.events.filter((event) => event.kind !== "submitted").length,
      0,
    ) >= 3;
  const situation: HomeSituation =
    counts.tracked === 0
      ? "first-run"
      : busy
        ? "busy"
        : counts.awaiting
          ? "waiting"
          : "quiet";

  let summary = "";
  if (situation === "busy") {
    const clauses: string[] = [];
    if (startsPassed)
      clauses.push(
        startsPassed === 1
          ? "one start-by date has passed"
          : `${word(startsPassed)} start-by dates have passed`,
      );
    if (closing)
      clauses.push(
        closing === 1
          ? "one call closes this week"
          : `${word(closing)} calls close this week`,
      );
    if (ready)
      clauses.push(
        ready === 1
          ? "one is ready to record"
          : `${word(ready)} are ready to record`,
      );
    if (checkIns)
      clauses.push(
        checkIns === 1
          ? "one check-in is due"
          : `${word(checkIns)} check-ins are due`,
      );
    if (startsThisWeek.length)
      clauses.push(
        startsThisWeek.length === 1
          ? `one call needs starting by ${weekday(startsThisWeek[0])}`
          : `${word(startsThisWeek.length)} calls need starting this week`,
      );
    summary = `A busy week. ${capitalize(joinClauses(clauses))}.`;
  } else if (situation === "waiting") {
    summary = `A waiting week. ${capitalize(word(counts.awaiting))} ${counts.awaiting === 1 ? "submission is" : "submissions are"} out and nothing closes in the next seven days.${checkIns ? ` ${capitalize(word(checkIns))} ${checkIns === 1 ? "check-in is" : "check-ins are"} due.` : ""}`;
  } else if (situation === "quiet") {
    summary = `A quiet week. Nothing is due and nothing is waiting on you.${pace?.status === "reached" ? ` You reached your goal of ${pace.goal.target}.` : ""}`;
  }

  return {
    situation,
    summary,
    thisWeek,
    closingThisWeek: closingThisWeek
      .sort((a, b) => a.days - b.days)
      .map(({ days: _days, ...row }) => row),
    preparing,
    awaiting: awaiting.sort(
      (a, b) => Number(b.attention) - Number(a.attention),
    ),
    recentDecisions,
    // An opening already shown as one of this week's moves is not repeated.
    selectedForYou: openings
      .filter(
        (opening) =>
          !thisWeek.some(
            (move) => move.opportunityId === opening.opportunityId,
          ),
      )
      .sort((a, b) => Number(Boolean(b.goalFit)) - Number(Boolean(a.goalFit)))
      .slice(0, 4),
    goals: [...goals],
    pace,
    week: {
      days,
      later: later
        .sort((a, b) => a.days - b.days)
        .slice(0, 4)
        .map(({ days: _days, ...event }) => event),
    },
    counts,
  };
}
