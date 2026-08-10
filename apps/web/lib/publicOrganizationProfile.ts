import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import { MISSA_TAXONOMY, type TaxonomyFacetKey } from '@missa/taxonomy';

const publicPracticeFacets = new Set<TaxonomyFacetKey>(['practice-family', 'discipline', 'form', 'medium', 'audience', 'language']);

export function organizationMonogram(name: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  if (!parts.length) return 'O';
  return (parts.length === 1 ? parts[0]!.slice(0, 2) : `${parts[0]![0] ?? ''}${parts.at(-1)![0] ?? ''}`).toLocaleUpperCase('en');
}

export function publicDeadlineLabel(opportunity?: OpportunityBrowseProjection | null): string {
  if (!opportunity) return 'Deadline not linked';
  if (opportunity.deadline.kind === 'rolling') return opportunity.deadline.raw?.trim() || 'Rolling deadline';
  if (opportunity.deadline.date) return `Deadline ${opportunity.deadline.date}`;
  return opportunity.deadline.raw?.trim() || 'Deadline not published';
}

export function publicFeeLabel(opportunity?: OpportunityBrowseProjection | null): string {
  if (!opportunity || opportunity.fee.status === 'unknown') return 'Fee not stated';
  if (opportunity.fee.status === 'no-fee') return 'No application fee';
  if (opportunity.fee.amountCents !== undefined && opportunity.fee.currency) {
    try {
      return `${new Intl.NumberFormat('en', { style: 'currency', currency: opportunity.fee.currency }).format(opportunity.fee.amountCents / 100)} application fee`;
    } catch {
      return 'Application fee';
    }
  }
  return 'Application fee';
}

export function publicPracticeLabels(opportunities: Array<OpportunityBrowseProjection | null>, limit = 8): string[] {
  const terms = new Map(MISSA_TAXONOMY.terms.map((term) => [term.id, term]));
  const labels = new Map<string, { label: string; facetOrder: number }>();
  for (const opportunity of opportunities) {
    for (const termId of opportunity?.taxonomy?.termIds ?? []) {
      const term = terms.get(termId);
      if (!term || !publicPracticeFacets.has(term.facet)) continue;
      const facetOrder = MISSA_TAXONOMY.facets.find((facet) => facet.key === term.facet)?.sortOrder ?? 999;
      labels.set(term.id, { label: term.preferredLabel, facetOrder });
    }
  }
  return [...labels.values()].sort((a, b) => a.facetOrder - b.facetOrder || a.label.localeCompare(b.label)).slice(0, Math.max(0, limit)).map((item) => item.label);
}

export function safePublicMedia(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}
