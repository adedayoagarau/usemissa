import { MISSA_TAXONOMY } from "./catalog.js";
import type { TaxonomyFacetKey, TaxonomySeedCatalog, TaxonomySeedTerm } from "./types.js";

/**
 * Public browse language is intentionally smaller than the storage graph.
 *
 * The canonical graph keeps independent facets. Passport presents the first
 * three as a guided path so a person can move from a broad practice to a
 * discipline/genre and then to a style without seeing 1,000 terms at once.
 */
export const TAXONOMY_BROWSE_LAYERS = [
  { id: "discipline", label: "Discipline", facet: "practice-family", parentFacet: undefined },
  { id: "genre", label: "Genre", facet: "discipline", parentFacet: "practice-family" },
  { id: "style", label: "Style", facet: "genre", parentFacet: "discipline" },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  facet: TaxonomyFacetKey;
  parentFacet: TaxonomyFacetKey | undefined;
}>;

export type TaxonomyBrowseLayerId = (typeof TAXONOMY_BROWSE_LAYERS)[number]["id"];

export interface CanonicalTaxonomySelection {
  schemeVersion: number;
  termIds: string[];
  invalidTermIds: string[];
}

export function taxonomyTermById(termId: string, catalog: TaxonomySeedCatalog = MISSA_TAXONOMY): TaxonomySeedTerm | undefined {
  return catalog.terms.find((term) => term.id === termId);
}

export function taxonomyFacetForTerm(termId: string, catalog: TaxonomySeedCatalog = MISSA_TAXONOMY): TaxonomyFacetKey | undefined {
  return taxonomyTermById(termId, catalog)?.facet;
}

export function termsForFacet(facet: TaxonomyFacetKey, catalog: TaxonomySeedCatalog = MISSA_TAXONOMY): TaxonomySeedTerm[] {
  return catalog.terms.filter((term) => term.facet === facet && term.selectable);
}

export function termsForBrowseLayer(
  layerId: TaxonomyBrowseLayerId,
  parentTermId?: string,
  catalog: TaxonomySeedCatalog = MISSA_TAXONOMY,
): TaxonomySeedTerm[] {
  const layer = TAXONOMY_BROWSE_LAYERS.find((candidate) => candidate.id === layerId);
  if (!layer) return [];
  return termsForFacet(layer.facet, catalog).filter((term) => !parentTermId || term.broaderTermIds.includes(parentTermId));
}

/** Expand a selected term through all `broader -> narrower` relations. */
export function taxonomyDescendantIds(termId: string, catalog: TaxonomySeedCatalog = MISSA_TAXONOMY): string[] {
  const descendants = new Set([termId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const term of catalog.terms) {
      if (term.broaderTermIds.some((parentId) => descendants.has(parentId)) && !descendants.has(term.id)) {
        descendants.add(term.id);
        changed = true;
      }
    }
  }
  return [...descendants];
}

/**
 * Normalize URL/API selections against the same catalog used by extraction,
 * persistence and the UI. Unknown or non-selectable IDs are returned for
 * observability and never reach repository SQL.
 */
export function canonicalTaxonomySelection(
  termIds: readonly string[],
  catalog: TaxonomySeedCatalog = MISSA_TAXONOMY,
): CanonicalTaxonomySelection {
  const known = new Set(catalog.terms.filter((term) => term.selectable).map((term) => term.id));
  const unique = [...new Set(termIds)];
  return {
    schemeVersion: catalog.scheme.version,
    termIds: unique.filter((termId) => known.has(termId)),
    invalidTermIds: unique.filter((termId) => !known.has(termId)),
  };
}

export function taxonomyLabelFor(termId: string, catalog: TaxonomySeedCatalog = MISSA_TAXONOMY): string {
  return taxonomyTermById(termId, catalog)?.preferredLabel ?? termId;
}
