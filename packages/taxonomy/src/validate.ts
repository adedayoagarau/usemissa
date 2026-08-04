import {
  TAXONOMY_FACET_KEYS,
  type TaxonomyFacetKey,
  type TaxonomySeedCatalog,
  type TaxonomyValidationResult,
} from "./types.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeLabel(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function validateTaxonomyCatalog(
  catalog: TaxonomySeedCatalog,
): TaxonomyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const counts = Object.fromEntries(
    TAXONOMY_FACET_KEYS.map((key) => [key, 0]),
  ) as Record<TaxonomyFacetKey, number>;
  const facetKeys = new Set(catalog.facets.map((facet) => facet.key));
  const termIds = new Set<string>();
  const facetSlugs = new Set<string>();
  const termById = new Map(catalog.terms.map((term) => [term.id, term]));

  for (const key of TAXONOMY_FACET_KEYS) {
    if (!facetKeys.has(key)) errors.push(`Missing facet: ${key}`);
  }
  if (facetKeys.size !== catalog.facets.length) {
    errors.push("Facet keys must be unique");
  }

  for (const term of catalog.terms) {
    counts[term.facet] += 1;
    if (termIds.has(term.id)) errors.push(`Duplicate term ID: ${term.id}`);
    termIds.add(term.id);
    if (!SLUG_PATTERN.test(term.slug)) {
      errors.push(`Invalid slug for ${term.id}: ${term.slug}`);
    }
    const facetSlug = `${term.facet}:${term.slug}`;
    if (facetSlugs.has(facetSlug)) {
      errors.push(`Duplicate facet slug: ${facetSlug}`);
    }
    facetSlugs.add(facetSlug);
    if (!term.preferredLabel.trim()) {
      errors.push(`Missing preferred label: ${term.id}`);
    }
    const seenLabels = new Set<string>();
    for (const label of [term.preferredLabel, ...term.aliases]) {
      const normalized = normalizeLabel(label);
      if (!normalized) errors.push(`Empty normalized label on ${term.id}`);
      if (seenLabels.has(normalized)) {
        errors.push(`Duplicate alias on ${term.id}: ${label}`);
      }
      seenLabels.add(normalized);
    }
  }

  for (const term of catalog.terms) {
    for (const broaderId of term.broaderTermIds) {
      if (!termById.has(broaderId)) {
        errors.push(`Unknown broader term ${broaderId} on ${term.id}`);
      }
      if (broaderId === term.id) {
        errors.push(`Term cannot be broader than itself: ${term.id}`);
      }
    }
    if (term.facet === "discipline" && term.broaderTermIds.length === 0) {
      errors.push(`Discipline has no practice-family parent: ${term.id}`);
    }
    if (term.facet === "subgenre") {
      const hasGenreParent = term.broaderTermIds.some(
        (id) => termById.get(id)?.facet === "genre",
      );
      if (!hasGenreParent) {
        errors.push(`Subgenre has no genre parent: ${term.id}`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      errors.push(`Broader-term cycle detected at ${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const parentId of termById.get(id)?.broaderTermIds ?? [])
      visit(parentId);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of termIds) visit(id);

  if (counts["practice-family"] < 19) {
    errors.push("The seed must contain all 19 practice families");
  }
  if (catalog.terms.length < 300) {
    warnings.push(
      `The seed has ${catalog.terms.length} terms; comprehensive launch target is 300+`,
    );
  }

  return { valid: errors.length === 0, errors, warnings, counts };
}
