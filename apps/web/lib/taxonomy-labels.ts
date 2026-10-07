import type { TaxonomyFacetKey } from '@missa/contracts';

// Customer-facing names for taxonomy facet keys. Facet keys and the catalog's
// internal facet labels stay in code; render these instead. Follows
// docs/missa-content-style-guide.md §16.1 and docs/missa-content-quick-reference.md.
export const TAXONOMY_FACET_LABELS: Record<TaxonomyFacetKey, string> = {
  'practice-family': 'What you make',
  discipline: 'Discipline',
  form: 'Form',
  genre: 'Genre',
  subgenre: 'Subgenre',
  medium: 'Medium',
  technique: 'Technique or process',
  mode: 'Mode or approach',
  role: 'Role',
  theme: 'Theme or subject',
  audience: 'Audience',
  language: 'Language',
};

const FALLBACK_LABEL = 'Details';

export function taxonomyFacetLabel(facet: string): string {
  return Object.hasOwn(TAXONOMY_FACET_LABELS, facet) ? TAXONOMY_FACET_LABELS[facet as TaxonomyFacetKey] : FALLBACK_LABEL;
}
