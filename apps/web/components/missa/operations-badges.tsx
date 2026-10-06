import { Badge } from "@/components/ui/badge";
import type { CalibrationLabel, CommunicationBatchStatus, TimelineStepId } from "@missa/workspace-engine";

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
