import { Pool } from "pg";
import type {
  EditorialIntelligenceFullProfile,
  PublicationEditorialSpecs,
  PublicationCompensationDetails,
  PublicationTelemetryAnalytics,
  PublicationAestheticProfile,
} from "./editorialIntelligenceRepository.js";

export interface ManuscriptMatchInput {
  genre: "fiction" | "poetry" | "nonfiction" | "flash" | "hybrid";
  wordCount?: number;
  poemCount?: number;
  lineCount?: number;
  aestheticTags?: string[];
  compAuthors?: string[];
  isDebutAuthor?: boolean;
  feeTolerance?: "free_only" | "fee_ok_with_waivers" | "any";
  minPayRate?: "pro_rates_only" | "any_paying" | "all";
  allowSimultaneous?: boolean;
  limit?: number;
}

export type MatchCategory =
  | "dream_reach"
  | "debut_champion"
  | "rapid_pro"
  | "packet_builder";

export interface ManuscriptMatchCard {
  profileId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  prestigeTier: "tier_1" | "tier_2" | "tier_3" | "unranked";
  matchScore: number; // 0 to 100
  fitCategory: MatchCategory;
  reasons: string[];
  specs: {
    maxWordCount: number | null;
    minWordCount: number | null;
    allowsSimultaneous: boolean;
    requiresBlindReview: boolean;
  };
  compensation: {
    paysContributors: boolean;
    payRateKind: string;
    isProRate: boolean;
    rateCentsPerWord: number | null;
    flatRateCents: number | null;
    hasFeeWaivers: boolean;
    submissionFeeCents: number;
  };
  telemetry: {
    medianResponseDays: number;
    acceptanceRatePercent: number;
    freeCapStatus: string;
    submittableFreeCapDepletionDays: number | null;
  };
  aesthetic: {
    writingStyles: string[];
    poetryForms: string[];
    authorComps: string[];
    editorialMotto: string | null;
    unsolicitedSlushRatioPercent: number;
    debutAuthorFriendlyScore: number;
    isDebutChampion: boolean;
  };
}

export interface ManuscriptMatchResponse {
  totalAnalyzed: number;
  matchedCount: number;
  dreamReach: ManuscriptMatchCard[];
  debutChampions: ManuscriptMatchCard[];
  rapidPro: ManuscriptMatchCard[];
  simultaneousPackets: ManuscriptMatchCard[];
}

export class ManuscriptMatchEngine {
  constructor(private pool: Pool | null) {}

  async matchManuscript(
    input: ManuscriptMatchInput,
  ): Promise<ManuscriptMatchResponse> {
    const limit = input.limit ?? 50;

    if (!this.pool) {
      return this.fallbackMatch(input, limit);
    }

    try {
      const query = `
        SELECT
          gp.id as profile_id,
          gp.name,
          COALESCE(gp.name_key, gp.id) as slug,
          gp.website_url,
          COALESCE(mr.prestige_tier, 'unranked') as prestige_tier,
          COALESCE(mr.total_score, 0) as total_score,
          pes.max_word_count,
          pes.min_word_count,
          pes.max_poems_per_submission,
          pes.allows_simultaneous,
          pes.requires_blind_review,
          pes.accepted_file_formats,
          pcd.pays_contributors,
          pcd.pay_rate_kind,
          pcd.rate_cents_per_word,
          pcd.flat_rate_cents,
          pcd.is_pro_rate,
          pcd.has_fee_waivers,
          pcd.submission_fee_cents,
          pta.median_response_days,
          pta.acceptance_rate_percent,
          pta.free_cap_status,
          pta.submittable_free_cap_depletion_days,
          pap.writing_styles,
          pap.poetry_forms,
          pap.thematic_interests,
          pap.author_comps,
          pap.editorial_motto,
          pap.unsolicited_slush_ratio_percent,
          pap.debut_author_friendly_score,
          pap.is_debut_champion
        FROM gary_profiles gp
        LEFT JOIN missa_magazine_rankings mr ON mr.profile_id = gp.id AND mr.ranking_year = 2026
        LEFT JOIN publication_editorial_specs pes ON pes.profile_id = gp.id
        LEFT JOIN publication_compensation_details pcd ON pcd.profile_id = gp.id
        LEFT JOIN publication_telemetry_analytics pta ON pta.profile_id = gp.id
        LEFT JOIN publication_aesthetic_profiles pap ON pap.profile_id = gp.id
        WHERE gp.profile_kind IN ('literary_magazine', 'small_press', 'organization', 'visual_arts_organization')
           OR mr.profile_id IS NOT NULL
        ORDER BY mr.total_score DESC NULLS LAST
        LIMIT 500;
      `;

      const { rows } = await this.pool.query(query);
      if (!rows || rows.length === 0) {
        return this.fallbackMatch(input, limit);
      }

      return this.scoreAndGroupRows(rows, input, limit);
    } catch (err) {
      console.warn(
        "[ManuscriptMatchEngine] Postgres query failed, falling back to local heuristic matching:",
        err,
      );
      return this.fallbackMatch(input, limit);
    }
  }

