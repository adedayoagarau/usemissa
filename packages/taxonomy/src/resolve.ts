import { MISSA_TAXONOMY } from "./catalog.js";
import type {
  TaxonomyFacetKey,
  TaxonomySeedCatalog,
  TaxonomySeedTerm,
} from "./types.js";

/** A candidate returned by the resolver. It is intentionally not a single
 * answer: callers must decide whether an ambiguous mapping is safe to use. */
export interface TaxonomyResolutionCandidate {
  termId: string;
  facet: TaxonomyFacetKey;
  preferredLabel: string;
  mapping: "exact" | "close" | "broad" | "narrow" | "legacy";
  confidence: number;
  reason: string;
}

export interface TaxonomyResolution {
  sourcePhrase: string;
  normalizedPhrase: string;
  schemeVersion: number;
  status: "resolved" | "ambiguous" | "unresolved" | "deprecated";
  candidates: TaxonomyResolutionCandidate[];
  /** Set only when one candidate is safe to use. */
  termId?: string;
  reason: string;
}

export interface TaxonomyExternalMapping {
  namespace: string;
  externalValue: string;
  termId: string;
  mapping: "exact" | "close" | "broad" | "narrow" | "legacy" | "unresolved";
  confidence: number;
}

export interface TaxonomyResolverOptions {
  catalog?: TaxonomySeedCatalog;
  externalMappings?: TaxonomyExternalMapping[];
  deprecatedReplacements?: Record<string, string>;
}

export function normalizeTaxonomyPhrase(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = a[i - 1] === b[j - 1]
        ? diagonal
        : Math.min(diagonal + 1, row[j] + 1, row[j - 1] + 1);
      diagonal = above;
    }
  }
  return row[b.length];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (b.length >= 5 && (a.includes(b) || b.includes(a))) return 0.88;
  const distance = editDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length, 1);
}

interface IndexedTerm extends TaxonomySeedTerm {
  normalizedLabels: string[];
}

/** One shared, immutable resolver for Radar, Passport, Workspace and importers. */
export class TaxonomyResolver {
  readonly catalog: TaxonomySeedCatalog;
  private readonly termsById: Map<string, IndexedTerm>;
  private readonly byLabel: Map<string, IndexedTerm[]>;
  private readonly externalByValue: Map<string, TaxonomyExternalMapping[]>;
  private readonly replacements: Record<string, string>;

  constructor(options: TaxonomyResolverOptions = {}) {
    this.catalog = options.catalog ?? MISSA_TAXONOMY;
    this.termsById = new Map();
    this.byLabel = new Map();
    this.externalByValue = new Map();
    this.replacements = options.deprecatedReplacements ?? {};

    for (const term of this.catalog.terms) {
      const labels = [term.preferredLabel, term.slug, ...term.aliases]
        .map(normalizeTaxonomyPhrase)
        .filter(Boolean);
      const indexed = { ...term, normalizedLabels: labels };
      this.termsById.set(term.id, indexed);
      for (const label of new Set(labels)) {
        const entries = this.byLabel.get(label) ?? [];
        entries.push(indexed);
        this.byLabel.set(label, entries);
      }
    }
    for (const mapping of options.externalMappings ?? []) {
      const key = `${mapping.namespace}:${normalizeTaxonomyPhrase(mapping.externalValue)}`;
      const entries = this.externalByValue.get(key) ?? [];
      entries.push(mapping);
      this.externalByValue.set(key, entries);
    }
  }

