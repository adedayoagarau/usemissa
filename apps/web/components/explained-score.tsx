'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FitScore } from '@missa/radar-engine';

/**
 * Story 3.1: renders any self-explaining score (starting with FitScore) with
 * its reasons visible, never a bare number/label -- per the UX spec's
 * "Explained Score" component spec and the PRD's non-negotiable "every
 * alert/score carries its reason" rule.
 */
const LEVEL_LABEL: Record<FitScore['level'], string> = {
  strong: 'Strong Fit',
  possible: 'Possible Fit',
  weak: 'Weak Fit',
  'not-eligible': 'Not Eligible',
  unknown: 'Unknown Fit',
};

const LEVEL_VARIANT: Record<FitScore['level'], string> = {
  strong: 'bg-[var(--green)] text-white',
  possible: 'bg-[var(--accent-tint)] text-[var(--accent-deep)]',
  weak: 'bg-muted text-muted-foreground',
  'not-eligible': 'bg-destructive/10 text-destructive',
  unknown: 'bg-muted text-muted-foreground',
};

export function FitScoreBadge({ fit }: { fit: FitScore }) {
  const [expanded, setExpanded] = useState(false);
  const hasReasons = fit.reasons.length + fit.watchouts.length + fit.disqualifiers.length > 0;

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => hasReasons && setExpanded((e) => !e)}
        className="inline-flex items-center gap-1"
      >
        <Badge className={cn('font-medium', LEVEL_VARIANT[fit.level])}>{LEVEL_LABEL[fit.level]}</Badge>
        {hasReasons && <span className="text-xs text-muted-foreground">{expanded ? 'hide reasons' : 'why?'}</span>}
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

export function TrustBadge({ trust, lastCheckedAt }: { trust: number; lastCheckedAt?: string }) {
  const label = trust >= 70 ? 'Verified' : trust >= 40 ? 'Checked' : 'Unverified';
  const hoursAgo = lastCheckedAt ? Math.max(0, Math.round((Date.now() - new Date(lastCheckedAt).getTime()) / 3_600_000)) : undefined;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Badge variant="outline">{label}</Badge>
      {hoursAgo !== undefined && <span>checked {hoursAgo}h ago</span>}
    </span>
  );
}
