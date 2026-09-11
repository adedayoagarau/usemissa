/**
 * Canonical bidirectional mappings between creator onboarding selections
 * and Missa's universal taxonomy terms and opportunity types.
 *
 * References:
 * - docs/creator-signal-and-personalization-model.md (Sections 2 & 3)
 * - docs/creator-onboarding-design.md
 */

import type { OpportunityType } from "@missa/radar-engine";

export type OnboardingPracticeDefinition = {
  label: string;
  description: string;
  practiceFamilyTermId: string;
  refinements: {
    label: string;
    termId: string;
  }[];
};

export const ONBOARDING_PRACTICES: readonly OnboardingPracticeDefinition[] = [
  {
    label: "Writing",
    description: "Poetry, fiction, essays & more",
    practiceFamilyTermId: "taxterm_pf-writing-and-literature",
    refinements: [
      { label: "Poetry", termId: "taxterm_disc-poetry" },
      { label: "Fiction", termId: "taxterm_disc-fiction" },
      { label: "Essays", termId: "taxterm_disc-creative-nonfiction" },
    ],
  },
  {
    label: "Visual arts",
    description: "Painting, photography & beyond",
    practiceFamilyTermId: "taxterm_pf-visual-arts",
    refinements: [
      { label: "Painting", termId: "taxterm_disc-painting" },
      { label: "Photography", termId: "taxterm_disc-photography" },
      { label: "Sculpture", termId: "taxterm_disc-sculpture" },
    ],
  },
  {
    label: "Music & sound",
    description: "Composition, recordings & sound",
    practiceFamilyTermId: "taxterm_pf-music-and-sound",
    refinements: [
      { label: "Composition", termId: "taxterm_disc-composition" },
      { label: "Sound art", termId: "taxterm_disc-sound-art" },
      { label: "Music production", termId: "taxterm_disc-music-production" },
    ],
  },
  {
    label: "Film & moving image",
    description: "Cinema, animation & video",
    practiceFamilyTermId: "taxterm_pf-film-and-moving-image",
    refinements: [
      { label: "Documentary", termId: "taxterm_disc-documentary-filmmaking" },
      { label: "Animation", termId: "taxterm_disc-animation" },
      { label: "Narrative film", termId: "taxterm_disc-narrative-filmmaking" },
    ],
  },
  {
    label: "Performance",
    description: "Theatre, dance & live work",
    practiceFamilyTermId: "taxterm_pf-performance-and-live-art",
    refinements: [
      { label: "Dance", termId: "taxterm_pf-dance-and-choreography" },
      { label: "Theatre", termId: "taxterm_pf-theatre-and-dramatic-arts" },
      { label: "Live art", termId: "taxterm_disc-live-art" },
    ],
  },
  {
    label: "Design & craft",
    description: "Objects, spaces & visual design",
    practiceFamilyTermId: "taxterm_pf-design",
    refinements: [
      { label: "Ceramics", termId: "taxterm_disc-ceramics" },
      { label: "Textiles", termId: "taxterm_disc-textile-art" },
      { label: "Graphic design", termId: "taxterm_disc-graphic-design" },
    ],
  },
] as const;

export type OnboardingInterestDefinition = {
  label: string;
  description: string;
  opportunityTypes: OpportunityType[];
};

export const ONBOARDING_INTERESTS: readonly OnboardingInterestDefinition[] = [
  {
    label: "Grants & funding",
    description: "Support to bring ideas to life",
    opportunityTypes: ["grant"],
  },
  {
    label: "Residencies",
    description: "Time and space for your practice",
    opportunityTypes: ["residency"],
  },
  {
    label: "Publication opportunities",
    description: "Find a home for your work",
    opportunityTypes: ["magazine", "open-call"],
  },
  {
    label: "Exhibitions & commissions",
    description: "Share your work with an audience",
    opportunityTypes: ["exhibition", "commission", "open-call"],
  },
  {
    label: "Fellowships & awards",
    description: "Recognition and room to grow",
    opportunityTypes: ["fellowship", "award"],
  },
  {
    label: "Jobs & paid projects",
    description: "Put your practice to work",
    opportunityTypes: ["job", "commission"],
  },
] as const;

/**
 * Converts user-selected practice labels into canonical taxonomy preferences.
 */
export function mapPracticesToTaxonomy(
  selectedPractices: readonly string[],
  selectedRefinements: readonly string[] = []
): Array<{ termId: string; preference: "prefer" | "include"; weight: number }> {
  const preferences: Array<{ termId: string; preference: "prefer" | "include"; weight: number }> = [];
  const added = new Set<string>();

  for (const practiceLabel of selectedPractices) {
    const practice = ONBOARDING_PRACTICES.find((p) => p.label.toLowerCase() === practiceLabel.toLowerCase());
    if (practice && !added.has(practice.practiceFamilyTermId)) {
      preferences.push({
        termId: practice.practiceFamilyTermId,
        preference: "prefer",
        weight: 100,
      });
      added.add(practice.practiceFamilyTermId);

      // If this is Design & Craft, also include craft-and-material-arts family
      if (practice.label === "Design & craft" && !added.has("taxterm_pf-craft-and-material-arts")) {
        preferences.push({
          termId: "taxterm_pf-craft-and-material-arts",
          preference: "prefer",
          weight: 100,
        });
        added.add("taxterm_pf-craft-and-material-arts");
      }

      // Check applicable refinements for this practice
      for (const refinement of practice.refinements) {
        if (
          selectedRefinements.some((r) => r.toLowerCase() === refinement.label.toLowerCase()) &&
          !added.has(refinement.termId)
        ) {
          preferences.push({
            termId: refinement.termId,
            preference: "prefer",
            weight: 100,
          });
          added.add(refinement.termId);
        }
      }
    }
  }

  return preferences;
}

/**
 * Converts user-selected interest card labels into canonical OpportunityType array.
 */
export function mapInterestsToOpportunityTypes(selectedInterests: readonly string[]): OpportunityType[] {
  const types = new Set<OpportunityType>();
  for (const interestLabel of selectedInterests) {
    const interest = ONBOARDING_INTERESTS.find((i) => i.label.toLowerCase() === interestLabel.toLowerCase());
    if (interest) {
      for (const t of interest.opportunityTypes) {
        types.add(t);
      }
    }
  }
  return Array.from(types);
}

/**
 * Maps stored taxonomy terms back into human-friendly practice and refinement labels.
 */
export function mapTaxonomyToPracticeLabels(termIds: readonly string[]): {
  practices: string[];
  refinements: string[];
} {
  const termSet = new Set(termIds);
  const practices: string[] = [];
  const refinements: string[] = [];

  for (const practice of ONBOARDING_PRACTICES) {
    if (termSet.has(practice.practiceFamilyTermId)) {
      practices.push(practice.label);
    }
    for (const refinement of practice.refinements) {
      if (termSet.has(refinement.termId)) {
        refinements.push(refinement.label);
      }
    }
  }

  return { practices, refinements };
}

/**
 * Maps stored opportunity types back into human-friendly interest labels.
 */
export function mapOpportunityTypesToInterestLabels(opportunityTypes: readonly string[]): string[] {
  const typeSet = new Set(opportunityTypes);
  const interests: string[] = [];

  for (const interest of ONBOARDING_INTERESTS) {
    if (interest.opportunityTypes.some((t) => typeSet.has(t))) {
      interests.push(interest.label);
    }
  }

  return interests;
}
