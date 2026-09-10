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
  kind: "personal" | "tracker" | "reminder" | "goal";
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
};
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
});
export function calendarSourceEvents(
  items: CreatorCalendarItem[],
  reminders: ApplicationReminder[] = [],
  goals: GoalDate[] = [],
): PlanningEvent[] {
  const result: PlanningEvent[] = [];
  for (const item of items) {
    const href = `/tracker?application=${encodeURIComponent(item.opportunityId)}`;
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