  resolve(sourcePhrase: string, facet?: TaxonomyFacetKey): TaxonomyResolution {
    const normalizedPhrase = normalizeTaxonomyPhrase(sourcePhrase);
    const direct = this.termsById.get(sourcePhrase);
    if (direct) return this.result(sourcePhrase, normalizedPhrase, [this.candidate(direct, "exact", 100, "Stable term ID")], "resolved", "Stable term ID");
    if (!normalizedPhrase) return this.result(sourcePhrase, normalizedPhrase, [], "unresolved", "The source phrase is empty after normalization");

    const exact = (this.byLabel.get(normalizedPhrase) ?? []).filter((term) => !facet || term.facet === facet);
    if (exact.length > 0) {
      const candidates = exact.map((term) => this.candidate(term, "exact", 100, "Preferred label, alias, or slug match"));
      if (!facet && ["film", "performance", "short", "hybrid", "installation"].includes(normalizedPhrase)) {
        for (const term of this.termsById.values()) {
          if (exact.some((candidate) => candidate.id === term.id) || term.facet === exact[0].facet) continue;
          if (term.normalizedLabels.some((label) => label.includes(normalizedPhrase))) {
            candidates.push(this.candidate(term, "broad", 82, "Broad phrase appears in another facet"));
          }
        }
      }
      return this.finish(sourcePhrase, normalizedPhrase, candidates);
    }

    const external = [...this.externalByValue.entries()]
      .filter(([key]) => key.endsWith(`:${normalizedPhrase}`))
      .flatMap(([, mappings]) => mappings)
      .map((mapping) => this.termsById.get(mapping.termId))
      .filter((term): term is IndexedTerm => term !== undefined && (!facet || term.facet === facet));
    if (external.length > 0) {
      const candidates = external.map((term) => this.candidate(term, "legacy", 90, "External or legacy mapping"));
      return this.finish(sourcePhrase, normalizedPhrase, candidates);
    }

    const close: TaxonomyResolutionCandidate[] = [];
    for (const term of this.termsById.values()) {
      if (facet && term.facet !== facet) continue;
      const score = Math.max(...term.normalizedLabels.map((label) => similarity(normalizedPhrase, label)));
      if (score < 0.78) continue;
      const mapping = normalizedPhrase.length < term.normalizedLabels[0].length ? "broad" : "narrow";
      close.push(this.candidate(term, "close", Math.round(score * 100), `Close ${mapping} label match`));
    }
    close.sort((a, b) => b.confidence - a.confidence || a.termId.localeCompare(b.termId));
    return this.finish(sourcePhrase, normalizedPhrase, close.slice(0, 8));
  }

  private finish(sourcePhrase: string, normalizedPhrase: string, candidates: TaxonomyResolutionCandidate[]): TaxonomyResolution {
    const unique = [...new Map(candidates.map((candidate) => [candidate.termId, candidate])).values()];
    const replacement = unique.find((candidate) => this.replacements[candidate.termId]);
    if (replacement) {
      const replacementTerm = this.termsById.get(this.replacements[replacement.termId]);
      if (replacementTerm) {
        return this.result(sourcePhrase, normalizedPhrase, [
          this.candidate(replacementTerm, "legacy", replacement.confidence, `Deprecated term replaced by ${replacementTerm.preferredLabel}`),
        ], "deprecated", `Deprecated term replaced by ${replacementTerm.preferredLabel}`);
      }
    }
    if (unique.length === 1 && unique[0].mapping !== "close") return this.result(sourcePhrase, normalizedPhrase, unique, "resolved", unique[0].reason);
    if (unique.length === 1 && unique[0].confidence >= 92) return this.result(sourcePhrase, normalizedPhrase, unique, "resolved", unique[0].reason);
    if (unique.length > 1) return this.result(sourcePhrase, normalizedPhrase, unique, "ambiguous", "More than one facet or term is plausible; caller must choose");
    return this.result(sourcePhrase, normalizedPhrase, [], "unresolved", "No canonical term or approved mapping matched");
  }

  private result(sourcePhrase: string, normalizedPhrase: string, candidates: TaxonomyResolutionCandidate[], status: TaxonomyResolution["status"], reason: string): TaxonomyResolution {
    return {
      sourcePhrase,
      normalizedPhrase,
      schemeVersion: this.catalog.scheme.version,
      status,
      candidates,
      termId: status === "resolved" ? candidates[0]?.termId : undefined,
      reason,
    };
  }

  private candidate(term: IndexedTerm, mapping: TaxonomyResolutionCandidate["mapping"], confidence: number, reason: string): TaxonomyResolutionCandidate {
    return { termId: term.id, facet: term.facet, preferredLabel: term.preferredLabel, mapping, confidence, reason };
  }
}

export const defaultTaxonomyResolver = new TaxonomyResolver();

export function resolveTaxonomyPhrase(sourcePhrase: string, facet?: TaxonomyFacetKey): TaxonomyResolution {
  return defaultTaxonomyResolver.resolve(sourcePhrase, facet);
}

export function resolveTaxonomyTermId(termId: string): TaxonomyResolution {
  return defaultTaxonomyResolver.resolve(termId);
}
