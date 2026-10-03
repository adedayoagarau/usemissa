import type { MyStatus } from "@missa/radar-engine";

/**
 * One honest application lifecycle shared by the Tracker record, Home, and
 * every surface that links into an application. The six steps are fixed;
 * the detailed status (Shortlisted, Declined, …) is kept as the step detail.
 */
export type LifecycleStepId =
  | "saved"
  | "preparing"
  | "ready"
  | "submitted"
  | "in-review"
  | "outcome";

export const LIFECYCLE_STEPS: ReadonlyArray<{ id: LifecycleStepId; label: string }> = [
  { id: "saved", label: "Saved" },
  { id: "preparing", label: "Preparing" },
  { id: "ready", label: "Ready" },
  { id: "submitted", label: "Submitted" },
  { id: "in-review", label: "In review" },
  { id: "outcome", label: "Outcome" },
];

const STEP_BY_STATUS: Record<MyStatus, LifecycleStepId | "archived"> = {
  interested: "saved",
  saved: "saved",
  preparing: "preparing",
  "draft-started": "preparing",
  "ready-to-submit": "ready",
  submitted: "submitted",
  received: "submitted",
  "in-review": "in-review",
  longlisted: "in-review",
  shortlisted: "in-review",
  finalist: "in-review",
  waitlisted: "in-review",
  "revision-requested": "in-review",
  accepted: "outcome",
  declined: "outcome",
  withdrawn: "outcome",
  "partially-withdrawn": "outcome",
  delivered: "outcome",
  archived: "archived",
};

export function lifecycleStep(status: MyStatus): LifecycleStepId | "archived" {
  return STEP_BY_STATUS[status] ?? "saved";
}

export function lifecycleIndex(step: LifecycleStepId): number {
  return LIFECYCLE_STEPS.findIndex((candidate) => candidate.id === step);
}

/** Whether the creator has not yet sent this application anywhere. */
export function isBeforeSubmission(status: MyStatus): boolean {
  const step = lifecycleStep(status);
  return step === "saved" || step === "preparing" || step === "ready";
}

/**
 * Who established a transition. External navigation never creates one: only
 * the creator, a Missa-hosted submission, the organization, or source
 * information can move an application forward.
 */
export type ProvenanceKind = "creator" | "missa-hosted" | "organization" | "inferred";

export type Provenance = { kind: ProvenanceKind; label: string };

export const HOSTED_SUBMISSION_NOTE_PREFIX = "Missa submission ";

export function eventProvenance(event: {
  source: string;
  note?: string | null;
}): Provenance {
  const source = event.source.toLowerCase();
  if (event.note?.startsWith(HOSTED_SUBMISSION_NOTE_PREFIX) || source.startsWith("hosted"))
    return { kind: "missa-hosted", label: "Confirmed by a Missa-hosted submission" };
  if (source === "user") return { kind: "creator", label: "Recorded by you" };
  if (source === "email")
    return { kind: "creator", label: "Recorded by you from email evidence" };
  if (source === "import") return { kind: "creator", label: "Imported by you" };
  if (source.startsWith("organization") || source === "decision")
    return { kind: "organization", label: "Received from the organization" };
  return { kind: "inferred", label: "Inferred from source information" };
}

export type LifecycleHistoryEvent = {
  id: string;
  to: MyStatus;
  source: string;
  note?: string | null;
  occurredOn?: string | null;
  recordedAt: string;
};

export type LifecycleHostedReceipt = {
  submittedAt: string;
  decisions: Array<{ title: string; outcome: string }>;
};

export type LifecycleStepView = {
  id: LifecycleStepId;
  label: string;
  state: "complete" | "current" | "upcoming";
  /** Specific status inside the step, e.g. "Shortlisted" or "Declined". */
  detail?: string;
  date?: string;
  provenance?: Provenance;
};

/**
 * Project status, dated history, and any Missa-hosted receipt onto the six
 * lifecycle steps. History is trusted for dates and provenance; a step with no
 * matching event is still shown as reached, but without an invented date.
 */
