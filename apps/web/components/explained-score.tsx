"use client";

import { useState } from "react";
import { AuthorityBadge, FitLevelBadge } from "@/components/missa/semantic-badges";
import type { FitScore } from "@missa/radar-engine";

/**
 * Story 3.1: renders any self-explaining score (starting with FitScore) with
 * its reasons visible, never a bare number/label -- per the UX spec's
 * "Explained Score" component spec and the PRD's non-negotiable "every
 * alert/score carries its reason" rule.
 */

export function FitScoreBadge({ fit }: { fit: FitScore }) {
  const [expanded, setExpanded] = useState(false);
  const hasReasons =
    fit.reasons.length + fit.watchouts.length + fit.disqualifiers.length > 0;

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => hasReasons && setExpanded((e) => !e)}
        className="inline-flex items-center gap-1"
      >
        <FitLevelBadge level={fit.level} />
        {hasReasons && (
          <span className="text-xs text-muted-foreground">
            {expanded ? "hide reasons" : "why?"}
          </span>
        )}
      </button>
      {expanded && (
        <ul className="mt-1 space-y-0.5 text-sm">
          {fit.reasons.map((r) => (
            <li key={r} className="text-[var(--green)]">
              ✓ {r}
            </li>
          ))}
          {fit.watchouts.map((w) => (
            <li key={w} className="text-[var(--accent-deep)]">
              ⚠ {w}
            </li>
          ))}
          {fit.disqualifiers.map((d) => (
            <li key={d} className="text-destructive">
              ✕ {d}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TrustBadge({
  trust,
  checkedLabel,
}: {
  trust: number;
  checkedLabel?: string;
}) {
  const label =
    trust >= 70 ? "Verified" : trust >= 40 ? "Checked" : "Unverified";
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <AuthorityBadge
        level={trust >= 70 ? "verified" : trust >= 40 ? "checked" : "unverified"}
      >
        {label}
      </AuthorityBadge>
      {checkedLabel && <span>{checkedLabel}</span>}
    </span>
  );
}
