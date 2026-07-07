import type { Opportunity, OpportunityCandidate } from '../domain/types.js';

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'for', 'and', 'to', 'in', 'at', 'on', 'call', 'submissions']);

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\d{4}/g, '') // annual calls differ only by year
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .sort()
    .join(' ');
}

export function titleSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeName(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeName(b).split(' ').filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter); // Jaccard
}

export type DedupMatch =
  | { kind: 'same-page'; opportunity: Opportunity }
  | { kind: 'duplicate'; opportunity: Opportunity; similarity: number }
  | { kind: 'new' };

/**
 * Canonical matching: the same page URL is the same opportunity (an update);
 * a different source with a matching submission URL, or matching organization
 * plus highly similar title, is a duplicate of the canonical record.
 */
export function findCanonical(candidate: OpportunityCandidate, existing: Iterable<Opportunity>): DedupMatch {
  let best: { opportunity: Opportunity; similarity: number } | undefined;
  for (const opp of existing) {
    if (opp.duplicateOfId) continue;
    if (opp.sourceUrl === candidate.url) return { kind: 'same-page', opportunity: opp };
    if (
      candidate.submissionUrl &&
      opp.fields.submissionUrl &&
      candidate.submissionUrl === opp.fields.submissionUrl
    ) {
      return { kind: 'duplicate', opportunity: opp, similarity: 1 };
    }
    if (candidate.title && candidate.organizationName && opp.fields.organizationName) {
      const orgMatch =
        normalizeName(candidate.organizationName) === normalizeName(opp.fields.organizationName);
      if (orgMatch) {
        const sim = titleSimilarity(candidate.title, opp.fields.title);
        if (sim >= 0.8 && (!best || sim > best.similarity)) best = { opportunity: opp, similarity: sim };
      }
    }
  }
  return best ? { kind: 'duplicate', ...best } : { kind: 'new' };
}
