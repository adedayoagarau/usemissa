import { Badge } from "@/components/ui/badge";
import type { CalibrationLabel, CommunicationBatchStatus, SubmitterQuestion, TimelineStepId } from "@missa/workspace-engine";

/**
 * Read-only state labels for the organization admin suite. Each wrapper owns
 * the mapping from a domain state to customer language and a badge variant,
 * so route code never picks a colour or variant directly.
 */

type BadgeVariant = "secondary" | "outline" | "accent" | "information" | "success" | "warning" | "destructive";

const calibrationCopy: Record<CalibrationLabel, { label: string; variant: BadgeVariant }> = {
  harsh: { label: "Scores low", variant: "information" },
  balanced: { label: "In line", variant: "success" },
  generous: { label: "Scores high", variant: "information" },
  "insufficient-data": { label: "Too few scores", variant: "secondary" },
};

export function CalibrationBadge({ calibration, explanation }: { calibration: CalibrationLabel; explanation?: string }) {
  const copy = calibrationCopy[calibration];
  return (
    <Badge variant={copy.variant} size="compact" title={explanation} aria-label={explanation ? `${copy.label}. ${explanation}` : copy.label}>
      {copy.label}
    </Badge>
  );
}

const letterStateCopy: Record<CommunicationBatchStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "secondary" },
  "awaiting-approval": { label: "Awaiting approval", variant: "information" },
  approved: { label: "Approved to send", variant: "accent" },
  sending: { label: "Sending", variant: "information" },
  sent: { label: "Sent", variant: "success" },
  "partially-sent": { label: "Partly sent", variant: "warning" },
  failed: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export function LetterStateBadge({ status }: { status: CommunicationBatchStatus }) {
  const copy = letterStateCopy[status];
  return (
    <Badge variant={copy.variant} size="compact">
      {copy.label}
    </Badge>
  );
}

export function SubmissionStageBadge({ step, label }: { step: TimelineStepId; label: string }) {
  const variant: BadgeVariant = step === "decision" ? "accent" : step === "withdrawn" || step === "received" ? "secondary" : "information";
  return (
    <Badge variant={variant} size="compact">
      {label}
    </Badge>
  );
}

const questionStateCopy: Record<SubmitterQuestion["status"], { label: string; variant: BadgeVariant }> = {
  open: { label: "Waiting for an answer", variant: "information" },
  answered: { label: "Answered", variant: "success" },
  closed: { label: "Closed", variant: "secondary" },
};

export function QuestionStateBadge({ status }: { status: SubmitterQuestion["status"] }) {
  const copy = questionStateCopy[status];
  return (
    <Badge variant={copy.variant} size="compact">
      {copy.label}
    </Badge>
  );
}

const workDecisionCopy: Record<string, { label: string; variant: BadgeVariant }> = {
  accepted: { label: "Accepted", variant: "success" },
  waitlisted: { label: "Waitlisted", variant: "information" },
  declined: { label: "Declined", variant: "secondary" },
};

/** The recorded decision on one Work, in the words the review desk uses. */
export function WorkDecisionBadge({ outcome }: { outcome: string }) {
  const copy = workDecisionCopy[outcome] ?? { label: outcome, variant: "outline" as const };
  return (
    <Badge variant={copy.variant} size="compact">
      {copy.label}
    </Badge>
  );
}

const deliveryStateCopy: Record<string, { label: string; variant: BadgeVariant }> = {
  Delivered: { label: "Delivered", variant: "success" },
  Accepted: { label: "Accepted by provider", variant: "information" },
  "In progress": { label: "In progress", variant: "secondary" },
  "Needs attention": { label: "Needs attention", variant: "warning" },
};

/** A recorded provider delivery state, from organizationMessageState. Accepted is not delivered. */
export function DeliveryStateBadge({ state }: { state: string }) {
  const copy = deliveryStateCopy[state] ?? { label: state, variant: "secondary" as const };
  return (
    <Badge variant={copy.variant} size="compact">
      {copy.label}
    </Badge>
  );
}
