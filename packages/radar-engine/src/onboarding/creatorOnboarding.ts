/**
 * Generalized Creator Onboarding Service
 *
 * Handles creator profile setup across all creative disciplines (Writing, Visual Arts,
 * Film & Media, Music & Sound, Performance, Craft & Design, Interdisciplinary),
 * canonical taxonomy binding, default RadarProfile creation, and initial personalized recommendations.
 */

import type {
  CreatorOnboardingInput,
  CreatorOnboardingResponse,
  CreativePracticeFamily,
} from "@missa/contracts";
import { MISSA_TAXONOMY, taxonomySlug, taxonomyTermId } from "@missa/taxonomy";
import type {
  OpportunityPreferences,
  OpportunityType,
  RadarProfile,
  TaxonomyPreference,
  UserProfile,
} from "../domain/types.js";
import type { RadarStore } from "../store/store.js";
import { generatePersonalizedFeed, type WriterMatchingProfile, type WriterGenre, type WriterFormat } from "../recommendation/writerMatchingEngine.js";

const DEFAULT_DISCIPLINE_OPPORTUNITY_TYPES: Record<CreativePracticeFamily, OpportunityType[]> = {
  "writing-and-literature": ["magazine", "open-call", "grant", "award", "fellowship", "residency", "contest"],
  "visual-arts": ["exhibition", "residency", "grant", "award", "commission", "open-call", "fellowship"],
  "photography": ["exhibition", "award", "grant", "open-call", "magazine", "residency"],
  "film-and-moving-image": ["festival", "grant", "fellowship", "residency", "award", "open-call"],
  "music-and-sound": ["commission", "grant", "residency", "festival", "award", "fellowship"],
  "theatre-and-dramatic-arts": ["commission", "residency", "grant", "festival", "award", "open-call"],
  "dance-and-choreography": ["residency", "commission", "grant", "festival", "fellowship"],
  "performance-and-live-art": ["festival", "residency", "commission", "grant", "open-call"],
  "illustration-and-comics": ["open-call", "magazine", "award", "grant", "residency"],
  "craft-and-material-arts": ["exhibition", "residency", "grant", "award", "commission"],
  "design": ["competition", "award", "grant", "residency", "commission", "rfp"].filter((t): t is OpportunityType => true) as OpportunityType[],
  "architecture-and-spatial-practice": ["rfp", "competition", "grant", "commission", "fellowship"].filter((t): t is OpportunityType => true) as OpportunityType[],
  "digital-and-creative-technology": ["grant", "residency", "festival", "commission", "fellowship"],
  "curatorial-and-editorial": ["fellowship", "residency", "grant", "award", "open-call"],
  "cultural-heritage-and-folk-traditions": ["grant", "fellowship", "award", "residency"],
  "interdisciplinary-practice": ["residency", "grant", "fellowship", "commission", "open-call", "award"],
};

const PRACTICE_FAMILY_LABELS: Record<CreativePracticeFamily, string> = {
  "writing-and-literature": "Writing & Literature",
  "visual-arts": "Visual Arts",
  "photography": "Photography",
  "film-and-moving-image": "Film & Moving Image",
  "music-and-sound": "Music & Sound",
  "theatre-and-dramatic-arts": "Theatre & Dramatic Arts",
  "dance-and-choreography": "Dance & Choreography",
  "performance-and-live-art": "Performance & Live Art",
  "illustration-and-comics": "Illustration & Comics",
  "craft-and-material-arts": "Craft & Material Arts",
  "design": "Design",
  "architecture-and-spatial-practice": "Architecture & Spatial Practice",
  "digital-and-creative-technology": "Digital & Creative Technology",
  "curatorial-and-editorial": "Curatorial & Editorial Practice",
  "cultural-heritage-and-folk-traditions": "Cultural Heritage & Traditions",
  "interdisciplinary-practice": "Interdisciplinary Practice",
};

