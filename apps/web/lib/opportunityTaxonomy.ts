import { assembleRegistry } from '@missa/radar-engine';
import { MISSA_TAXONOMY, taxonomyFacetForTerm, taxonomyLabelFor as canonicalTaxonomyLabelFor, termsForFacet as canonicalTermsForFacet, type TaxonomyFacetKey, type TaxonomySeedTerm } from '@missa/taxonomy';

function labelFor(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const registry = assembleRegistry();

/**
 * The filter vocabulary is derived from the same registry that powers Radar.
 * Keeping this here prevents the browse UI from quietly becoming a literary-
 * only directory as new niches are added to the source graph.
 */
export const DISCIPLINE_OPTIONS = [...new Set(
  MISSA_TAXONOMY.terms.filter((term) => term.facet === 'discipline').map((term) => term.id),
)]
  .map((value) => {
    const term = MISSA_TAXONOMY.terms.find((candidate) => candidate.id === value)!;
    return { value, label: term.preferredLabel };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

export const PRACTICE_OPTIONS = MISSA_TAXONOMY.terms
  .filter((term) => term.facet === 'practice-family')
  .map((term) => ({ value: term.id, label: term.preferredLabel }));

/**
 * Browse uses friendlier language than the storage facets. The public
 * “Discipline” control starts at practice families, “Genre” narrows to
 * canonical disciplines (Poetry, Fiction, Creative nonfiction, …), and
 * “Style” uses canonical genre terms (Epic poetry, Literary fiction, …).
 * The distinction remains explicit in the taxonomy graph.
 */
export const GENRE_OPTIONS = MISSA_TAXONOMY.terms
  .filter((term) => term.facet === 'form')
  .map((term) => ({ value: term.id, label: term.preferredLabel, broaderTermIds: term.broaderTermIds }));

export const STYLE_OPTIONS = MISSA_TAXONOMY.terms
  .filter((term) => term.facet === 'genre')
  .map((term) => ({ value: term.id, label: term.preferredLabel, broaderTermIds: term.broaderTermIds }));

export const TAXONOMY_TERMS = MISSA_TAXONOMY.terms;

export function termsForFacet(facet: TaxonomyFacetKey): TaxonomySeedTerm[] {
  return canonicalTermsForFacet(facet, MISSA_TAXONOMY);
}

export function childTermsFor(parentId: string | undefined, facet: TaxonomyFacetKey): TaxonomySeedTerm[] {
  if (!parentId) return [];
  return termsForFacet(facet).filter((term) => term.broaderTermIds.includes(parentId));
}

export function taxonomyLabelFor(termId: string): string {
  return canonicalTaxonomyLabelFor(termId, MISSA_TAXONOMY) || labelFor(termId);
}

export function taxonomyFacetFor(termId: string): TaxonomyFacetKey | undefined {
  return taxonomyFacetForTerm(termId, MISSA_TAXONOMY);
}

/** ISO/region values represented by registry sources, kept as query values. */
export const LOCATION_OPTIONS = [...new Set(
  registry.sources.flatMap((source) => source.geography ?? []),
)]
  .sort((a, b) => a.localeCompare(b))
  .map((value) => ({ value, label: value === 'global' ? 'Worldwide' : labelFor(value) }));
