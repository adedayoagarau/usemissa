import { assembleRegistry } from '@missa/radar-engine';
import { MISSA_TAXONOMY, type TaxonomyFacetKey } from '@missa/taxonomy';

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

export const GENRE_OPTIONS = MISSA_TAXONOMY.terms
  .filter((term) => term.facet === 'genre')
  .map((term) => ({ value: term.id, label: term.preferredLabel }));

export function taxonomyLabelFor(termId: string): string {
  return MISSA_TAXONOMY.terms.find((term) => term.id === termId)?.preferredLabel ?? labelFor(termId);
}

export function taxonomyFacetFor(termId: string): TaxonomyFacetKey | undefined {
  return MISSA_TAXONOMY.terms.find((term) => term.id === termId)?.facet;
}

/** ISO/region values represented by registry sources, kept as query values. */
export const LOCATION_OPTIONS = [...new Set(
  registry.sources.flatMap((source) => source.geography ?? []),
)]
  .sort((a, b) => a.localeCompare(b))
  .map((value) => ({ value, label: value === 'global' ? 'Worldwide' : labelFor(value) }));
