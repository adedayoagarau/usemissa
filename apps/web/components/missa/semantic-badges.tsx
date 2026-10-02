import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
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
