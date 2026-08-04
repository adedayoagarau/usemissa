import { MISSA_TAXONOMY } from '@missa/taxonomy';

export const PRACTICE_OPTIONS = MISSA_TAXONOMY.terms
  .filter((term) => term.facet === 'practice-family')
  .map((term) => ({ value: term.id, label: term.preferredLabel }));

export const SUBMISSION_TAXONOMY_OPTIONS = MISSA_TAXONOMY.terms
  .filter((term) => term.selectable && ['practice-family', 'discipline', 'genre'].includes(term.facet))
  .map((term) => ({ value: term.id, label: term.preferredLabel, facet: term.facet }));

export function taxonomyLabelFor(termId: string): string {
  return MISSA_TAXONOMY.terms.find((term) => term.id === termId)?.preferredLabel ?? termId;
}
