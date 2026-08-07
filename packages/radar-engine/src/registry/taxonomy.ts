import { MISSA_TAXONOMY, resolveTaxonomyPhrase, type TaxonomyFacetKey } from '@missa/taxonomy';
import type {
  RegistryCoverageStatus,
  RegistryCoverageSummary,
  RegistryFacetCoverage,
  RegistryTermCoverage,
  SourceRegistry,
  SourceRegistryEntry,
  SourceTrust,
} from './types.js';
import { REGISTRY_VERTICALS } from './verticals.js';

export interface RegistryVerticalCompatibility {
  taxonomyTermIds: string[];
  opportunityTypes: string[];
  eligibilityLens?: string;
  sourceChannel?: string;
}

function term(label: string, facet: TaxonomyFacetKey): string | undefined {
  return resolveTaxonomyPhrase(label, facet).termId;
}

function terms(...values: unknown[]): string[] {
  const flattened = values.flat() as string[];
  const resolved: string[] = [];
  for (let index = 0; index < flattened.length; index += 2) {
    const label = flattened[index];
    const facet = flattened[index + 1] as TaxonomyFacetKey | undefined;
    if (!label || !facet) continue;
    const value = term(label, facet);
    if (value) resolved.push(value);
  }
  return resolved;
}

/** Explicit compatibility map for the legacy vertical registry. Values that
 * describe identity or platforms deliberately have no practice term. */
