import type { MyStatus } from "@missa/radar-engine";

/**
 * Views the Tracker can open. Links from reminders, Calendar, Library and
 * email use the My applications names (`saved`, `awaiting`, `history`), so
 * those resolve to the Tracker view that shows the same records. `plan`
 * groups calls in preparation by how soon they close.
 */
export const TRACKER_VIEWS = [
  "active",
  "plan",
  "saved",
  "submissions",
  "calendar",
  "works",
  "types",
  "organizations",
  "archive",
] as const;

export type TrackerView = (typeof TRACKER_VIEWS)[number];

export type TrackerStage =
  | "Saved"
  | "Preparing"
  | "Submitted"
  | "In progress"
  | "Outcome"
  | "Archived";

const VIEW_ALIASES: Record<string, TrackerView> = {
  awaiting: "submissions",
  history: "submissions",
};

export function parseTrackerView(value: string | null | undefined): TrackerView {
  const normalized = (value ?? "").trim().toLowerCase();
  if ((TRACKER_VIEWS as readonly string[]).includes(normalized))
    return normalized as TrackerView;
  return VIEW_ALIASES[normalized] ?? "active";
}

/** Opportunity or submission ids are opaque; keep them bounded and trimmed. */
export function parseApplicationId(value: string | null | undefined): string {
  return (value ?? "").trim().slice(0, 240);
}

export function trackerStage(status: MyStatus): TrackerStage {
  if (["interested", "saved"].includes(status)) return "Saved";
  if (["preparing", "draft-started", "ready-to-submit"].includes(status))
    return "Preparing";
  if (["submitted", "received"].includes(status)) return "Submitted";
  if (
    [
      "in-review",
      "longlisted",
      "shortlisted",
      "finalist",
      "waitlisted",
      "revision-requested",
    ].includes(status)
  )
    return "In progress";
  if (status === "archived") return "Archived";
  return "Outcome";
}

/** Whether a Tracker item with this status is listed in the given view. */
export function viewShowsStatus(view: TrackerView, status: MyStatus): boolean {
  const stage = trackerStage(status);
  if (view === "active") return stage !== "Archived";
  if (view === "saved" || view === "plan")
    return stage === "Saved" || stage === "Preparing";
  if (view === "submissions")
    return ["Submitted", "In progress", "Outcome"].includes(stage);
  if (view === "archive") return stage === "Archived";
  return true;
}

export function homeViewForStatus(status: MyStatus): TrackerView {
  const stage = trackerStage(status);
  if (stage === "Saved" || stage === "Preparing") return "saved";
  if (stage === "Archived") return "archive";
  return "submissions";
}

export type TrackerFocus = {
  view: TrackerView;
  /** Tracker item to select, by opportunity id. */
  opportunityId?: string;
  /** Missa-hosted receipt to select, by submission id. */
  submissionId?: string;
  /** An application id was requested but is not in this account's Tracker. */
  missing: boolean;
};

/**
 * Decide which view opens and which record is selected for a Tracker URL.
 * A requested record always wins over a view that would not list it, and a
 * creator with receipts but no tracked items lands on their receipts.
 */
export function resolveTrackerFocus({
  view,
  applicationId,
  items,
  submissions,
}: {
  view: TrackerView;
  applicationId: string;
  items: ReadonlyArray<{ opportunityId: string; myStatus: MyStatus }>;
  submissions: ReadonlyArray<{ id: string; radarOpportunityId?: string }>;
}): TrackerFocus {
  const fallbackView =
    !items.length && submissions.length && view === "active"
      ? "submissions"
      : view;
  if (!applicationId) return { view: fallbackView, missing: false };

  const item = items.find(
    (candidate) => candidate.opportunityId === applicationId,
  );
  if (item) {
    const nextView = viewShowsStatus(view, item.myStatus)
      ? view
      : homeViewForStatus(item.myStatus);
    const receipt =
      nextView === "submissions"
        ? submissions.find(
            (submission) => submission.radarOpportunityId === applicationId,
          )
        : undefined;
    return receipt
      ? { view: nextView, submissionId: receipt.id, missing: false }
      : { view: nextView, opportunityId: item.opportunityId, missing: false };
  }

  const receipt = submissions.find(
    (submission) =>
      submission.id === applicationId ||
      submission.radarOpportunityId === applicationId,
  );
  if (receipt)
    return { view: "submissions", submissionId: receipt.id, missing: false };

  return { view: fallbackView, missing: true };
}
