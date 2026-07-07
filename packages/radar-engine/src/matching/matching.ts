import type { MatchCriteria, Opportunity, RadarProfile } from '../domain/types.js';
import { daysBetween, isoDateOf } from '../extraction/dates.js';

export interface MatchResult {
  profile: RadarProfile;
  opportunity: Opportunity;
  matchedOn: string[];
}

const ACTIVE_STATUSES = new Set(['open', 'opening-soon', 'closing-soon', 'deadline-extended', 'discovered']);

/**
 * Saved-search matching (strategy § Opportunity Matching). Only live-ish
 * listings match; every match reports which criteria it satisfied so alerts
 * can explain themselves.
 */
export function matchesCriteria(criteria: MatchCriteria, opp: Opportunity, now: Date): string[] | undefined {
  if (!ACTIVE_STATUSES.has(opp.status)) return undefined;
  const matchedOn: string[] = [];
  const f = opp.fields;

  if (criteria.types?.length) {
    if (!criteria.types.includes(f.type)) return undefined;
    matchedOn.push(`type: ${f.type}`);
  }
  if (criteria.genres?.length) {
    const overlap = f.genres.filter((g) => criteria.genres!.includes(g));
    if (overlap.length === 0) return undefined;
    matchedOn.push(`genres: ${overlap.join(', ')}`);
  }
  if (criteria.keywords?.length) {
    const haystack = `${f.title} ${f.organizationName ?? ''} ${f.prize ?? ''}`.toLowerCase();
    const hit = criteria.keywords.filter((k) => haystack.includes(k.toLowerCase()));
    if (hit.length === 0) return undefined;
    matchedOn.push(`keywords: ${hit.join(', ')}`);
  }
  if (criteria.noFeeOnly) {
    if (!f.fee.disclosed || (f.fee.amountCents ?? 1) !== 0) return undefined;
    matchedOn.push('no fee');
  } else if (criteria.maxFeeCents !== undefined) {
    if (!f.fee.disclosed || (f.fee.amountCents ?? Infinity) > criteria.maxFeeCents) return undefined;
    matchedOn.push(`fee within $${(criteria.maxFeeCents / 100).toFixed(0)}`);
  }
  if (criteria.verifiedOnly) {
    if (!opp.claimedByOrganizationId && opp.scores.trust < 60) return undefined;
    matchedOn.push('verified/high-trust only');
  }
  if (criteria.deadlineWithinDays !== undefined) {
    if (!f.deadline.date) return undefined;
    const days = daysBetween(isoDateOf(now), f.deadline.date);
    if (days < 0 || days > criteria.deadlineWithinDays) return undefined;
    matchedOn.push(`deadline within ${criteria.deadlineWithinDays} days`);
  }
  if (criteria.locations?.length) {
    const loc = (f.location ?? '').toLowerCase();
    const locationRules = f.eligibility.filter((r) => r.key === 'location').map((r) => r.value?.toLowerCase());
    const ok =
      criteria.locations.some((l) => loc.includes(l.toLowerCase())) ||
      locationRules.length === 0 ||
      criteria.locations.some((l) => locationRules.includes(l.toLowerCase()));
    if (!ok) return undefined;
  }
  if (criteria.simultaneousRequired && f.simultaneousAllowed === false) return undefined;

  return matchedOn;
}

export function matchProfiles(
  profiles: Iterable<RadarProfile>,
  opportunities: Iterable<Opportunity>,
  now: Date,
): MatchResult[] {
  const results: MatchResult[] = [];
  const opps = [...opportunities];
  for (const profile of profiles) {
    for (const opp of opps) {
      const matchedOn = matchesCriteria(profile.criteria, opp, now);
      if (matchedOn) results.push({ profile, opportunity: opp, matchedOn });
    }
  }
  return results;
}
