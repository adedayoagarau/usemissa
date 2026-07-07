import type { OpportunityCandidate } from '../domain/types.js';
import { isPlausibleOpportunityDate } from './dates.js';

/**
 * Deterministic validation — the strategy doc's "critical rule": whatever the
 * extractor (deterministic or AI), dates, fees, URLs, and status claims are
 * validated by rules, and the result is an explainable 0–100 confidence.
 * Fatal issues keep a candidate from ever becoming an Opportunity.
 */
export function validateCandidate(candidate: OpportunityCandidate, now: Date): OpportunityCandidate {
  const issues: string[] = [];
  let confidence = 0;

  if (candidate.title && candidate.title.length >= 3) {
    confidence += 20;
  } else {
    issues.push('fatal: no title could be extracted');
  }

  switch (candidate.deadline.kind) {
    case 'exact':
      confidence += 25;
      break;
    case 'inferred':
      confidence += 15;
      issues.push('deadline year inferred from context');
      break;
    case 'rolling':
    case 'until-filled':
      confidence += 15;
      break;
    default:
      issues.push('no deadline found');
  }

  if (candidate.deadline.date && !isPlausibleOpportunityDate(candidate.deadline.date, now)) {
    issues.push(`implausible deadline ${candidate.deadline.date}; discarded`);
    candidate.deadline = { kind: 'unknown', raw: candidate.deadline.raw };
    confidence -= 15;
  }

  if (candidate.openDate && !isPlausibleOpportunityDate(candidate.openDate, now)) {
    issues.push(`implausible open date ${candidate.openDate}; discarded`);
    candidate.openDate = undefined;
  }

  if (candidate.organizationName) confidence += 15;
  else issues.push('organization unknown');

  if (candidate.submissionUrl) {
    if (/^https?:\/\//i.test(candidate.submissionUrl)) confidence += 10;
    else {
      issues.push(`invalid submission url discarded: ${candidate.submissionUrl}`);
      candidate.submissionUrl = undefined;
    }
  }

  if (candidate.fee.disclosed) {
    const cents = candidate.fee.amountCents ?? 0;
    if (cents >= 0 && cents <= 100_000) confidence += 10;
    else {
      issues.push(`implausible fee ${cents} cents; treated as undisclosed`);
      candidate.fee = { disclosed: false };
    }
  }

  if (candidate.openSignals.length + candidate.closeSignals.length + candidate.closedSignals.length > 0) {
    confidence += 10;
  } else {
    issues.push('no opportunity signals detected on page');
  }

  if (candidate.genres.length > 0) confidence += 10;

  if (candidate.suspiciousSignals.length > 0) {
    issues.push(`suspicious language: ${candidate.suspiciousSignals.join('; ')}`);
  }

  candidate.issues = issues;
  candidate.extractionConfidence = Math.max(0, Math.min(100, confidence));
  return candidate;
}

export function hasFatalIssues(candidate: OpportunityCandidate): boolean {
  return candidate.issues.some((i) => i.startsWith('fatal:'));
}

/** A page with no signals and no deadline is probably not an opportunity page at all. */
export function looksLikeOpportunity(candidate: OpportunityCandidate): boolean {
  return (
    candidate.openSignals.length + candidate.closeSignals.length + candidate.closedSignals.length > 0 ||
    candidate.deadline.kind !== 'unknown'
  );
}
