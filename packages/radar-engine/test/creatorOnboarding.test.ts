import assert from "node:assert/strict";
import test from "node:test";
import {
  createStore,
  processCreatorOnboarding,
  type CandidateOpportunityLike,
} from "../src/index.js";
import type { CreatorOnboardingInput } from "@missa/contracts";

const fixedNow = new Date("2026-09-01T12:00:00Z");

function seedOpportunityStore() {
  const store = createStore();
  const opps: CandidateOpportunityLike[] = [
    {
      id: "opp_poetry_urgent",
      title: "Poetry Open Call",
      publisherName: "Poetry Quarterly",
      genres: ["Poetry"],
      feeStatus: "free",
      deadlineDate: "2026-09-06",
    },
    {
      id: "opp_visual_residency",
      title: "Sculpture & Visual Arts Residency",
      publisherName: "Art Studio Collective",
      genres: ["Sculpture", "Visual Arts"],
      feeStatus: "free",
      deadlineDate: "2026-09-28",
    },
  ];

  for (const opp of opps) {
    store.opportunities.set(opp.id!, opp as any);
  }

  return store;
}

test("Single-discipline writing onboarding configures profile, preferences, and saved search", async () => {
  const store = seedOpportunityStore();
  const input: CreatorOnboardingInput = {
    displayName: "Ada Writer",
    bio: "Poet and essayist exploring climate narratives.",
    primaryPractice: "writing-and-literature",
    secondaryPractices: [],
    facets: {
      writing: {
        genres: ["Poetry", "Essays"],
        subgenres: ["Eco-Poetry", "Lyric Essay"],
        preferredFormats: ["Print", "Digital"],
        simultaneousRequired: true,
      },
    },
    preferences: {
      feePreference: "free_only",
      opportunityTypes: ["magazine", "grant", "contest"],
      careerStage: "emerging",
      locations: ["Global"],
      travelWillingness: "remote-only",
    },
  };

  const response = await processCreatorOnboarding(store, "user_writer_1", input, fixedNow);

  assert.equal(response.success, true);
  assert.equal(response.userId, "user_writer_1");
  assert.equal(response.profileSummary.displayName, "Ada Writer");
  assert.equal(response.profileSummary.primaryPractice, "writing-and-literature");
  assert.equal(response.profileSummary.feeMode, "free_only");
  assert.ok(response.nextSteps.length > 0);

  // Verify UserProfile in store
  const user = store.users.get("user_writer_1");
  assert.ok(user);
  assert.equal(user.displayName, "Ada Writer");
  assert.equal(user.opportunityPreferences?.noFeeOnly, true);
  assert.ok(user.opportunityPreferences?.genres.includes("Poetry"));
  assert.ok(user.opportunityPreferences?.genres.includes("Eco-Poetry"));
  assert.equal(user.opportunityPreferences?.simultaneousRequired, true);

  // Verify Taxonomy Preferences
  assert.ok(user.taxonomyPreferences?.some((t) => t.preference === "prefer" && t.weight === 100));

  // Verify RadarProfile (Saved Search)
  const defaultProfile = store.radarProfiles.get("profile_user_writer_1_writing-and-literature");
  assert.ok(defaultProfile);
  assert.equal(defaultProfile.name, "Writing & Literature Feed");
  assert.equal(defaultProfile.criteria.noFeeOnly, true);
});

test("Multi-disciplinary onboarding (Visual Arts + Writing + Film) handles multi-practice taxonomy and facets", async () => {
  const store = seedOpportunityStore();
  const input: CreatorOnboardingInput = {
    displayName: "Multidisciplinary Artist",
    primaryPractice: "visual-arts",
    secondaryPractices: ["writing-and-literature", "film-and-moving-image"],
    facets: {
      visualArts: {
        mediums: ["Oil Painting", "Ceramics"],
        forms: ["Exhibition", "Installation"],
        studioRequired: true,
        shippingAssistanceNeeded: true,
      },
      writing: {
        genres: ["Art Criticism", "Essays"],
        subgenres: [],
        preferredFormats: ["Print"],
        simultaneousRequired: false,
      },
    },
    preferences: {
      feePreference: "low_fee_acceptable",
      maxFeeCents: 500,
      careerStage: "mid-career",
      opportunityTypes: ["exhibition", "residency", "grant"],
      locations: ["Europe", "North America"],
      travelWillingness: "willing-to-travel",
    },
  };

  const response = await processCreatorOnboarding(store, "user_multi_1", input, fixedNow);

  assert.equal(response.success, true);
  assert.equal(response.profileSummary.totalPracticesConfigured, 3);
  assert.equal(response.profileSummary.primaryPractice, "visual-arts");

  const user = store.users.get("user_multi_1");
  assert.ok(user);

  // Primary visual-arts has weight 100 'prefer', secondary has weight 70 'include'
  const primaryTax = user.taxonomyPreferences?.find((t) => t.preference === "prefer");
  assert.ok(primaryTax);
  assert.equal(primaryTax.weight, 100);

  const secondaryTaxes = user.taxonomyPreferences?.filter((t) => t.preference === "include");
  assert.equal(secondaryTaxes?.length, 2);

  // Disciplines should include both visual-arts mediums and writing facets
  assert.ok(user.opportunityPreferences?.disciplines.includes("Oil Painting"));
  assert.ok(user.opportunityPreferences?.genres.includes("Art Criticism"));
  assert.equal(user.opportunityPreferences?.maxFeeCents, 500);
});
