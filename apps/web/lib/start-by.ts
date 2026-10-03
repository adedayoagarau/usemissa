import { calendarDaysUntil } from "./deadlineLabel.ts";
import { reminderDateForOffset } from "./reminder-schedule.ts";

/**
 * Start-by dates: the latest sensible day to begin an application, worked
 * back from its deadline. Every estimate is deterministic, shown with its
 * reasoning, and labelled as an estimate. Nothing here is inferred by a model.
 */
export type StartByItem = {
  label: string;
  state: "missing" | "ready" | "complete";
  /** A Library Work, file, or saved answer is already attached. */
  linked: boolean;
};

type Effort = { key: string; match: RegExp; low: number; high: number; leadDays?: number; lead?: string };

// Day ranges are working days of focused effort for one creator. Lead days
// are waiting time on other people that cannot be shortened by working faster.
const EFFORTS: Effort[] = [
  { key: "references", match: /\b(reference|referee|recommendation|letters? of support)\b/i, low: 1, high: 1, leadDays: 21, lead: "Ask referees at least three weeks ahead" },
  { key: "transcript", match: /\btranscripts?\b/i, low: 1, high: 1, leadDays: 14, lead: "Institutions can take two weeks to send transcripts" },
  { key: "translation", match: /\btranslat/i, low: 5, high: 10 },
  { key: "manuscript", match: /\b(manuscript|full draft|complete draft)\b/i, low: 5, high: 10 },
  { key: "proposal", match: /\b(proposal|project description|project plan)\b/i, low: 3, high: 7 },
  { key: "work-sample", match: /\b(work samples?|writing samples?|sample pages|excerpt|portfolio)\b/i, low: 2, high: 5 },
  { key: "images", match: /\b(images?|photos?|documentation|slides)\b/i, low: 1, high: 3 },
  { key: "budget", match: /\bbudget\b/i, low: 1, high: 3 },
  { key: "statement", match: /\b(artist statement|statement|essay|personal statement)\b/i, low: 1, high: 3 },
  { key: "synopsis", match: /\b(synopsis|summary|abstract)\b/i, low: 1, high: 2 },
  { key: "cover-letter", match: /\bcover letter\b/i, low: 1, high: 2 },
  { key: "cv", match: /\b(cv|curriculum vitae|r[eé]sum[eé])\b/i, low: 0.5, high: 1 },
  { key: "bio", match: /\bbio(graphy)?\b/i, low: 0.5, high: 1 },
];
const REVIEW_LINKED = { low: 0.5, high: 1 };
const UNKNOWN = { low: 1, high: 2 };
const DEFAULT_WITHOUT_CHECKLIST = 7;
const BUFFER_DAYS = 1;

export type StartByReason = { label: string; detail: string };
export type StartBy = {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  daysNeeded: number;
  basis: "checklist" | "default";
  status: "ahead" | "today" | "passed";
  /** Days from today until the start-by date; negative once passed. */
  daysUntil: number;
  reasons: StartByReason[];
};

const fmt = (days: number) => (days === 1 ? "1 day" : `${Number.isInteger(days) ? days : days.toFixed(1)} days`);

export function estimateStartBy({
  deadline,
  deadlineKind,
  items,
  now = new Date(),
}: {
  deadline: string | null | undefined;
  deadlineKind: string;
  items: ReadonlyArray<StartByItem>;
  now?: Date;
}): StartBy | null {
  if (!deadline || deadlineKind === "rolling" || deadlineKind === "until-filled") return null;
  const remaining = items.filter((item) => item.state === "missing");
  if (items.length && !remaining.length) return null;

  const reasons: StartByReason[] = [];
  let workDays = 0;
  let leadDays = 0;
  let basis: StartBy["basis"] = "checklist";

  if (!items.length) {
    basis = "default";
    workDays = DEFAULT_WITHOUT_CHECKLIST;
    reasons.push({ label: "No requirements listed yet", detail: `Missa allows ${fmt(DEFAULT_WITHOUT_CHECKLIST)} until you add preparation steps` });
  }
  for (const item of remaining) {
    const effort = EFFORTS.find((candidate) => candidate.match.test(item.label));
    if (effort?.leadDays) {
      leadDays = Math.max(leadDays, effort.leadDays);
      reasons.push({ label: item.label, detail: effort.lead ?? `${fmt(effort.leadDays)} lead time` });
      workDays += effort.high;
      continue;
    }
    const range = item.linked ? REVIEW_LINKED : (effort ?? UNKNOWN);
    workDays += range.high;
    reasons.push({
      label: item.label,
      detail: item.linked
        ? `Linked from Library · ${fmt(range.low)}–${fmt(range.high)} to review`
        : `${fmt(range.low)}–${fmt(range.high)}${effort ? "" : " · general estimate"}`,
    });
  }
  const daysNeeded = Math.ceil(Math.max(workDays, leadDays)) + BUFFER_DAYS;
  reasons.push({ label: "Buffer", detail: `${fmt(BUFFER_DAYS)} before the deadline for checks and uploads` });

  const date = reminderDateForOffset(deadline, daysNeeded);
  const daysUntil = calendarDaysUntil(date, now) ?? 0;
  return {
    date,
    daysNeeded,
    basis,
    status: daysUntil < 0 ? "passed" : daysUntil === 0 ? "today" : "ahead",
    daysUntil,
    reasons,
  };
}

/** "Start by 14 Oct", "Start today", "Start-by passed 2 days ago". */
export function startByLabel(startBy: StartBy): string {
  if (startBy.status === "today") return "Start today";
  if (startBy.status === "passed")
    return startBy.daysUntil === -1 ? "Start-by passed yesterday" : `Start-by passed ${-startBy.daysUntil} days ago`;
  const [year, month, day] = startBy.date.split("-").map(Number);
  return `Start by ${new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)))}`;
}
