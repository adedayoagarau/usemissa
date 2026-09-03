import type {
  OpportunityRepositoryContext,
  OpportunityRepositoryQuery,
  OpportunityType,
} from "@missa/radar-engine";
import { MISSA_TAXONOMY } from "@missa/taxonomy";
import { getOpportunityRepository } from "./opportunityRepository";

export const OPPORTUNITY_TYPE_FACETS: ReadonlyArray<{
  value: OpportunityType;
  label: string;
}> = [
  { value: "open-call", label: "Open call" },
  { value: "magazine", label: "Magazine" },
  { value: "grant", label: "Grant" },
  { value: "award", label: "Award" },
  { value: "residency", label: "Residency" },
  { value: "fellowship", label: "Fellowship" },
  { value: "contest", label: "Contest" },
  { value: "commission", label: "Commission" },
  { value: "festival", label: "Festival" },
  { value: "scholarship", label: "Scholarship" },
  { value: "conference", label: "Conference" },
  { value: "rfp", label: "RFP / Public Commission" },
];

const practiceFacets = MISSA_TAXONOMY.terms
  .filter((term) => term.selectable && term.facet === "practice-family")
  .sort((a, b) => a.preferredLabel.localeCompare(b.preferredLabel));

export interface OpportunityFacetCounts {
  total: number;
  types: Array<{ value: OpportunityType; label: string; count: number }>;
  practices: Array<{ value: string; label: string; count: number }>;
}

export async function getOpportunityFacetCounts(
  query: OpportunityRepositoryQuery,
  context?: OpportunityRepositoryContext,
): Promise<OpportunityFacetCounts> {
  const repository = getOpportunityRepository();
  const counts = await repository.facetCounts(query, context);
  const typeCounts = new Map(counts.types.map((item) => [item.value, item.count]));
  const taxonomyCounts = new Map(
    counts.taxonomyTerms.map((item) => [item.termId, item.count]),
  );

  return {
    total: counts.total,
    types: OPPORTUNITY_TYPE_FACETS.map((option) => ({
      ...option,
      count: typeCounts.get(option.value) ?? 0,
    })),
    practices: practiceFacets
      .map((term) => ({
        value: term.id,
        label: term.preferredLabel,
        count: taxonomyCounts.get(term.id) ?? 0,
      }))
      .filter(
        (option) =>
          option.count > 0 || query.taxonomyTermIds?.includes(option.value),
      ),
  };
}