export async function processCreatorOnboarding(
  store: RadarStore,
  userId: string,
  input: CreatorOnboardingInput,
  now: Date = new Date()
): Promise<CreatorOnboardingResponse> {
  const nowIso = now.toISOString();

  // 1. Resolve practices
  const primaryPractice = input.primaryPractice;
  const secondaryPractices = input.secondaryPractices.filter((p) => p !== primaryPractice);
  const allPractices = [primaryPractice, ...secondaryPractices];

  // 2. Build Taxonomy Preferences
  const taxonomyPreferences: TaxonomyPreference[] = [];

  // Add primary practice as "prefer" (weight: 100)
  const primarySlug = taxonomySlug(PRACTICE_FAMILY_LABELS[primaryPractice]);
  const primaryTermId = taxonomyTermId("practice-family", primarySlug);
  taxonomyPreferences.push({
    termId: primaryTermId,
    preference: "prefer",
    weight: 100,
  });

  // Add secondary practices as "include" (weight: 70)
  for (const practice of secondaryPractices) {
    const slug = taxonomySlug(PRACTICE_FAMILY_LABELS[practice]);
    const termId = taxonomyTermId("practice-family", slug);
    taxonomyPreferences.push({
      termId,
      preference: "include",
      weight: 70,
    });
  }

  // 3. Extract discipline-specific facets
  const disciplines: string[] = allPractices.map((p) => PRACTICE_FAMILY_LABELS[p]);
  const genres: string[] = [];

  // Writing facets (launch vertical)
  if (input.facets.writing) {
    if (input.facets.writing.genres) {
      genres.push(...input.facets.writing.genres);
    }
    if (input.facets.writing.subgenres) {
      genres.push(...input.facets.writing.subgenres);
    }
  }

  // Music facets
  if (input.facets.musicAndSound?.genres) {
    genres.push(...input.facets.musicAndSound.genres);
  }

  // Visual Arts facets
  if (input.facets.visualArts?.mediums) {
    disciplines.push(...input.facets.visualArts.mediums);
  }
  if (input.facets.visualArts?.forms) {
    disciplines.push(...input.facets.visualArts.forms);
  }

  // Opportunity Types
  const configuredTypes: OpportunityType[] =
    input.preferences.opportunityTypes && input.preferences.opportunityTypes.length > 0
      ? input.preferences.opportunityTypes
      : DEFAULT_DISCIPLINE_OPPORTUNITY_TYPES[primaryPractice] || ["grant", "residency", "open-call", "award"];

  const feePreference = input.preferences.feePreference ?? "any";
  const noFeeOnly = feePreference === "free_only";
  const maxFeeCents =
    input.preferences.maxFeeCents ?? (feePreference === "low_fee_acceptable" ? 500 : undefined);

  const careerStages =
    input.preferences.careerStage && input.preferences.careerStage !== "any"
      ? [input.preferences.careerStage]
      : [];

  const simultaneousRequired = input.facets.writing?.simultaneousRequired ?? true;

  const opportunityPreferences: OpportunityPreferences = {
    types: configuredTypes,
    disciplines: Array.from(new Set(disciplines)),
    genres: Array.from(new Set(genres)),
    locations: input.preferences.locations ?? [],
    careerStages,
    maxFeeCents,
    noFeeOnly,
    simultaneousRequired,
  };

  // 4. Update User Profile in Store
  let user = store.users.get(userId);
  if (!user) {
    user = {
      id: userId,
      displayName: input.displayName?.trim() || "Creative Practitioner",
      bio: input.bio?.trim(),
      attributes: {},
      genres,
      taxonomyPreferences,
      opportunityPreferences,
    };
    store.users.set(userId, user);
  } else {
    user.displayName = input.displayName?.trim() || user.displayName;
    if (input.bio !== undefined) user.bio = input.bio.trim();
    user.genres = genres;
    user.taxonomyPreferences = taxonomyPreferences;
    user.opportunityPreferences = opportunityPreferences;
  }

  // 5. Create Default Radar Profile / Saved Search
  const primaryLabel = PRACTICE_FAMILY_LABELS[primaryPractice];
  const profileId = `profile_${userId}_${primaryPractice}`;
  const defaultProfile: RadarProfile = {
    id: profileId,
    userId,
    name: `${primaryLabel} Feed`,
    criteria: {
      types: configuredTypes,
      genres: genres.length > 0 ? genres : undefined,
      maxFeeCents,
      noFeeOnly,
      simultaneousRequired,
    },
  };
  store.radarProfiles.set(profileId, defaultProfile);

  // 6. Generate Initial Personalized Preview Feed
  const pool = [...store.opportunities.values()];
  const writerGenres: WriterGenre[] = (
    input.facets.writing?.genres && input.facets.writing.genres.length > 0
      ? input.facets.writing.genres
      : genres.length > 0
      ? genres
      : ["Poetry", "Fiction", "Creative Nonfiction", "Essays", "Translation", "Flash Fiction", "Art", "Drama"]
  ).filter((g): g is WriterGenre => [
    "Poetry",
    "Fiction",
    "Creative Nonfiction",
    "Essays",
    "Translation",
    "Flash Fiction",
    "Art",
    "Drama",
  ].includes(g as WriterGenre));

  const writerProfile: WriterMatchingProfile = {
    userId,
    primaryGenres: writerGenres.length > 0 ? writerGenres : ["Poetry", "Fiction", "Creative Nonfiction", "Essays"],
    subgenres: input.facets.writing?.subgenres ?? [],
    preferredFormats: (input.facets.writing?.preferredFormats as WriterFormat[]) ?? ["Print", "Digital"],
    feePreference,
    maxFeeCents,
    simultaneousSubmissionNeeded: simultaneousRequired,
    savedOpportunityIds: [],
    submittedPublisherIds: [],
  };

  const feedResult = await generatePersonalizedFeed(pool, writerProfile, {
    limit: 5,
    now,
  });

  const nextSteps = [
    {
      code: "library_work",
      label: "Add your first piece or manuscript to your Library",
      targetUrl: "/library",
    },
    {
      code: "explore_feed",
      label: "Explore your curated opportunities feed",
      targetUrl: "/opportunities",
    },
    {
      code: "save_opportunities",
      label: "Save deadlines to your submission tracker",
      targetUrl: "/tracker",
    },
  ];

  return {
    success: true,
    userId,
    profileSummary: {
      displayName: user.displayName,
      primaryPractice,
      totalPracticesConfigured: allPractices.length,
      feeMode: feePreference,
      matchingReadiness: "ready",
    },
    initialRecommendationsCount: feedResult.totalMatches,
    initialRecommendationsPreview: feedResult.feed.slice(0, 3).map((item) => ({
      opportunityId: item.opportunityId,
      title: item.title,
      publisherName: item.publisherName,
      matchScore: item.matchScore,
      matchReasons: item.matchReasons,
    })),
    nextSteps,
  };
}
