export const TAXONOMY_FACET_KEYS = [
  "practice-family",
  "discipline",
  "form",
  "genre",
  "subgenre",
  "medium",
  "technique",
  "mode",
  "role",
  "theme",
  "audience",
  "language",
] as const;

export type TaxonomyFacetKey = (typeof TAXONOMY_FACET_KEYS)[number];

export type TaxonomySelectionMode = "single" | "multiple" | "hierarchical";

export interface TaxonomySeedFacet {
  id: string;
  key: TaxonomyFacetKey;
  label: string;
  description: string;
  selectionMode: TaxonomySelectionMode;
  userVisible: boolean;
  sortOrder: number;
}

export interface TaxonomySeedTerm {
  id: string;
  facet: TaxonomyFacetKey;
  slug: string;
  preferredLabel: string;
  description?: string;
  aliases: string[];
  broaderTermIds: string[];
  culturallySensitive: boolean;
  selectable: boolean;
}

export interface TaxonomySeedCatalog {
  scheme: {
    id: string;
    key: string;
    label: string;
    description: string;
    version: number;
  };
  facets: TaxonomySeedFacet[];
  terms: TaxonomySeedTerm[];
}

export interface TaxonomyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  counts: Record<TaxonomyFacetKey, number>;
}
