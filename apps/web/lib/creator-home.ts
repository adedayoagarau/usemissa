import type { MyStatus } from "@missa/radar-engine";
import { calendarDaysUntil } from "./deadlineLabel.ts";
import { estimateStartBy, startByLabel, type StartByItem } from "./start-by.ts";
import { lifecycleStep, isBeforeSubmission } from "./application-lifecycle.ts";

/**
 * Creator Home is derived entirely from Tracker state. Every row links into
 * the same application record (`/tracker?application=…`), so Home never
 * becomes a second place where work is done.
 */
export type HomeApplication = {
  opportunityId: string;
  title: string;
  organizationName: string;
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
};

export type HomeOpening = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  deadline?: string | null;
  reason: string;
};

export type HomeSection =
  "overview" | "prepare" | "timing" | "materials" | "history";

export type HomeMove = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  reason: string;
  actionLabel: string;
  href: string;
  attention: boolean;
};

export type HomeRow = {
  opportunityId: string;
  title: string;
  organizationName: string;
  detail: string;
  href: string;
  attention: boolean;
};

export type CreatorHome = {
  thisWeek: HomeMove[];
  closingThisWeek: HomeRow[];
  preparing: HomeRow[];
  awaiting: HomeRow[];
  recentDecisions: HomeRow[];
  selectedForYou: HomeOpening[];
  goals: HomeGoal[];
  counts: { tracked: number; active: number; awaiting: number };
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

const DECISION_LABELS: Partial<Record<MyStatus, string>> = {
  accepted: "Accepted",
  declined: "Not selected",
  withdrawn: "Withdrawn",
  "partially-withdrawn": "Partly withdrawn",
  delivered: "Delivered",
};

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
  const daysLeft = (application: HomeApplication) =>
    application.deadline && application.deadlineKind !== "rolling"
      ? calendarDaysUntil(application.deadline.slice(0, 10), now)
      : null;
  const responseDue = new Set(
    reminders
      .filter(
        (reminder) =>
          reminder.kind === "response" &&
          ["scheduled", "delivered"].includes(reminder.state) &&
          reminder.dueAt &&
          Date.parse(reminder.dueAt) <= now.getTime(),
      )
      .map((reminder) => reminder.opportunityId),
  );

  const candidates: Array<HomeMove & { score: number }> = [];
  const closingThisWeek: Array<HomeRow & { days: number }> = [];
  const preparing: HomeRow[] = [];
  const awaiting: HomeRow[] = [];
  const recentDecisions: HomeRow[] = [];

  for (const application of applications) {
    const step = lifecycleStep(application.myStatus);
    const days = daysLeft(application);
    const before = isBeforeSubmission(application.myStatus);
    const base = {
      opportunityId: application.opportunityId,
      title: application.title,
      organizationName: application.organizationName,
    };

    if (before && days !== null && days >= 0) {
      const startBy =
        step === "ready"
          ? null
          : estimateStartBy({
              deadline: application.deadline,
              deadlineKind: application.deadlineKind,
              items: application.preparationItems,
              now,
            });
      if (days <= 7)
        closingThisWeek.push({
          ...base,
          days,
          detail: `${closesIn(days)} · ${prepLabel(application)}`,
          href: recordHref(application.opportunityId, "prepare"),
          attention: days <= 2,
        });

      if (step === "ready") {
        candidates.push({
          ...base,
          score: 85 - days / 10,
          attention: days <= 2,
          reason: `Ready · ${closesIn(days).toLowerCase()}`,
          actionLabel: "Record submission",
          href: recordHref(application.opportunityId),
        });
      } else if (startBy && startBy.status !== "ahead") {
        candidates.push({
          ...base,
          score: 100 - days / 10,
          attention: true,
          reason: `${startByLabel(startBy)} · ${closesIn(days).toLowerCase()}`,
          actionLabel:
            step === "saved" ? "Start preparing" : "Continue preparing",
          href: recordHref(application.opportunityId, "prepare"),
        });
      } else if (days <= 7) {
        candidates.push({
          ...base,
          score: 90 - days,
          attention: days <= 2,
          reason: `Closing this week · ${prepLabel(application).toLowerCase()}`,
          actionLabel: "Continue preparing",
          href: recordHref(application.opportunityId, "prepare"),
        });
      } else if (step === "saved" && days <= 21) {
        candidates.push({
          ...base,
          score: 60 - days / 3,
          attention: false,
          reason: `${closesIn(days)} · not started`,
          actionLabel: "Start preparing",
          href: recordHref(application.opportunityId),
        });
      } else if (startBy) {
        candidates.push({
          ...base,
          score: 30 - startBy.daysUntil / 3,
          attention: false,
          reason: `${startByLabel(startBy)} · closes ${shortDate(application.deadline!)}`,
          actionLabel:
            step === "saved" ? "Start preparing" : "Continue preparing",
          href: recordHref(application.opportunityId, "prepare"),
        });
      }
    }

    if (step === "preparing" || step === "ready")
      preparing.push({
        ...base,
        detail: prepLabel(application),
        href: recordHref(application.opportunityId, "prepare"),
        attention: false,
      });

    if (step === "submitted" || step === "in-review") {
      const overdue = responseDue.has(application.opportunityId);
      awaiting.push({
        ...base,
        detail: `${application.submittedAt ? `Submitted ${shortDate(application.submittedAt)}` : "Submission date not recorded"}${overdue ? " · No response yet" : ""}`,
        href: recordHref(application.opportunityId),
        attention: overdue,
      });
      if (overdue)
        candidates.push({
          ...base,
          score: 70,
          attention: false,
          reason: "No response yet · your check-in is due",
          actionLabel: "Record a response",
          href: recordHref(application.opportunityId),
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
      });
  }

  for (const opening of openings)
    candidates.push({
      opportunityId: opening.opportunityId,
      title: opening.title,
      organizationName: opening.organizationName,
      score: 40,
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

  return {
    thisWeek,
    closingThisWeek: closingThisWeek
      .sort((a, b) => a.days - b.days)
      .map(({ days: _days, ...row }) => row),
    preparing,
    awaiting: awaiting.sort(
      (a, b) => Number(b.attention) - Number(a.attention),
    ),
    recentDecisions,
    selectedForYou: openings.slice(0, 4),
    goals: [...goals],
    counts: {
      tracked: applications.length,
      active: applications.filter(
        (application) =>
          lifecycleStep(application.myStatus) !== "archived" &&
          lifecycleStep(application.myStatus) !== "outcome",
      ).length,
      awaiting: awaiting.length,
    },
  };
}
