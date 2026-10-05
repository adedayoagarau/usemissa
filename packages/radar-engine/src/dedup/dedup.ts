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
    if (opp.sourceId === candidate.sourceId) return { kind: 'same-page', opportunity: opp };
    const distinctMachineRecord = Boolean(candidate.discoveryExternalId);
    // A stable official-feed record is its own call identity. Different feed
    // records can intentionally share a title, organization, application URL,
    // or portal landing page; downstream evidence review may relate them, but
    // ingestion must not erase one before that comparison can happen.
    if (distinctMachineRecord) continue;
    if (opp.sourceUrl === candidate.url) {
      return { kind: 'same-page', opportunity: opp };
    }
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

/** A record findCanonical deliberately did not merge, but that is close enough to ask about. */
export interface DedupNearMiss {
  opportunity: Opportunity;
  similarity: number;
  reason: 'similar-title-same-organization' | 'same-title-different-organization';
}

/**
 * Optional port for an identity model (Jev) that records a same-opportunity
 * decision for each near miss. The engine awaits it but ignores its result and
 * swallows its errors, so the core stays free of database and network code and
 * dedup behaviour never changes.
 */
export type DedupIdentityDecider = (
  candidate: OpportunityCandidate,
  nearMisses: DedupNearMiss[],
) => Promise<void>;

/**
 * Pairs findCanonical's thresholds left unmerged: the same organization with a
 * title similarity in [minSimilarity, 0.8), or a highly similar title under a
 * different stated organization. Uses the same skip rules as findCanonical.
 */
export function findDedupNearMisses(
  candidate: OpportunityCandidate,
  existing: Iterable<Opportunity>,
  match: DedupMatch,
  options: { minSimilarity?: number; limit?: number } = {},
): DedupNearMiss[] {
  if (candidate.discoveryExternalId || !candidate.title) return [];
  const minSimilarity = options.minSimilarity ?? 0.5;
  const matchedId = match.kind === 'new' ? undefined : match.opportunity.id;
  const nearMisses: DedupNearMiss[] = [];
  for (const opp of existing) {
    if (opp.duplicateOfId || opp.id === matchedId) continue;
    if (opp.sourceId === candidate.sourceId || opp.sourceUrl === candidate.url) continue;
    const similarity = titleSimilarity(candidate.title, opp.fields.title);
    if (similarity < minSimilarity) continue;
    const bothNamed = Boolean(candidate.organizationName && opp.fields.organizationName);
    const sameOrg =
      bothNamed &&
      normalizeName(candidate.organizationName!) === normalizeName(opp.fields.organizationName!);
    if (sameOrg && similarity < 0.8) {
      nearMisses.push({ opportunity: opp, similarity, reason: 'similar-title-same-organization' });
    } else if (bothNamed && !sameOrg && similarity >= 0.8) {
      nearMisses.push({ opportunity: opp, similarity, reason: 'same-title-different-organization' });
    }
  }
  return nearMisses
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, options.limit ?? 3);
}