const COMPATIBILITY: Record<string, RegistryVerticalCompatibility> = {
  'literary-fiction': { taxonomyTermIds: terms(['Fiction', 'discipline'], ['Literary fiction', 'genre']), opportunityTypes: ['magazine', 'contest', 'open-call'] },
  poetry: { taxonomyTermIds: terms(['Poetry', 'discipline']), opportunityTypes: ['magazine', 'contest', 'award'] },
  'creative-nonfiction': { taxonomyTermIds: terms(['Creative nonfiction', 'discipline', 'Essay', 'form', 'Memoir', 'form']), opportunityTypes: ['magazine', 'contest', 'grant'] },
  'flash-hybrid': { taxonomyTermIds: terms(['Flash fiction', 'form', 'Hybrid writing', 'discipline']), opportunityTypes: ['magazine', 'contest'] },
  'novel-book': { taxonomyTermIds: terms(['Novel', 'form', 'Fiction', 'discipline']), opportunityTypes: ['contest', 'award', 'fellowship'] },
  'ya-children': { taxonomyTermIds: terms(["Young adult writing", 'discipline', "Children's writing", 'discipline']), opportunityTypes: ['magazine', 'contest', 'grant'] },
  translation: { taxonomyTermIds: terms(['Literary translation', 'discipline', 'Bilingual', 'language']), opportunityTypes: ['magazine', 'grant', 'fellowship'] },
  'writing-residency': { taxonomyTermIds: terms(['Writing & literature', 'practice-family']), opportunityTypes: ['residency', 'fellowship'] },
  'science-nature-writing': { taxonomyTermIds: terms(['Science writing', 'genre', 'Nature writing', 'form']), opportunityTypes: ['magazine', 'grant', 'fellowship'] },
  'literary-festivals': { taxonomyTermIds: terms(['Writing & literature', 'practice-family']), opportunityTypes: ['festival', 'open-call', 'pitch'] },
  'visual-residency': { taxonomyTermIds: terms(['Visual arts', 'practice-family']), opportunityTypes: ['residency', 'fellowship'] },
  'visual-open-call': { taxonomyTermIds: terms(['Painting', 'discipline', 'Sculpture', 'discipline', 'Installation art', 'discipline']), opportunityTypes: ['open-call', 'contest', 'award'] },
  photography: { taxonomyTermIds: terms(['Photography', 'practice-family', 'Photography', 'discipline']), opportunityTypes: ['contest', 'open-call', 'magazine', 'grant'] },
  'public-art': { taxonomyTermIds: terms(['Public art', 'discipline']), opportunityTypes: ['rfp', 'open-call', 'grant'] },
  'printmaking-ceramics': { taxonomyTermIds: terms(['Printmaking', 'discipline', 'Ceramics', 'discipline', 'Fibre art', 'discipline', 'Glass art', 'discipline']), opportunityTypes: ['residency', 'open-call', 'contest'] },
  curatorial: { taxonomyTermIds: terms(['Curating', 'discipline', 'Criticism', 'discipline']), opportunityTypes: ['open-call', 'fellowship', 'grant'] },
  'theater-playwriting': { taxonomyTermIds: terms(['Theatre & dramatic arts', 'practice-family', 'Playwriting', 'discipline']), opportunityTypes: ['contest', 'festival', 'residency', 'open-call'] },
  'dance-choreography': { taxonomyTermIds: terms(['Dance & choreography', 'practice-family', 'Choreography', 'discipline']), opportunityTypes: ['residency', 'grant', 'festival'] },
  'performance-art': { taxonomyTermIds: terms(['Performance & live art', 'practice-family', 'Performance art', 'discipline']), opportunityTypes: ['open-call', 'festival', 'residency'] },
  'film-festival': { taxonomyTermIds: terms(['Film & moving image', 'practice-family']), opportunityTypes: ['festival', 'contest'] },
  screenwriting: { taxonomyTermIds: terms(['Screenwriting', 'discipline']), opportunityTypes: ['contest', 'fellowship', 'pitch'] },
  documentary: { taxonomyTermIds: terms(['Documentary filmmaking', 'discipline']), opportunityTypes: ['grant', 'festival', 'fellowship'] },
  'animation-new-media': { taxonomyTermIds: terms(['Animation', 'discipline', 'Digital, interactive & immersive arts', 'practice-family']), opportunityTypes: ['festival', 'grant', 'residency'] },
  'music-composition': { taxonomyTermIds: terms(['Music & sound', 'practice-family', 'Composition', 'discipline', 'Sound art', 'discipline']), opportunityTypes: ['grant', 'residency', 'fellowship', 'contest'] },
  'grants-us-national': { taxonomyTermIds: [], opportunityTypes: ['grant', 'fellowship'], sourceChannel: 'funder-collection' },
  'grants-us-state': { taxonomyTermIds: [], opportunityTypes: ['grant', 'fellowship'], sourceChannel: 'funder-collection' },
  'grants-international': { taxonomyTermIds: [], opportunityTypes: ['grant', 'fellowship', 'scholarship'], sourceChannel: 'funder-collection' },
  fellowships: { taxonomyTermIds: [], opportunityTypes: ['fellowship', 'residency'], sourceChannel: 'funder-collection' },
  scholarships: { taxonomyTermIds: [], opportunityTypes: ['scholarship', 'award'], sourceChannel: 'funder-collection' },
  'awards-prizes': { taxonomyTermIds: [], opportunityTypes: ['award', 'contest'], sourceChannel: 'award-collection' },
  'arts-festivals': { taxonomyTermIds: terms(['Interdisciplinary, hybrid & emerging practice', 'practice-family']), opportunityTypes: ['festival', 'open-call'] },
  'conference-cfp': { taxonomyTermIds: terms(['Research & knowledge production', 'practice-family']), opportunityTypes: ['conference', 'rfp'] },
  'museum-gallery': { taxonomyTermIds: terms(['Visual arts', 'practice-family', 'Curating', 'discipline']), opportunityTypes: ['open-call', 'rfp', 'fellowship'] },
  'comics-illustration': { taxonomyTermIds: terms(['Illustration, comics & sequential art', 'practice-family', 'Comics', 'discipline']), opportunityTypes: ['magazine', 'contest', 'grant', 'open-call'] },
  'craft-design': { taxonomyTermIds: terms(['Craft & material arts', 'practice-family', 'Design', 'practice-family']), opportunityTypes: ['grant', 'open-call', 'residency'] },
  'architecture-built': { taxonomyTermIds: terms(['Architecture, spatial practice & public realm', 'practice-family', 'Architecture', 'discipline']), opportunityTypes: ['rfp', 'contest', 'fellowship'] },
  'bipoc-focused': { taxonomyTermIds: [], opportunityTypes: ['grant', 'residency', 'magazine', 'fellowship'], eligibilityLens: 'bipoc-focused' },
  'lgbtq-focused': { taxonomyTermIds: [], opportunityTypes: ['magazine', 'grant', 'residency'], eligibilityLens: 'lgbtq-focused' },
  'disability-arts': { taxonomyTermIds: [], opportunityTypes: ['grant', 'residency', 'open-call'], eligibilityLens: 'disability-arts' },
  'indigenous-arts': { taxonomyTermIds: [], opportunityTypes: ['grant', 'fellowship', 'residency'], eligibilityLens: 'indigenous-arts' },
  'platform-submittable': { taxonomyTermIds: [], opportunityTypes: ['open-call', 'grant', 'contest', 'magazine'], sourceChannel: 'platform-submittable' },
  'platform-cafe': { taxonomyTermIds: terms(['Visual arts', 'practice-family', 'Public art', 'discipline']), opportunityTypes: ['open-call', 'contest', 'award'], sourceChannel: 'platform-cafe' },
  'platform-filmfreeway': { taxonomyTermIds: terms(['Film & moving image', 'practice-family']), opportunityTypes: ['festival', 'contest'], sourceChannel: 'platform-filmfreeway' },
  'platform-duotrope': { taxonomyTermIds: terms(['Writing & literature', 'practice-family']), opportunityTypes: ['magazine', 'contest'], sourceChannel: 'platform-duotrope' },
  'platform-chill-subs': { taxonomyTermIds: terms(['Writing & literature', 'practice-family']), opportunityTypes: ['magazine', 'contest'], sourceChannel: 'platform-chill-subs' },
  'platform-resartis': { taxonomyTermIds: terms(['Visual arts', 'practice-family']), opportunityTypes: ['residency', 'open-call'], sourceChannel: 'platform-resartis' },
  'platform-transartists': { taxonomyTermIds: terms(['Visual arts', 'practice-family']), opportunityTypes: ['residency'], sourceChannel: 'platform-transartists' },
  'platform-poets-writers': { taxonomyTermIds: terms(['Writing & literature', 'practice-family']), opportunityTypes: ['contest', 'grant', 'magazine'], sourceChannel: 'platform-poets-writers' },
  'platform-opportunity-feeds': { taxonomyTermIds: [], opportunityTypes: ['open-call', 'grant'], sourceChannel: 'opportunity-feed' },
};