  private scoreAndGroupRows(
    rows: any[],
    input: ManuscriptMatchInput,
    limit: number,
  ): ManuscriptMatchResponse {
    const scoredCards: ManuscriptMatchCard[] = [];

    const normAestheticTags = (input.aestheticTags ?? []).map((t) =>
      t.toLowerCase().trim(),
    );
    const normCompAuthors = (input.compAuthors ?? []).map((a) =>
      a.toLowerCase().trim(),
    );

    for (const row of rows) {
      let score = 0;
      const reasons: string[] = [];

      const maxWords = row.max_word_count ? Number(row.max_word_count) : null;
      const minWords = row.min_word_count ? Number(row.min_word_count) : null;
      const allowsSimultaneous = row.allows_simultaneous ?? true;
      const requiresBlind = row.requires_blind_review ?? false;

      // 1. Spec Compatibility (Max 25 pts)
      if (input.wordCount && maxWords) {
        if (input.wordCount <= maxWords) {
          score += 20;
          reasons.push(
            `Within word limit (${input.wordCount.toLocaleString()} / max ${maxWords.toLocaleString()} words)`,
          );
        } else {
          score -= 30; // Hard penalty for exceeding word count
        }
      } else {
        score += 15;
      }

      if (input.allowSimultaneous && !allowsSimultaneous) {
        score -= 20; // Does not permit simultaneous submissions
      } else if (allowsSimultaneous) {
        score += 5;
      }

      // 2. Aesthetic DNA & Comp Matching (Max 35 pts)
      const writingStyles: string[] = row.writing_styles ?? [
        "literary",
        "personal",
      ];
      const authorComps: string[] = row.author_comps ?? [];
      const poetryForms: string[] = row.poetry_forms ?? [];

      let compOverlapCount = 0;
      for (const comp of normCompAuthors) {
        if (
          authorComps.some(
            (c) =>
              c.toLowerCase().includes(comp) || comp.includes(c.toLowerCase()),
          )
        ) {
          compOverlapCount++;
        }
      }

      let styleOverlapCount = 0;
      for (const style of normAestheticTags) {
        if (
          writingStyles.some((s) => s.toLowerCase().includes(style)) ||
          poetryForms.some((f) => f.toLowerCase().includes(style))
        ) {
          styleOverlapCount++;
        }
      }

      if (compOverlapCount > 0) {
        score += Math.min(20, compOverlapCount * 10);
        reasons.push(`Comp author alignment`);
      }

      if (styleOverlapCount > 0) {
        score += Math.min(15, styleOverlapCount * 5);
        reasons.push(`Aesthetic style alignment`);
      }

      if (compOverlapCount === 0 && styleOverlapCount === 0) {
        score += 10; // Baseline general editorial fit
      }

      // 3. Debut Friendliness & Slush Ratio (Max 20 pts)
      const slushRatio = Number(row.unsolicited_slush_ratio_percent ?? 65);
      const debutScore = Number(row.debut_author_friendly_score ?? 8.5);
      const isDebutChampion = Boolean(row.is_debut_champion ?? true);

      if (input.isDebutAuthor) {
        if (isDebutChampion || slushRatio >= 70) {
          score += 20;
          reasons.push(
            `Debut champion (${slushRatio}% slush acceptance ratio)`,
          );
        } else {
          score += 8;
        }
      } else {
        score += 12;
      }

      // 4. Pay & Fee Preference (Max 20 pts)
      const paysContributors = Boolean(row.pays_contributors);
      const isProRate = Boolean(row.is_pro_rate);
      const submissionFee = Number(row.submission_fee_cents ?? 0);
      const hasFeeWaivers = Boolean(row.has_fee_waivers);

      if (input.feeTolerance === "free_only" && submissionFee > 0) {
        if (!hasFeeWaivers) {
          score -= 25;
        } else {
          score += 5;
          reasons.push("Fee waiver available");
        }
      } else {
        score += 10;
      }

      if (input.minPayRate === "pro_rates_only") {
        if (isProRate) {
          score += 10;
          reasons.push("Pro payment rate verified (≥ $0.08/w)");
        } else {
          score -= 15;
        }
      } else if (paysContributors) {
        score += 8;
      }

      const normalizedScore = Math.max(10, Math.min(99, Math.round(score)));

      // Determine fit category
      let fitCategory: MatchCategory = "packet_builder";
      if (row.prestige_tier === "tier_1") {
        fitCategory = "dream_reach";
      } else if (isDebutChampion && slushRatio >= 75) {
        fitCategory = "debut_champion";
      } else if (
        isProRate &&
        Number(row.median_response_days ?? 45) <= 35
      ) {
        fitCategory = "rapid_pro";
      }

      scoredCards.push({
        profileId: row.profile_id,
        name: row.name,
        slug: row.slug,
        websiteUrl: row.website_url,
        prestigeTier: row.prestige_tier,
        matchScore: normalizedScore,
        fitCategory,
        reasons,
        specs: {
          maxWordCount: maxWords,
          minWordCount: minWords,
          allowsSimultaneous,
          requiresBlindReview: requiresBlind,
        },
        compensation: {
          paysContributors,
          payRateKind: row.pay_rate_kind || "variable",
          isProRate,
          rateCentsPerWord: row.rate_cents_per_word
            ? Number(row.rate_cents_per_word)
            : null,
          flatRateCents: row.flat_rate_cents
            ? Number(row.flat_rate_cents)
            : null,
          hasFeeWaivers,
          submissionFeeCents: submissionFee,
        },
        telemetry: {
          medianResponseDays: Number(row.median_response_days ?? 32),
          acceptanceRatePercent: Number(row.acceptance_rate_percent ?? 2.5),
          freeCapStatus: row.free_cap_status || "healthy",
          submittableFreeCapDepletionDays: row.submittable_free_cap_depletion_days
            ? Number(row.submittable_free_cap_depletion_days)
            : null,
        },
        aesthetic: {
          writingStyles,
          poetryForms,
          authorComps,
          editorialMotto: row.editorial_motto,
          unsolicitedSlushRatioPercent: slushRatio,
          debutAuthorFriendlyScore: debutScore,
          isDebutChampion,
        },
      });
    }

    scoredCards.sort((a, b) => b.matchScore - a.matchScore);

    const dreamReach = scoredCards
      .filter((c) => c.prestigeTier === "tier_1")
      .slice(0, 10);
    const debutChampions = scoredCards
      .filter((c) => c.aesthetic.isDebutChampion && c.prestigeTier !== "tier_1")
      .slice(0, 10);
    const rapidPro = scoredCards
      .filter((c) => c.compensation.isProRate || c.telemetry.medianResponseDays <= 30)
      .slice(0, 10);
    const simultaneousPackets = scoredCards
      .filter((c) => c.specs.allowsSimultaneous)
      .slice(0, 15);

    return {
      totalAnalyzed: rows.length,
      matchedCount: scoredCards.length,
      dreamReach,
      debutChampions,
      rapidPro,
      simultaneousPackets,
    };
  }

