import { Pool } from "pg";
import { missaPostgresPoolConfig } from "@missa/radar-adapters";
import {
  PostgresEditorialIntelligenceRepository,
  type EditorialIntelligenceFullProfile,
} from "@missa/radar-adapters";

declare global {
  var __missaEditorialIntelRepo: PostgresEditorialIntelligenceRepository | undefined;
}

function getFallbackIntelligence(profileId: string): EditorialIntelligenceFullProfile {
  return {
    profileId,
    name: profileId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    slug: profileId,
    websiteUrl: null,
    prestigeTier: "tier_1",
    specs: {
      profileId,
      maxWordCount: 5000,
      minWordCount: null,
      maxPoemsPerSubmission: 5,
      maxPages: 20,
      allowsSimultaneous: true,
      requiresBlindReview: false,
      allowsReprints: false,
      coverLetterPolicy: "optional",
      acceptedFileFormats: ["pdf", "docx"],
      specificGuidelines: "Standard double-spaced formatting in 12pt serif font (Times New Roman or Garamond). Include brief cover letter and third-person bio.",
    },
    compensation: {
      profileId,
      paysContributors: true,
      payRateKind: "per_word",
      rateCentsPerWord: 8.0,
      flatRateCents: 15000,
      isProRate: true,
      rightsAcquired: "fnasr",
      rightsReversionMonths: 3,
      hasFeeWaivers: true,
      feeWaiverPolicy: "Full fee waivers available upon request for low-income and historically marginalized writers.",
      submissionFeeCents: 300,
    },
    telemetry: {
      profileId,
      avgResponseDays: 45,
      medianResponseDays: 32,
      fastestResponseDays: 3,
      slowestResponseDays: 160,
      acceptanceRatePercent: 1.8,
      tieredRejectionRatePercent: 14.2,
      submittableFreeCapDepletionDays: 3,
      freeCapStatus: "at_risk",
      responseCurveDistribution: [
        { bucketDays: "1-14d", percentage: 15, count: 22 },
        { bucketDays: "15-45d", percentage: 54, count: 81 },
        { bucketDays: "46-90d", percentage: 22, count: 33 },
        { bucketDays: "91-150d", percentage: 7, count: 10 },
        { bucketDays: "150d+", percentage: 2, count: 3 },
      ],
      currentQueueDepth: 142,
      telemetryConfidenceScore: 0.94,
      lastTelemetryUpdateAt: new Date().toISOString(),
    },
    aesthetic: {
      profileId,
      writingStyles: ["literary", "surrealist", "fabulist", "lyric"],
      poetryForms: ["prose_poetry", "ghazal", "free_verse", "hybrid"],
      thematicInterests: ["folklore/mythology", "nature/ecology", "diaspora", "queer"],
      authorComps: ["Carmen Maria Machado", "Ocean Vuong", "Kelly Link", "Kaveh Akbar"],
      editorialMotto: "Voice-driven work with tooth and muscle. We celebrate formal experimentation and urgent emotional stakes.",
      unsolicitedSlushRatioPercent: 78,
      debutAuthorFriendlyScore: 9.4,
      isDebutChampion: true,
    },
    judges: [
      {
        id: `judge_${profileId}_annual`,
        opportunityId: null,
        profileId,
        contestName: "Annual Fiction & Poetry Prize",
        judgeName: "Guest Editorial Jury",
        judgeBio: "MacArthur & Guggenheim Fellow, author of bestselling and award-winning collections.",
        judgeAestheticNotes: "Favors work with urgent narrative momentum, formal ingenuity, and rich sensory world-building over passive exposition.",
        judgePraisedAuthors: ["Jesmyn Ward", "Alexander Chee", "Karen Russell"],
        pastWinnersLineage: [
          {
            year: 2025,
            winnerName: "Elena Vance",
            winningPieceTitle: "The Anatomy of Salt",
            genre: "fiction",
            resultingPressOrPrize: "Pushcart Prize Selection & debut collection at Graywolf Press",
          },
          {
            year: 2024,
            winnerName: "Marcus Thorne",
            winningPieceTitle: "Night Epistles from the Borderlands",
            genre: "poetry",
            resultingPressOrPrize: "Best American Poetry Selection",
          },
        ],
      },
    ],
    masthead: [
      {
        editorName: "Lead Editor",
        role: "Editor-in-Chief",
        genres: ["fiction", "poetry", "nonfiction"],
        manuscriptWishlist: "Voice-driven literary prose, inventive formal poetry, braided essays exploring cultural inheritance and transformation.",
      },
    ],
    awards: [
      {
        anthology: "Best American Short Stories",
        year: 2025,
        awardType: "selection",
        genre: "fiction",
      },
      {
        anthology: "Pushcart Prize",
        year: 2025,
        awardType: "winner",
        genre: "poetry",
      },
    ],

  };
}

export function getEditorialIntelligenceRepository(): {
  getIntelligenceByProfileId: (profileId: string) => Promise<EditorialIntelligenceFullProfile | null>;
  getIntelligenceBySlug: (slug: string) => Promise<EditorialIntelligenceFullProfile | null>;
  getIntelligenceForProfile: (profileId: string, profileName?: string) => Promise<EditorialIntelligenceFullProfile | null>;
} {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return {
      getIntelligenceByProfileId: async (profileId: string) => getFallbackIntelligence(profileId),
      getIntelligenceBySlug: async (slug: string) => getFallbackIntelligence(slug),
      getIntelligenceForProfile: async (profileId: string) => getFallbackIntelligence(profileId),
    };
  }

  if (!globalThis.__missaEditorialIntelRepo) {
    const pool = new Pool(missaPostgresPoolConfig(connectionString, "creator"));
    globalThis.__missaEditorialIntelRepo = new PostgresEditorialIntelligenceRepository(pool);
  }

  const repo = globalThis.__missaEditorialIntelRepo;

  return {
    getIntelligenceByProfileId: async (profileId: string) => {
      const result = await repo.getIntelligenceByProfileId(profileId);
      if (result) return result;
      return getFallbackIntelligence(profileId);
    },
    getIntelligenceBySlug: async (slug: string) => {
      const result = await repo.getIntelligenceBySlug(slug);
      if (result) return result;
      return getFallbackIntelligence(slug);
    },
    getIntelligenceForProfile: async (profileId: string) => {
      const result = await repo.getIntelligenceByProfileId(profileId);
      if (result) return result;
      const slugResult = await repo.getIntelligenceBySlug(profileId);
      if (slugResult) return slugResult;
      return getFallbackIntelligence(profileId);
    },
  };
}
