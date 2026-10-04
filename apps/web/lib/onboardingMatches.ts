import {
  ONBOARDING_PRACTICES,
  mapInterestsToOpportunityTypes,
} from "./creatorOnboardingTaxonomy";

/**
 * Builds the public browse query that previews how many open calls fit the
 * choices made during onboarding. Kinds of work widen the set (any match);
 * opportunity types, country eligibility, and the fee preference narrow it,
 * the same way they do on /opportunities.
 */
export function onboardingMatchParams(input: {
  practices: readonly string[];
  refinements: readonly string[];
  interests: readonly string[];
  countryCode?: string;
  noFeeOnly?: boolean;
}): URLSearchParams {
  const params = new URLSearchParams();
  const terms = new Set<string>();
  for (const label of input.practices) {
    const practice = ONBOARDING_PRACTICES.find((p) => p.label === label);
    if (!practice) continue;
    const chosen = practice.refinements.filter((r) =>
      input.refinements.includes(r.label),
    );
    // A chosen refinement narrows its practice; otherwise the whole practice
    // family and its listed refinements count.
    const termIds = chosen.length
      ? chosen.map((r) => r.termId)
      : [
          practice.practiceFamilyTermId,
          ...practice.refinements.map((r) => r.termId),
        ];
    for (const termId of termIds) terms.add(termId);
  }
  if (terms.size) {
    params.set("taxonomy", [...terms].join(","));
    params.set("taxonomyMatch", "any");
  }
  const types = mapInterestsToOpportunityTypes(input.interests);
  if (types.length) params.set("types", types.join(","));
  if (input.countryCode) params.set("countryCode", input.countryCode);
  if (input.noFeeOnly) params.set("feeToggle", "1");
  return params;
}

export type OnboardingMatch = {
  id: string;
  slug: string;
  title: string;
  organizationName?: string | null;
  type: string;
  deadline: { kind: string; date?: string; raw?: string };
};

export type OnboardingMatches =
  | { state: "loading"; total?: number; items: OnboardingMatch[] }
  | { state: "ready"; total: number; items: OnboardingMatch[] }
  | { state: "unavailable"; items: OnboardingMatch[] };
