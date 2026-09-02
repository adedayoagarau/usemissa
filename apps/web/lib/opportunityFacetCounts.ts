import { unstable_cache } from "next/cache";
import type {
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
];

const practiceFacets = MISSA_TAXONOMY.terms
  .filter((term) => term.selectable && term.facet === "practice-family")
  .sort((a, b) => a.preferredLabel.localeCompare(b.preferredLabel));

const baseQuery: OpportunityRepositoryQuery = {
  openNow: true,
  sort: "soonest-deadline",
  limit: 1,
};

export interface OpportunityFacetCounts {
  total: number;
  types: Array<{ value: OpportunityType; label: string; count: number }>;
  practices: Array<{ value: string; label: string; count: number }>;
}

async function readOpportunityFacetCounts(): Promise<OpportunityFacetCounts> {
  const repository = getOpportunityRepository();
  const [all, typeCounts, practiceCounts] = await Promise.all([
    repository.browse(baseQuery),
    Promise.all(
      OPPORTUNITY_TYPE_FACETS.map(async (option) => ({
        ...option,
        count: (
          await repository.browse({ ...baseQuery, types: [option.value] })
        ).total,
      })),
    ),
    Promise.all(
      practiceFacets.map(async (term) => ({
        value: term.id,
        label: term.preferredLabel,
        count: (
          await repository.browse({
            ...baseQuery,
            taxonomyTermIds: [term.id],
            taxonomyIncludeDescendants: true,
          })
        ).total,
      })),
    ),
  ]);

  return {
    total: all.total,
    types: typeCounts,
    practices: practiceCounts.filter((option) => option.count > 0),
  };
}

export const getOpportunityFacetCounts = unstable_cache(
  readOpportunityFacetCounts,
  ["public-opportunity-facet-counts-v1"],
  { revalidate: 900 },
);
