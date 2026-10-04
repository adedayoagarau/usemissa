import { readableNoticeText } from "./notice-change";

/**
 * How the Inbox presents the deadline-management notices: the deadline-day
 * alarm, fee tiers, plan steps and plan changes, gone-quiet and follow-up
 * nudges, opening alerts, confirmed forecasts and carrying a call to its next
 * cycle. These notices are written with plain customer copy (including the
 * was/now values for changes), so the Inbox shows their own body.
 */

export type InboxNoticeGroup = "attention" | "changes" | "submissions" | "discovery";

export const DEADLINE_NOTICE_KINDS = [
  "deadline-day",
  "tier-ending",
  "milestone-due",
  "gone-quiet",
  "time-to-query",
  "opens-soon",
  "forecast-changed",
  "obligations-suggested",
  "obligations-moved",
  "cycle-carry-suggested",
] as const;
export type DeadlineNoticeKind = (typeof DEADLINE_NOTICE_KINDS)[number];

type Presentation = {
  category: string;
  group: InboxNoticeGroup;
  actionLabel: string;
  /** Where the notice goes when it has no link of its own. */
  fallback: "tracker" | "opportunity" | "awaiting";
  reason: string;
};

const PRESENTATION: Record<DeadlineNoticeKind, Presentation> = {
  "deadline-day": {
    category: "Deadline day",
    group: "attention",
    actionLabel: "Open application",
    fallback: "tracker",
    reason: "The deadline-day reminder is on and this application is not marked submitted.",
  },
  "tier-ending": {
    category: "Entry fee",
    group: "attention",
    actionLabel: "Open application",
    fallback: "tracker",
    reason: "A lower entry fee for a call in your Tracker ends soon.",
  },
  "milestone-due": {
    category: "Plan step",
    group: "attention",
    actionLabel: "Open plan",
    fallback: "tracker",
    reason: "This step is in your plan for a saved application.",
  },
  "gone-quiet": {
    category: "Tracker check-in",
    group: "attention",
    actionLabel: "Open application",
    fallback: "tracker",
    reason: "Nothing has changed on this application for the period you chose.",
  },
  "time-to-query": {
    category: "Response check-in",
    group: "attention",
    actionLabel: "Log a response",
    fallback: "awaiting",
    reason: "This submission is still waiting for a response.",
  },
  "opens-soon": {
    category: "Opening soon",
    group: "discovery",
    actionLabel: "View Opportunity",
    fallback: "opportunity",
    reason: "You saved this call or follow its Organization.",
  },
  "forecast-changed": {
    category: "Dates confirmed",
    group: "changes",
    actionLabel: "View Opportunity",
    fallback: "opportunity",
    reason: "You saved this call or follow its Organization.",
  },
  "obligations-suggested": {
    category: "Plan suggestion",
    group: "attention",
    actionLabel: "Add next steps",
    fallback: "tracker",
    reason: "You marked this application accepted.",
  },
  "obligations-moved": {
    category: "Plan change",
    group: "changes",
    actionLabel: "Review plan",
    fallback: "tracker",
    reason: "A deadline in your Tracker moved, and your plan follows it.",
  },
  "cycle-carry-suggested": {
    category: "Next cycle",
    group: "attention",
    actionLabel: "Open application",
    fallback: "tracker",
    reason: "This call closed before the application was sent.",
  },
};

export function isDeadlineNoticeKind(kind: string): kind is DeadlineNoticeKind {
  return (DEADLINE_NOTICE_KINDS as readonly string[]).includes(kind);
}

export type DeadlineNoticeSource = {
  kind: DeadlineNoticeKind;
  title: string;
  body: string;
  opportunityId?: string | null;
  /** The notice's own link; used only when it stays on Missa. */
  actionHref?: string | null;
};

export type DeadlineNoticeView = {
  group: InboxNoticeGroup;
  category: string;
  title: string;
  summary: string;
  reason: string;
  actionHref: string;
  actionLabel: string;
};

const internal = (href: string | null | undefined): href is string =>
  Boolean(href && href.startsWith("/") && !href.startsWith("//"));

function fallbackHref(presentation: Presentation, opportunityId: string | null | undefined): string {
  if (!opportunityId) return presentation.fallback === "opportunity" ? "/opportunities" : "/tracker";
  const id = encodeURIComponent(opportunityId);
  if (presentation.fallback === "opportunity") return `/opportunities/${id}`;
  return `/tracker?view=${presentation.fallback === "awaiting" ? "awaiting" : "saved"}&application=${id}`;
}

/** The Inbox row for one deadline-management notice. */
export function deadlineNoticeView(notice: DeadlineNoticeSource, now = new Date()): DeadlineNoticeView {
  const presentation = PRESENTATION[notice.kind];
  return {
    group: presentation.group,
    category: presentation.category,
    title: readableNoticeText(notice.title, now),
    summary: notice.body.trim() ? readableNoticeText(notice.body.trim(), now) : "Open the related record to review this update.",
    reason: presentation.reason,
    actionHref: internal(notice.actionHref) ? notice.actionHref : fallbackHref(presentation, notice.opportunityId),
    actionLabel: presentation.actionLabel,
  };
}

/**
 * Change notices that Missa writes with their old and new values ("The
 * official deadline moved from Oct 7 to Oct 21."), so the Inbox shows them
 * instead of generic copy. "Deadline needs checking" and early-closure
 * notices are written the same way.
 */
export function changeNoticeSummary(kind: string, body: string, now = new Date()): string | null {
  if (!["deadline-changed", "deadline-extended", "call-closed", "call-reopened", "fee-changed"].includes(kind)) return null;
  const text = body.trim();
  return text ? readableNoticeText(text, now) : null;
}
