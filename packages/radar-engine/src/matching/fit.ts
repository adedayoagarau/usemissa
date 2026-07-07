import type { FitScore, Opportunity, UserProfile } from '../domain/types.js';
import { daysBetween, isoDateOf } from '../extraction/dates.js';

/**
 * Fit Score (strategy § 9): Strong / Possible / Weak / Not Eligible / Unknown,
 * and it always explains itself — ✓ reasons, ⚠ watch-outs, ✕ disqualifiers.
 * A hard eligibility miss is disqualifying regardless of everything else.
 */
export function fitScore(user: UserProfile, opp: Opportunity, now: Date): FitScore {
  const reasons: string[] = [];
  const watchouts: string[] = [];
  const disqualifiers: string[] = [];
  const f = opp.fields;

  // Hard eligibility: every rule with a checkable value is compared to user attributes.
  for (const rule of f.eligibility) {
    if (!rule.value) {
      watchouts.push(rule.description);
      continue;
    }
    const userValue = user.attributes[rule.key];
    if (userValue === undefined) {
      watchouts.push(`${rule.description} — your profile doesn't say`);
    } else if (userValue.toLowerCase() !== rule.value.toLowerCase()) {
      disqualifiers.push(rule.description);
    } else {
      reasons.push(rule.description);
    }
  }

  // Genre match.
  if (f.genres.length > 0 && user.genres.length > 0) {
    const overlap = f.genres.filter((g) => user.genres.includes(g));
    if (overlap.length > 0) reasons.push(`Accepts ${overlap.join(', ')}`);
    else watchouts.push(`Accepts ${f.genres.join(', ')} — none of your genres`);
  }

  // Fee.
  if (f.fee.disclosed) {
    if ((f.fee.amountCents ?? 0) === 0) reasons.push('No fee');
    else reasons.push(`Fee ${formatFee(f.fee.amountCents!)} (disclosed)`);
  } else {
    watchouts.push('Fee not disclosed');
  }

  // Deadline proximity.
  if (f.deadline.date) {
    const days = daysBetween(isoDateOf(now), f.deadline.date);
    if (days < 0) disqualifiers.push('Deadline has passed');
    else if (days <= 3) watchouts.push(`Deadline in ${days} day${days === 1 ? '' : 's'}`);
    else reasons.push(`Deadline in ${days} days`);
  } else if (f.deadline.kind === 'rolling' || f.deadline.kind === 'until-filled') {
    reasons.push('Rolling deadline');
  }

  if (f.simultaneousAllowed === true) reasons.push('Allows simultaneous submissions');
  if (f.simultaneousAllowed === false) watchouts.push('No simultaneous submissions');

  if (opp.scores.trust < 40) watchouts.push('Low trust score — check the source before submitting');
  if (opp.status === 'needs-verification') watchouts.push('Listing needs verification');

  let level: FitScore['level'];
  if (disqualifiers.length > 0) level = 'not-eligible';
  else if (reasons.length === 0 && watchouts.length === 0) level = 'unknown';
  else if (reasons.length >= 3 && watchouts.length <= 2) level = 'strong';
  else if (reasons.length >= watchouts.length) level = 'possible';
  else level = 'weak';

  return { level, reasons, watchouts, disqualifiers };
}

export function formatFee(cents: number): string {
  return cents === 0 ? 'free' : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