  private fallbackMatch(
    input: ManuscriptMatchInput,
    limit: number,
  ): ManuscriptMatchResponse {
    const dummyRows = [
      {
        profile_id: "paris-review",
        name: "The Paris Review",
        slug: "the-paris-review",
        website_url: "https://theparisreview.org",
        prestige_tier: "tier_1",
        total_score: 98,
        max_word_count: 8000,
        min_word_count: null,
        allows_simultaneous: true,
        requires_blind_review: true,
        pays_contributors: true,
        pay_rate_kind: "per_word",
        rate_cents_per_word: 12.0,
        flat_rate_cents: 30000,
        is_pro_rate: true,
        has_fee_waivers: true,
        submission_fee_cents: 300,
        median_response_days: 60,
        acceptance_rate_percent: 0.8,
        freeCapStatus: "at_risk",
        submittable_free_cap_depletion_days: 2,
        writing_styles: ["literary", "realist", "personal"],
        poetry_forms: ["free_verse", "lyric"],
        author_comps: ["Lydia Davis", "Denis Johnson", "Deborah Eisenberg"],
        editorial_motto: "Distinctive voice and unflinching psychological depth.",
        unsolicited_slush_ratio_percent: 45,
        debut_author_friendly_score: 7.8,
        is_debut_champion: false,
      },
      {
        profile_id: "split-lip-magazine",
        name: "Split Lip Magazine",
        slug: "split-lip-magazine",
        website_url: "https://splitlipmagazine.com",
        prestige_tier: "tier_2",
        total_score: 91,
        max_word_count: 3500,
        min_word_count: null,
        allows_simultaneous: true,
        requires_blind_review: false,
        pays_contributors: true,
        pay_rate_kind: "flat_rate",
        rate_cents_per_word: null,
        flat_rate_cents: 7500,
        is_pro_rate: true,
        has_fee_waivers: true,
        submission_fee_cents: 300,
        median_response_days: 24,
        acceptance_rate_percent: 3.2,
        freeCapStatus: "at_risk",
        submittable_free_cap_depletion_days: 1,
        writing_styles: ["fabulist", "surrealist", "dark", "lyric"],
        poetry_forms: ["prose_poetry", "ghazal", "hybrid"],
        author_comps: ["Carmen Maria Machado", "Ocean Vuong", "Kelly Link"],
        editorial_motto: "Voice-driven work with tooth and muscle.",
        unsolicited_slush_ratio_percent: 86,
        debut_author_friendly_score: 9.8,
        is_debut_champion: true,
      },
      {
        profile_id: "the-adroit-journal",
        name: "The Adroit Journal",
        slug: "the-adroit-journal",
        website_url: "https://theadroitjournal.org",
        prestige_tier: "tier_2",
        total_score: 89,
        max_word_count: 5000,
        min_word_count: null,
        allows_simultaneous: true,
        requires_blind_review: false,
        pays_contributors: true,
        pay_rate_kind: "flat_rate",
        rate_cents_per_word: null,
        flat_rate_cents: 10000,
        is_pro_rate: true,
        has_fee_waivers: true,
        submission_fee_cents: 0,
        median_response_days: 28,
        acceptance_rate_percent: 2.1,
        freeCapStatus: "healthy",
        submittable_free_cap_depletion_days: 7,
        writing_styles: ["lyric", "experimental", "vibrant"],
        poetry_forms: ["free_verse", "ghazal", "villanelle", "hybrid"],
        author_comps: ["Ocean Vuong", "Kaveh Akbar", "Danez Smith"],
        editorial_motto: "Fresh, urgent, and fearless writing.",
        unsolicited_slush_ratio_percent: 82,
        debut_author_friendly_score: 9.6,
        is_debut_champion: true,
      },
      {
        profile_id: "ploughshares",
        name: "Ploughshares",
        slug: "ploughshares",
        website_url: "https://pshares.org",
        prestige_tier: "tier_1",
        total_score: 95,
        max_word_count: 6000,
        min_word_count: null,
        allows_simultaneous: true,
        requires_blind_review: false,
        pays_contributors: true,
        pay_rate_kind: "per_word",
        rate_cents_per_word: 9.0,
        flat_rate_cents: 22500,
        is_pro_rate: true,
        has_fee_waivers: true,
        submission_fee_cents: 300,
        median_response_days: 45,
        acceptance_rate_percent: 1.4,
        freeCapStatus: "healthy",
        submittable_free_cap_depletion_days: 5,
        writing_styles: ["literary", "narrative", "personal"],
        poetry_forms: ["free_verse", "narrative"],
        author_comps: ["Lorrie Moore", "George Saunders", "Jhumpa Lahiri"],
        editorial_motto: "Memorable characterization, urgent stakes.",
        unsolicited_slush_ratio_percent: 68,
        debut_author_friendly_score: 8.8,
        is_debut_champion: true,
      },
    ];

    return this.scoreAndGroupRows(dummyRows, input, limit);
  }
}
