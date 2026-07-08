import type { Opportunity } from '../domain/types.js';

export interface SearchFilters {
  types?: Opportunity['fields']['type'][];
  genres?: string[];
  verifiedOnly?: boolean;
}

export interface SearchResult {
  opportunity: Opportunity;
  score: number;
  matchedFields: string[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/** Per-opportunity searchable text, weighted by field importance (title counted twice). */
function indexFields(opp: Opportunity): { title: string; organizationName: string; genres: string; eligibility: string } {
  const f = opp.fields;
  return {
    title: f.title,
    organizationName: f.organizationName ?? '',
    genres: f.genres.join(' '),
    eligibility: f.eligibility.map((r) => `${r.key} ${r.value ?? ''}`).join(' '),
  };
}

/**
 * In-memory, tokenized, relevance-ranked search over the opportunity registry.
 * The primary store is still read-whole/write-whole (in-memory or JSON-file
 * first, Postgres adapter mirrors it), so this is a full in-memory scan rather
 * than an index — fine at the current registry scale (thousands, not millions,
 * of rows). A true Postgres tsvector/tsquery implementation is deferred: it
 * would need a different access pattern (querying the DB directly instead of
 * the loaded store) than every other read path in this codebase uses today,
 * so it's out of scope until the store model itself changes.
 */
export function searchOpportunities(
  opportunities: Iterable<Opportunity>,
  query: string,
  filters?: SearchFilters,
): SearchResult[] {
  const queryTokens = tokenize(query);
  const results: SearchResult[] = [];

  for (const opp of opportunities) {
    if (filters?.types?.length && !filters.types.includes(opp.fields.type)) continue;
    if (filters?.genres?.length && !opp.fields.genres.some((g) => filters.genres!.includes(g))) continue;
    if (filters?.verifiedOnly && !opp.claimedByOrganizationId && opp.scores.trust < 60) continue;

    if (queryTokens.length === 0) {
      results.push({ opportunity: opp, score: 0, matchedFields: [] });
      continue;
    }

    const fields = indexFields(opp);
    const fieldTokens: Record<string, string[]> = {
      title: tokenize(fields.title),
      organizationName: tokenize(fields.organizationName),
      genres: tokenize(fields.genres),
      eligibility: tokenize(fields.eligibility),
    };
    const weights: Record<string, number> = { title: 3, organizationName: 2, genres: 2, eligibility: 1 };

    let score = 0;
    const matchedFields: string[] = [];
    for (const [field, tokens] of Object.entries(fieldTokens)) {
      let fieldHits = 0;
      for (const qt of queryTokens) {
        if (tokens.some((t) => t === qt)) fieldHits += 2;
        else if (tokens.some((t) => t.startsWith(qt) || qt.startsWith(t))) fieldHits += 1;
      }
      if (fieldHits > 0) {
        score += fieldHits * weights[field];
        matchedFields.push(field);
      }
    }

    if (score > 0) results.push({ opportunity: opp, score, matchedFields });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
