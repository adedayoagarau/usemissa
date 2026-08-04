import { resolveTaxonomyPhrase, type TaxonomyFacetKey } from '@missa/taxonomy';
import type { SourceRegistry } from './types.js';
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

export interface RegistryTaxonomyAudit {
  sourceCountBefore: number;
  sourceCountAfter: number;
  mappedSources: number;
  ambiguousSources: Array<{ sourceId: string; values: string[] }>;
  unresolvedLegacyValues: Array<{ sourceId: string; values: string[] }>;
  platformOnlySources: string[];
  eligibilityLensSources: string[];
  verticalsWithoutCompatibility: string[];
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
    const values = source.disciplines ?? [];
    const ambiguous = values.filter((value) => resolveTaxonomyPhrase(value).status === 'ambiguous');
    const unresolved = values.filter((value) => resolveTaxonomyPhrase(value).status === 'unresolved');
    if (ambiguous.length) ambiguousSources.push({ sourceId: source.id, values: ambiguous });
    if (unresolved.length) unresolvedLegacyValues.push({ sourceId: source.id, values: unresolved });
    if (compatibility.sourceChannel && compatibility.taxonomyTermIds.length === 0) platformOnlySources.push(source.id);
    if (compatibility.eligibilityLens) eligibilityLensSources.push(source.id);
    if (compatibility.taxonomyTermIds.length || compatibility.sourceChannel || compatibility.eligibilityLens) mappedSources += 1;
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
  };
}