export function registryVerticalCompatibility(verticalId: string): RegistryVerticalCompatibility {
  return COMPATIBILITY[verticalId] ?? { taxonomyTermIds: [], opportunityTypes: [] };
}

/** Resolve legacy source labels only when the shared resolver has a safe
 * answer. Ambiguous labels remain in the audit and are not guessed into a
 * canonical term. */
export function registryTaxonomyTermIds(entry: SourceRegistryEntry): string[] {
  const vertical = REGISTRY_VERTICALS.find((candidate) => candidate.id === entry.verticalId);
  const labels = entry.disciplines ?? vertical?.disciplines ?? [];
  const resolved = labels.flatMap((label) => {
    const result = resolveTaxonomyPhrase(label);
    return result.status === 'resolved' || result.status === 'deprecated' ? result.termId ? [result.termId] : [] : [];
  });
  return [...new Set([
    ...registryVerticalCompatibility(entry.verticalId).taxonomyTermIds,
    ...(entry.taxonomyTermIds ?? []),
    ...resolved,
  ])];
}

/** The default trust posture is deliberately conservative. Registry curation
 * is evidence that a source is worth monitoring; it is not a live claim that
 * every page or deadline published by that source is current. */
export function defaultSourceTrust(entry: Pick<SourceRegistryEntry, 'tier' | 'kind'>): SourceTrust {
  if (entry.tier === 0) return { status: 'curated', authorityKind: 'official-source', score: 80 };
  if (entry.tier === 1) return { status: 'curated', authorityKind: 'platform', score: 70 };
  if (entry.tier === 2) return { status: 'needs-review', authorityKind: 'directory', score: 50 };
  return { status: 'needs-review', authorityKind: entry.kind === 'feed' || entry.kind === 'newsletter' ? 'feed' : 'other', score: 40 };
}

export function trustedSource(entry: SourceRegistryEntry): boolean {
  const trust = entry.trust ?? defaultSourceTrust(entry);
  return entry.active && (trust.status === 'curated' || trust.status === 'verified') && trust.score >= 60;
}

function coverageStatus(sourceCount: number, trustedSourceCount: number): RegistryCoverageStatus {
  if (trustedSourceCount >= 3) return 'covered';
  if (trustedSourceCount > 0 || sourceCount > 0) return 'thin';
  return 'gap';
}

/** Build coverage for every selectable taxonomy term, including terms with no
 * current source. Gaps are first-class output for bounded discovery. */