export function buildLifecycle({
  status,
  statusLabel,
  history,
  submittedAt,
  hosted,
}: {
  status: MyStatus;
  statusLabel: string;
  history: ReadonlyArray<LifecycleHistoryEvent>;
  submittedAt?: string | null;
  hosted?: LifecycleHostedReceipt;
}): LifecycleStepView[] {
  const statusStep = lifecycleStep(status);
  let currentIndex =
    statusStep === "archived"
      ? latestReachedIndex(history)
      : lifecycleIndex(statusStep);
  if (hosted) currentIndex = Math.max(currentIndex, lifecycleIndex("submitted"));
  if (hosted?.decisions.length)
    currentIndex = Math.max(currentIndex, lifecycleIndex("outcome"));

  // History arrives newest first; keep the latest event per step.
  const latestByStep = new Map<LifecycleStepId, LifecycleHistoryEvent>();
  for (const event of history) {
    const step = lifecycleStep(event.to);
    if (step !== "archived" && !latestByStep.has(step)) latestByStep.set(step, event);
  }

  return LIFECYCLE_STEPS.map((step, index) => {
    const state: LifecycleStepView["state"] =
      index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
    if (state === "upcoming") return { ...step, state };
    const event = latestByStep.get(step.id);
    const view: LifecycleStepView = { ...step, state };
    if (event) {
      view.date = event.occurredOn ?? event.recordedAt;
      view.provenance = eventProvenance(event);
    }
    if (step.id === "submitted") {
      if (hosted) {
        view.date = hosted.submittedAt;
        view.provenance = eventProvenance({ source: "hosted" });
      } else if (!view.date && submittedAt) {
        view.date = submittedAt;
      }
    }
    if (step.id === "outcome" && hosted?.decisions.length && lifecycleStep(status) !== "outcome") {
      view.detail = hosted.decisions
        .map((decision) => `${decision.title}: ${decision.outcome}`)
        .join(" · ");
      view.provenance = { kind: "organization", label: "Received from the organization" };
      view.date = undefined;
    } else if (state === "current" && lifecycleStep(status) === step.id && step.label.toLowerCase() !== statusLabel.toLowerCase()) {
      view.detail = statusLabel;
    }
    return view;
  });
}

function latestReachedIndex(history: ReadonlyArray<LifecycleHistoryEvent>): number {
  for (const event of history) {
    const step = lifecycleStep(event.to);
    if (step !== "archived") return lifecycleIndex(step);
  }
  return 0;
}

/** The single most useful next move for an application, with its reason. */
export type ApplicationNextMove =
  | { kind: "start-preparing"; label: string; reason: string }
  | { kind: "mark-ready"; label: string; reason: string }
  | { kind: "record-submission"; label: string; reason: string }
  | { kind: "record-response"; label: string; reason: string }
  | { kind: "none"; label: string; reason: string };

export function nextMove({
  status,
  checklist,
  hosted,
}: {
  status: MyStatus;
  checklist?: { total: number; done: number };
  hosted?: boolean;
}): ApplicationNextMove {
  const step = lifecycleStep(status);
  if (hosted && isBeforeSubmission(status))
    return { kind: "none", label: "Submitted through Missa", reason: "Your receipt confirms this submission." };
  if (step === "saved")
    return {
      kind: "start-preparing",
      label: "Start preparing",
      reason: "Move this to Preparing when you begin gathering materials.",
    };
  if (step === "preparing") {
    const remaining = checklist ? checklist.total - checklist.done : undefined;
    return remaining && remaining > 0
      ? {
          kind: "mark-ready",
          label: "Mark ready",
          reason: `${remaining} preparation ${remaining === 1 ? "step remains" : "steps remain"}. You can still mark it ready yourself.`,
        }
      : {
          kind: "mark-ready",
          label: "Mark ready",
          reason: "Your checklist is complete. Mark it ready when you have checked the guidelines.",
        };
  }
  if (step === "ready")
    return {
      kind: "record-submission",
      label: "Record submission",
      reason: "After you submit on the official site, record the date here.",
    };
  if (step === "submitted" || step === "in-review")
    return {
      kind: "record-response",
      label: "Record a response",
      reason: "Record any acknowledgement, shortlist, or decision you receive.",
    };
  return { kind: "none", label: "Outcome recorded", reason: "This application is complete." };
}
