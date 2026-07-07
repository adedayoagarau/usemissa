import type { Opportunity, TrustSignal } from '../domain/types.js';

const MS_PER_DAY = 86_400_000;

/**
 * Freshness (0–100): decays with time since the last successful check.
 * Claimed listings decay at half speed — the organization keeps them current.
 * Below 30 the listing carries a stale warning; the status engine may mark it
 * Uncertain.
 */
export function freshnessScore(opp: Opportunity, now: Date): number {
  const days = Math.max(0, (now.getTime() - Date.parse(opp.lastCheckedAt)) / MS_PER_DAY);
  const halfLifeDays = opp.claimedByOrganizationId ? 28 : 14;
  return Math.round(100 * Math.pow(0.5, days / halfLifeDays));
}

export const STALE_FRESHNESS_THRESHOLD = 30;

/**
 * Confidence (0–100): starts from extraction confidence, penalized by
 * unresolved cross-source conflicts, boosted by an organization claim
 * (claimed fields are authoritative).
 */
export function confidenceScore(opp: Opportunity, extractionConfidence: number): number {
  let score = extractionConfidence;
  score -= opp.conflicts.length * 20;
  if (opp.claimedByOrganizationId) score = Math.max(score, 90);
  return Math.max(0, Math.min(100, score));
}

/** Trust signals per the strategy doc's Trust Signals list; each carries its weight. */
export function computeTrustSignals(
  opp: Opportunity,
  opts: {
    officialSource: boolean;
    organizationVerified: boolean;
    hasHistory: boolean;
    suspiciousSignals: string[];
  },
): TrustSignal[] {
  const f = opp.fields;
  return [
    { key: 'official-source', label: 'Found on official organization page', present: opts.officialSource, weight: 20 },
    { key: 'org-claimed', label: 'Organization claimed this listing', present: !!opp.claimedByOrganizationId, weight: 25 },
    { key: 'org-verified', label: 'Verified organization', present: opts.organizationVerified, weight: 10 },
    { key: 'historical-call', label: 'Historical call exists', present: opts.hasHistory || opp.pastCycles.length > 0, weight: 10 },
    { key: 'clear-guidelines', label: 'Clear guidelines (materials listed)', present: f.requiredMaterials.length > 0, weight: 10 },
    { key: 'contact-email', label: 'Contact email present', present: f.contactEmailPresent, weight: 10 },
    { key: 'fee-disclosed', label: 'Fee disclosed', present: f.fee.disclosed, weight: 10 },
    { key: 'stable-identity', label: 'Consistent organization identity', present: !!f.organizationName, weight: 5 },
    {
      key: 'suspicious-language',
      label: opts.suspiciousSignals.length > 0 ? `Suspicious payment language: ${opts.suspiciousSignals.join('; ')}` : 'No suspicious payment language',
      present: opts.suspiciousSignals.length > 0,
      weight: -50,
    },
  ];
}

export function trustScore(signals: TrustSignal[]): number {
  const score = signals.reduce((sum, s) => sum + (s.present ? s.weight : 0), 0);
  return Math.max(0, Math.min(100, score));
}
