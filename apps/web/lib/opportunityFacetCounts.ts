import type {
  OpportunityRepositoryContext,
  OpportunityRepositoryQuery,
  OpportunityType,
} from "@missa/radar-engine";
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

function labelForDiscipline(value: string): string {
  const knownLabels: Record<string, string> = {
    "visual-arts": "Visual arts",
    "writing-and-literature": "Writing & literature",
  };
  return knownLabels[value] ?? value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export interface OpportunityFacetCounts {
  total: number;
  types: Array<{ value: OpportunityType; label: string; count: number }>;
  disciplines: Array<{ value: string; label: string; count: number }>;
}

export async function getOpportunityFacetCounts(
  query: OpportunityRepositoryQuery,
  context?: OpportunityRepositoryContext,
): Promise<OpportunityFacetCounts> {
  const repository = getOpportunityRepository();
  const counts = await repository.facetCounts(query, context);
  const typeCounts = new Map(counts.types.map((item) => [item.value, item.count]));

  return {
    total: counts.total,
    types: OPPORTUNITY_TYPE_FACETS.map((option) => ({
      ...option,
      count: typeCounts.get(option.value) ?? 0,
    })),
    disciplines: (counts.disciplines ?? [])
      .map((option) => ({ ...option, label: labelForDiscipline(option.value) }))
      .filter((option) => option.count > 0 || query.disciplines?.includes(option.value))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}
