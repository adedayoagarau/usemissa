import {
  resolveTaxonomyPhrase,
  type TaxonomyFacetKey,
} from '@missa/taxonomy';
import type { TaxonomyAssignmentProposal } from '../domain/types.js';

/** Resolve source wording without ever promoting an ambiguous phrase. */
export function taxonomyAssignmentsForPhrases(
  phrases: string[],
  preferredFacet?: TaxonomyFacetKey,
): TaxonomyAssignmentProposal[] {
  const seen = new Set<string>();
  const assignments: TaxonomyAssignmentProposal[] = [];
  for (const sourcePhrase of phrases.map((value) => value.trim()).filter(Boolean)) {
    const key = sourcePhrase.toLocaleLowerCase('en');
    if (seen.has(key)) continue;
    seen.add(key);
    const resolution = resolveTaxonomyPhrase(sourcePhrase, preferredFacet);
    const selected = resolution.candidates[0];
    assignments.push({
      facet: selected?.facet ?? preferredFacet ?? 'discipline',
      sourcePhrase: resolution.sourcePhrase,
      normalizedPhrase: resolution.normalizedPhrase,
      candidateTermIds: resolution.candidates.map((candidate) => candidate.termId),
      termId: resolution.termId,
      mapping: selected?.mapping ?? 'close',
      confidence: selected?.confidence ?? 0,
      certainty: resolution.status === 'resolved' && resolution.termId ? 'inferred' : 'unknown',
      reason: resolution.reason,
    });
  }
  const seenTerms = new Set<string>();
  return assignments.filter((assignment) => {
    if (!assignment.termId) return true;
    const key = `${assignment.facet}:${assignment.termId}`;
    if (seenTerms.has(key)) return false;
    seenTerms.add(key);
    return true;
  });
}
