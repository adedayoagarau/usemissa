import type { OpportunityType, SourceKind } from '../domain/types.js';
import type { SourceRegistryEntry, SourceTier } from './types.js';

let seq = 0;

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
}

export interface CompactSource {
  name: string;
  url: string;
  verticalId: string;
  tier?: SourceTier;
  kind?: SourceKind;
  opportunityTypes?: OpportunityType[];
  disciplines?: string[];
  geography?: string[];
  checkIntervalHours?: number;
  followsOutboundLinks?: boolean;
  notes?: string;
}

const TIER_KIND: Record<SourceTier, SourceKind> = {
  0: 'organization-website',
  1: 'partner-feed',
  2: 'directory',
  3: 'feed',
};

const TIER_CADENCE: Record<SourceTier, number> = {
  0: 168,
  1: 72,
  2: 48,
  3: 24,
};

export function expandSource(
  input: CompactSource,
  defaultOpportunityTypes?: OpportunityType[],
): SourceRegistryEntry {
  const tier = input.tier ?? 0;
  const id = `src_${input.verticalId}_${slug(input.name)}_${++seq}`;
  return {
    id,
    name: input.name,
    url: input.url,
    kind: input.kind ?? TIER_KIND[tier],
    verticalId: input.verticalId,
    tier,
    opportunityTypes: input.opportunityTypes ?? defaultOpportunityTypes ?? ['open-call'],
    disciplines: input.disciplines,
    geography: input.geography,
    checkIntervalHours: input.checkIntervalHours ?? TIER_CADENCE[tier],
    active: true,
    organizationName: tier === 0 ? input.name : undefined,
    followsOutboundLinks: input.followsOutboundLinks ?? tier === 2,
    notes: input.notes,
  };
}

export function expandMany(
  inputs: CompactSource[],
  defaultOpportunityTypes?: OpportunityType[],
): SourceRegistryEntry[] {
  return inputs.map((s) => expandSource(s, defaultOpportunityTypes));
}

export function resetSourceSeq(): void {
  seq = 0;
}

export function org(
  name: string,
  url: string,
  verticalId: string,
  extra?: Omit<CompactSource, 'name' | 'url' | 'verticalId' | 'tier'>,
): CompactSource {
  return { name, url, verticalId, tier: 0, ...extra };
}

export function platform(
  name: string,
  url: string,
  verticalId: string,
  extra?: Omit<CompactSource, 'name' | 'url' | 'verticalId'>,
): CompactSource {
  return { name, url, verticalId, tier: 1, ...extra };
}

export function directory(
  name: string,
  url: string,
  verticalId: string,
  extra?: Omit<CompactSource, 'name' | 'url' | 'verticalId'>,
): CompactSource {
  return { name, url, verticalId, tier: 2, followsOutboundLinks: true, ...extra };
}

export function feed(
  name: string,
  url: string,
  verticalId: string,
  extra?: Omit<CompactSource, 'name' | 'url' | 'verticalId'>,
): CompactSource {
  return { name, url, verticalId, tier: 3, kind: 'feed', ...extra };
}
