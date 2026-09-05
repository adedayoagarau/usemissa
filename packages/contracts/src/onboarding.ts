import { z } from "zod";
import { opportunityTypeSchema, feeStatusSchema } from "./opportunities.js";

/**
 * Creative practice families recognized by Missa's universal taxonomy.
 */
export const creativePracticeFamilySchema = z.enum([
  "writing-and-literature",
  "visual-arts",
  "photography",
  "film-and-moving-image",
  "music-and-sound",
  "theatre-and-dramatic-arts",
  "dance-and-choreography",
  "performance-and-live-art",
  "illustration-and-comics",
  "craft-and-material-arts",
  "design",
  "architecture-and-spatial-practice",
  "digital-and-creative-technology",
  "curatorial-and-editorial",
  "cultural-heritage-and-folk-traditions",
  "interdisciplinary-practice",
]);

export type CreativePracticeFamily = z.infer<typeof creativePracticeFamilySchema>;

/**
 * Writing vertical facet preferences (launch pilot).
 */
export const writingFacetsSchema = z.object({
  genres: z.array(z.string().trim().min(1).max(80)).default([]),
  subgenres: z.array(z.string().trim().min(1).max(80)).default([]),
  preferredFormats: z.array(z.enum(["Print", "Digital", "Chapbook", "Book", "Audio"])).default([]),
  simultaneousRequired: z.boolean().default(true),
});

export type WritingFacets = z.infer<typeof writingFacetsSchema>;

/**
 * Visual Arts facet preferences.
 */
export const visualArtsFacetsSchema = z.object({
  mediums: z.array(z.string().trim().min(1).max(80)).default([]),
  forms: z.array(z.string().trim().min(1).max(80)).default([]),
  studioRequired: z.boolean().default(false),
  shippingAssistanceNeeded: z.boolean().default(false),
});

export type VisualArtsFacets = z.infer<typeof visualArtsFacetsSchema>;

/**
 * Film & Media facet preferences.
 */
export const filmAndMediaFacetsSchema = z.object({
  formats: z.array(z.string().trim().min(1).max(80)).default([]),
  runtimes: z.array(z.string().trim().min(1).max(80)).default([]),
  premiereStatusRequired: z.boolean().default(false),
});

export type FilmAndMediaFacets = z.infer<typeof filmAndMediaFacetsSchema>;

/**
 * Music & Sound facet preferences.
 */
export const musicAndSoundFacetsSchema = z.object({
  genres: z.array(z.string().trim().min(1).max(80)).default([]),
  ensembleTypes: z.array(z.string().trim().min(1).max(80)).default([]),
  audioSamplesAvailable: z.boolean().default(true),
});

export type MusicAndSoundFacets = z.infer<typeof musicAndSoundFacetsSchema>;

/**
 * Universal cross-discipline preferences.
 */
export const universalCreatorPreferencesSchema = z.object({
  feePreference: z.enum(["free_only", "low_fee_acceptable", "any"]).default("any"),
  maxFeeCents: z.number().int().min(0).max(10_000_000).optional(),
  opportunityTypes: z.array(opportunityTypeSchema).default([]),
  careerStage: z.enum(["emerging", "mid-career", "established", "student", "any"]).default("any"),
  locations: z.array(z.string().trim().min(1).max(120)).default([]),
  travelWillingness: z.enum(["remote-only", "willing-to-travel", "local-only", "any"]).default("any"),
});

export type UniversalCreatorPreferences = z.infer<typeof universalCreatorPreferencesSchema>;

/**
 * Creator onboarding mutation payload.
 */
export const creatorOnboardingInputSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  primaryPractice: creativePracticeFamilySchema,
  secondaryPractices: z.array(creativePracticeFamilySchema).default([]),
  facets: z
    .object({
      writing: writingFacetsSchema.optional(),
      visualArts: visualArtsFacetsSchema.optional(),
      filmAndMedia: filmAndMediaFacetsSchema.optional(),
      musicAndSound: musicAndSoundFacetsSchema.optional(),
    })
    .default({}),
  preferences: universalCreatorPreferencesSchema.default({
    feePreference: "any",
    opportunityTypes: [],
    careerStage: "any",
    locations: [],
    travelWillingness: "any",
  }),
});

export type CreatorOnboardingInput = z.infer<typeof creatorOnboardingInputSchema>;

/**
 * Structured response returned upon onboarding completion.
 */
export const creatorOnboardingResponseSchema = z.object({
  success: z.boolean(),
  userId: z.string(),
  profileSummary: z.object({
    displayName: z.string(),
    primaryPractice: creativePracticeFamilySchema,
    totalPracticesConfigured: z.number(),
    feeMode: z.enum(["free_only", "low_fee_acceptable", "any"]),
    matchingReadiness: z.enum(["ready", "needs_more_signals"]),
  }),
  initialRecommendationsCount: z.number(),
  initialRecommendationsPreview: z.array(
    z.object({
      opportunityId: z.string(),
      title: z.string(),
      publisherName: z.string(),
      matchScore: z.number(),
      matchReasons: z.array(z.string()),
    })
  ),
  nextSteps: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      targetUrl: z.string(),
    })
  ),
});

export type CreatorOnboardingResponse = z.infer<typeof creatorOnboardingResponseSchema>;

export const onboardingStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "skipped",
]);

export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;

export const creatorOnboardingStateSchema = z.object({
  authenticated: z.boolean(),
  status: onboardingStatusSchema,
  step: z.number().int().min(0).max(3),
  practices: z.array(z.string()),
  refinements: z.array(z.string()),
  interests: z.array(z.string()),
  completedAt: z.string().datetime().optional(),
  skippedAt: z.string().datetime().optional(),
  nextAction: z
    .object({
      label: z.string(),
      description: z.string(),
      href: z.string(),
      kind: z.enum([
        "resume-save",
        "explore-matches",
        "prepare-opportunity",
        "browse-all",
      ]),
    })
    .optional(),
});

export type CreatorOnboardingState = z.infer<typeof creatorOnboardingStateSchema>;

export const creatorOnboardingMutationSchema = z.object({
  action: z.enum(["save_step", "complete", "skip"]),
  step: z.number().int().min(0).max(3).optional(),
  practices: z.array(z.string().trim()).default([]),
  refinements: z.array(z.string().trim()).default([]),
  interests: z.array(z.string().trim()).default([]),
  primaryPractice: z.string().trim().optional(),
  lastRoute: z.string().trim().optional(),
});

export type CreatorOnboardingMutation = z.infer<typeof creatorOnboardingMutationSchema>;
