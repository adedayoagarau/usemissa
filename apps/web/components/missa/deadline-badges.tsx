import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import styles from "./deadline-badges.module.css";

/**
 * Semantic badges for deadline state. Feature code chooses the meaning; these
 * wrappers own the styling (DESIGN.md §8 badge contract). Unknown data never
 * becomes a badge: callers render nothing when there is nothing to say.
 */

export function UrgencyBadge({
  label,
  urgent = true,
  className,
}: {
  /** Customer language, e.g. "Closes in 6 days" or "Tomorrow". */
  label: string;
  /** Ochre within seven days; a calm neutral otherwise. */
  urgent?: boolean;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(styles.badge, urgent ? styles.urgent : styles.calm, styles.days, className)}>
      {label}
    </Badge>
  );
}

export type DateConfidence = "confirmed" | "predicted" | "changed" | "needs-checking";

const CONFIDENCE_LABELS: Record<DateConfidence, string> = {
  confirmed: "Confirmed",
  predicted: "Predicted",
  changed: "Changed",
  "needs-checking": "Needs checking",
};

const CONFIDENCE_DESCRIPTIONS: Record<DateConfidence, string> = {
  confirmed: "The organization's source states this date.",
  predicted: "Estimated from past cycles. The organization has not announced it yet.",
  changed: "The organization changed this date since Missa first recorded it.",
  "needs-checking": "Missa could not confirm this date at the last check. Check the official source.",
};

export function dateConfidenceDescription(state: DateConfidence): string {
  return CONFIDENCE_DESCRIPTIONS[state];
}

/** Whether a date is the organization's, predicted by Missa, changed, or unconfirmed. */
export function DateConfidenceBadge({
  state,
  label,
  className,
}: {
  state: DateConfidence;
  /** Override the default word, e.g. "Predicted from 3 cycles". */
  label?: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(styles.badge, styles[state], className)} title={CONFIDENCE_DESCRIPTIONS[state]}>
      <span className={styles.text}>{label ?? CONFIDENCE_LABELS[state]}</span>
    </Badge>
  );
}

export function formatFee(cents: number, currency = "USD"): string {
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

/** An entry fee, or "No fee". Renders nothing when the fee is unknown. */
export function FeeBadge({
  cents,
  currency,
  noFee = false,
  className,
}: {
  cents?: number | null;
  currency?: string | null;
  noFee?: boolean;
  className?: string;
}) {
  if (noFee || cents === 0) {
    return (
      <Badge variant="outline" className={cn(styles.badge, styles.neutral, className)}>
        No fee
      </Badge>
    );
  }
  if (cents === null || cents === undefined) return null;
  return (
    <Badge variant="outline" className={cn(styles.badge, styles.neutral, styles.days, className)}>
      {formatFee(cents, currency ?? "USD")} fee
    </Badge>
  );
}

export type ProcessState = "syncing" | "synced" | "failed" | "pending";

const PROCESS_LABELS: Record<ProcessState, string> = {
  syncing: "Syncing",
  synced: "Synced",
  failed: "Not synced",
  pending: "Waiting",
};

/** Background process state. A failure needs a recovery action next to it. */
export function ProcessBadge({ state, label, className }: { state: ProcessState; label?: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(styles.badge, state === "failed" ? styles.failed : styles.neutral, className)}
    >
      {label ?? PROCESS_LABELS[state]}
    </Badge>
  );
}
