import type { Opportunity, OpportunityStatus } from '../domain/types.js';
import { daysBetween, isoDateOf } from '../extraction/dates.js';
import { STALE_FRESHNESS_THRESHOLD } from '../scoring/scores.js';

export const CLOSING_SOON_DAYS = 14;
export const OPENING_SOON_DAYS = 21;
export const NEEDS_VERIFICATION_CONFIDENCE = 40;
/** How long a Deadline Extended badge stays before settling back to date-derived status. */
export const EXTENDED_BADGE_DAYS = 7;

export interface StatusContext {
  now: Date;
  closedSignalPresent: boolean;
  openSignalPresent: boolean;
  lastDeadlineExtensionAt?: string; // IsoDateTime
}

/**
 * Status is derived, never hand-set (strategy statuses: Discovered, Needs
 * Verification, Opening Soon, Open, Closing Soon, Deadline Extended, Closed,
 * Archived, Uncertain, Duplicate — claim state is an orthogonal flag).
 *
 * Precedence: duplicate/archived stick; conflicts or low confidence demand
 * verification; explicit closed signals or a passed deadline close the call;
 * a recent deadline extension badges it; then date math; stale data is
 * Uncertain.
 */
export function deriveStatus(opp: Opportunity, ctx: StatusContext): OpportunityStatus {
  if (opp.duplicateOfId) return 'duplicate';
  if (opp.status === 'archived') return 'archived';

  if (opp.conflicts.length > 0) return 'needs-verification';
  if (opp.scores.confidence < NEEDS_VERIFICATION_CONFIDENCE && !opp.claimedByOrganizationId) {
    return 'needs-verification';
  }

  const today = isoDateOf(ctx.now);
  const deadline = opp.fields.deadline;

  if (ctx.closedSignalPresent) return 'closed';
  if (deadline.date && daysBetween(today, deadline.date) < 0) return 'closed';

  if (ctx.lastDeadlineExtensionAt) {
    const daysSinceExtension = (ctx.now.getTime() - Date.parse(ctx.lastDeadlineExtensionAt)) / 86_400_000;
    if (daysSinceExtension <= EXTENDED_BADGE_DAYS) return 'deadline-extended';
  }

  if (opp.scores.freshness < STALE_FRESHNESS_THRESHOLD && !opp.claimedByOrganizationId) {
    return 'uncertain';
  }

  const opensInFuture = opp.fields.openDate && daysBetween(today, opp.fields.openDate) > 0;
  if (opensInFuture) {
    const days = daysBetween(today, opp.fields.openDate!);
    return days <= OPENING_SOON_DAYS ? 'opening-soon' : 'discovered';
  }
  if (opp.prediction && daysBetween(today, opp.prediction.expectedOpenStart) > 0) {
    const days = daysBetween(today, opp.prediction.expectedOpenStart);
    if (days <= OPENING_SOON_DAYS) return 'opening-soon';
  }

  if (deadline.date) {
    const days = daysBetween(today, deadline.date);
    return days <= CLOSING_SOON_DAYS ? 'closing-soon' : 'open';
  }
  if (deadline.kind === 'rolling' || deadline.kind === 'until-filled' || ctx.openSignalPresent) {
    return 'open';
  }

  return 'discovered';
}

export type ConfidenceTier = 'verified' | 'inferred' | 'uncertain';

/**
 * How much to trust this opportunity's own data when deciding how hard an
 * alert should push — the "verified / inferred / community-reported" idea:
 * a same-day "closes today!" push is only earned by data we actually trust.
 * A claimed listing is always verified (the organization confirmed it
 * themselves); otherwise it follows the same confidence/date-kind signals
 * the engine already computes, so this needs no new extraction work.
 */
export function confidenceTier(opp: Opportunity): ConfidenceTier {
  if (opp.claimedByOrganizationId) return 'verified';
  if (opp.fields.deadline.kind === 'conflicting' || opp.scores.confidence < NEEDS_VERIFICATION_CONFIDENCE) {
    return 'uncertain';
  }
  if (opp.fields.deadline.kind === 'exact' && opp.scores.confidence >= 70) return 'verified';
  return 'inferred';
}

/** UI label; "Claimed by Organization" is surfaced alongside the lifecycle status. */
export function displayStatus(opp: Opportunity): string {
  const labels: Record<OpportunityStatus, string> = {
    'discovered': 'Discovered',
    'needs-verification': 'Needs Verification',
    'opening-soon': 'Opening Soon',
    'open': 'Open',
    'closing-soon': 'Closing Soon',
    'deadline-extended': 'Deadline Extended',
    'closed': 'Closed',
    'archived': 'Archived',
    'uncertain': 'Uncertain',
    'duplicate': 'Duplicate',
  };
  const base = labels[opp.status];
  return opp.claimedByOrganizationId ? `${base} · Claimed by Organization` : base;
}
