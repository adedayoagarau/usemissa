import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { CircleAlert, LoaderCircle } from "lucide-react";
import type { FitScore } from "@missa/radar-engine";

type Size = "default" | "compact";

function cx(base: string, className?: string) {
  return className ? `${base} ${className}` : base;
}

/*
 * Semantic badges. Feature code selects these rather than importing the Badge
 * primitive directly, so domain meaning carries the correct treatment and
 * never animates (DESIGN.md §8). This wrapper layer is the one place that
 * imports the primitive.
 */

/** Opportunity type or discipline. Neutral outline; never animates. */
export function CategoryBadge({
  children,
  size,
}: {
  children: ReactNode;
  size?: Size;
}) {
  return (
    <Badge variant="outline" size={size}>
      {children}
    </Badge>
  );
}

const STATUS_TREATMENT: Record<string, string> = {
  "opening-soon": "bg-mineral-blue-tint text-mineral-blue",
  open: "bg-accent-tint text-accent-deep",
  "always-open": "bg-accent-tint text-accent-deep",
  "deadline-extended": "bg-accent-tint text-accent-deep",
  closed: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

/** Opportunity lifecycle state: opens soon, open, or closed. */
export function OpportunityStatusBadge({
  state,
  children,
  size,
  className,
}: {
  state: string;
  children: ReactNode;
  size?: Size;
  className?: string;
}) {
  return (
    <Badge
      className={cx(
        STATUS_TREATMENT[state] ?? STATUS_TREATMENT["opening-soon"],
        className,
      )}
      size={size}
    >
      {children}
    </Badge>
  );
}

/** Closing soon / time-sensitive attention. Ochre warning; never animates. */
export function UrgencyBadge({
  children,
  size,
}: {
  children: ReactNode;
  size?: Size;
}) {
  return (
    <Badge className="bg-ochre-tint text-ochre-deep" size={size}>
      {children}
    </Badge>
  );
}

const AUTHORITY_TREATMENT: Record<string, string> = {
  verified: "bg-accent-tint text-accent-deep",
  checked: "bg-mineral-blue-tint text-mineral-blue",
  unverified: "bg-muted text-muted-foreground",
};

/** Organization confirmation level. Forest, mineral, or neutral. */
export function AuthorityBadge({
  level,
  children,
}: {
  level: "verified" | "checked" | "unverified";
  children: ReactNode;
}) {
  return (
    <Badge className={AUTHORITY_TREATMENT[level]}>{children}</Badge>
  );
}

const FIT_LEVEL_LABEL: Record<FitScore["level"], string> = {
  strong: "Strong Fit",
  possible: "Possible Fit",
  weak: "Weak Fit",
  "not-eligible": "Not Eligible",
  unknown: "Unknown Fit",
};

const FIT_LEVEL_TREATMENT: Record<FitScore["level"], string> = {
  strong: "bg-green text-primary-foreground",
  possible: "bg-information-subtle text-information",
  weak: "bg-muted text-muted-foreground",
  "not-eligible": "bg-destructive/10 text-destructive",
  unknown: "bg-muted text-muted-foreground",
};

/** Personalized fit level; the explanation is rendered by the caller. */
export function FitLevelBadge({ level }: { level: FitScore["level"] }) {
  return (
    <Badge className={FIT_LEVEL_TREATMENT[level]}>
      {FIT_LEVEL_LABEL[level]}
    </Badge>
  );
}

/** Generic workflow or section status with no opportunity-domain meaning. */
export function StatusBadge({
  children,
  size,
}: {
  children: ReactNode;
  size?: Size;
}) {
  return (
    <Badge variant="outline" size={size}>
      {children}
    </Badge>
  );
}

type FeeProjection = {
  status: "no-fee" | "paid" | "unknown";
  amountCents?: number;
  currency?: string;
};

function formatFeeAmount(amountCents: number, currency: string): string {
  if (/^[A-Z]{3}$/u.test(currency)) {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(
      amountCents / 100,
    );
  }
  return `${currency}${(amountCents / 100).toFixed(2)}`;
}

/** Canonical fee label per DESIGN.md §8: customer language, not backend enums. */
export function feeLabel(fee: FeeProjection): string {
  if (fee.status === "no-fee" || fee.amountCents === 0) {
    return "Free to submit";
  }
  if (fee.amountCents !== undefined && fee.currency) {
    return `${formatFeeAmount(fee.amountCents, fee.currency)} fee`;
  }
  if (fee.status === "paid") {
    return "Application fee";
  }
  return "Fee unclear";
}

/**
 * Free-to-submit signal. Quiet Lichen when the scan value warrants it; neutral
 * otherwise. Never animates (DESIGN.md §8).
 */
export function FeeBadge({
  fee,
  className,
}: {
  fee: FeeProjection;
  className?: string;
}) {
  const free = fee.status === "no-fee" || fee.amountCents === 0;
  if (free) {
    return (
      <Badge className={cx("bg-lichen-tint text-green", className)}>
        {feeLabel(fee)}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={className}>
      {feeLabel(fee)}
    </Badge>
  );
}

const PUBLICATION_TREATMENT: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-accent-tint text-accent-deep",
  closed: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

/**
 * Draft/published/archived workflow token. Restrained; only the badge's own
 * color transition reflects the state change, never a pulse (DESIGN.md §8).
 */
export function PublicationStateBadge({
  state,
  children,
  size,
}: {
  state: "draft" | "published" | "closed" | "archived";
  children: ReactNode;
  size?: Size;
}) {
  return (
    <Badge className={PUBLICATION_TREATMENT[state]} size={size}>
      {children}
    </Badge>
  );
}

/**
 * Uploading/syncing/processing. The indicator spins only while the process is
 * confirmed active; a failed process is a static destructive icon (DESIGN.md
 * §8). Callers render the nearby recovery action.
 */
export function ProcessBadge({
  state,
  children,
  size,
  role,
}: {
  state: "active" | "failed";
  children: ReactNode;
  size?: Size;
  role?: string;
}) {
  if (state === "failed") {
    return (
      <Badge className="bg-destructive/10 text-destructive" size={size} role={role}>
        <CircleAlert aria-hidden="true" />
        {children}
      </Badge>
    );
  }
  return (
    <Badge className="bg-information-subtle text-information" size={size} role={role}>
      <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
      {children}
    </Badge>
  );
}