export function buildRegistryCoverage(registry: Pick<SourceRegistry, 'sources'>): RegistryCoverageSummary {
  const counts = new Map<string, { sourceCount: number; canonicalSourceCount: number; trustedSourceCount: number }>();
  for (const source of registry.sources) {
    const isTrusted = trustedSource(source);
    for (const termId of new Set(source.taxonomyTermIds ?? [])) {
      const current = counts.get(termId) ?? { sourceCount: 0, canonicalSourceCount: 0, trustedSourceCount: 0 };
      current.sourceCount += 1;
      if (source.tier === 0) current.canonicalSourceCount += 1;
      if (isTrusted) current.trustedSourceCount += 1;
      counts.set(termId, current);
    }
  }
  const terms: RegistryTermCoverage[] = MISSA_TAXONOMY.terms.filter((term) => term.selectable).map((term) => {
    const count = counts.get(term.id) ?? { sourceCount: 0, canonicalSourceCount: 0, trustedSourceCount: 0 };
    return { termId: term.id, facet: term.facet, label: term.preferredLabel, ...count, status: coverageStatus(count.sourceCount, count.trustedSourceCount) };
  });
  const byFacet: Record<string, RegistryFacetCoverage> = {};
  for (const term of terms) {
    const facet = byFacet[term.facet] ?? { totalTerms: 0, coveredTerms: 0, thinTerms: 0, gapTerms: 0 };
    facet.totalTerms += 1;
    if (term.status === 'covered') facet.coveredTerms += 1;
    else if (term.status === 'thin') facet.thinTerms += 1;
    else facet.gapTerms += 1;
    byFacet[term.facet] = facet;
  }
  return {
    schemeVersion: MISSA_TAXONOMY.scheme.version,
    totalTerms: terms.length,
    coveredTerms: terms.filter((term) => term.status === 'covered').length,
    thinTerms: terms.filter((term) => term.status === 'thin').length,
    gapTerms: terms.filter((term) => term.status === 'gap').length,
    byFacet,
    terms,
  };
}

export interface RegistryTaxonomyAudit {
  sourceCountBefore: number;
  sourceCountAfter: number;
  mappedSources: number;
  ambiguousSources: Array<{ sourceId: string; values: string[] }>;
  unresolvedLegacyValues: Array<{ sourceId: string; values: string[] }>;
  platformOnlySources: string[];
  eligibilityLensSources: string[];
  verticalsWithoutCompatibility: string[];
  coverage: RegistryCoverageSummary;
}

/** Read-only migration audit. It never removes or relabels registry entries. */
export function auditRegistryTaxonomy(registry: SourceRegistry): RegistryTaxonomyAudit {
  const ambiguousSources: RegistryTaxonomyAudit['ambiguousSources'] = [];
  const unresolvedLegacyValues: RegistryTaxonomyAudit['unresolvedLegacyValues'] = [];
  const platformOnlySources: string[] = [];
  const eligibilityLensSources: string[] = [];
  let mappedSources = 0;
  for (const source of registry.sources) {
    const compatibility = registryVerticalCompatibility(source.verticalId);
    const vertical = REGISTRY_VERTICALS.find((candidate) => candidate.id === source.verticalId);
    const values = source.disciplines ?? vertical?.disciplines ?? [];
    const ambiguous = values.filter((value) => resolveTaxonomyPhrase(value).status === 'ambiguous');
    const unresolved = values.filter((value) => resolveTaxonomyPhrase(value).status === 'unresolved');
    if (ambiguous.length) ambiguousSources.push({ sourceId: source.id, values: ambiguous });
    if (unresolved.length) unresolvedLegacyValues.push({ sourceId: source.id, values: unresolved });
    if (compatibility.sourceChannel && !(source.taxonomyTermIds?.length ?? compatibility.taxonomyTermIds.length)) platformOnlySources.push(source.id);
    if (compatibility.eligibilityLens) eligibilityLensSources.push(source.id);
    if ((source.taxonomyTermIds?.length ?? 0) || compatibility.sourceChannel || compatibility.eligibilityLens) mappedSources += 1;
  }
  return {
    sourceCountBefore: registry.sources.length,
    sourceCountAfter: registry.sources.length,
    mappedSources,
    ambiguousSources,
    unresolvedLegacyValues,
    platformOnlySources,
    eligibilityLensSources,
    verticalsWithoutCompatibility: REGISTRY_VERTICALS.map((vertical) => vertical.id).filter((id) => !(id in COMPATIBILITY)),
    coverage: registry.coverage ?? buildRegistryCoverage(registry),
  };
}
