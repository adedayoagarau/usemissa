import { Pool } from "pg";
import { missaPostgresPoolConfig } from "@missa/radar-adapters";
import {
  PostgresMagazineRankingRepository,
  type MagazineRankingRow,
  type MagazineRankingPage,
  type MagazineRankingsFilter,
  type MagazineTelemetrySummary,
} from "@missa/radar-adapters";
import { rankMagazines, type RankingGenre, type ScoreBreakdown } from "@missa/radar-engine";
import { SEED_MAGAZINES } from "@missa/radar-adapters/dist/src/ranking/data/seedRankings.js";

declare global {
  var __missaRankingRepo: PostgresMagazineRankingRepository | undefined;
}

let memoryCache: MagazineRankingRow[] | null = null;

type PostgresError = Error & { code?: string };

function isUndefinedTableError(error: unknown): error is PostgresError {
  return error instanceof Error && (error as PostgresError).code === "42P01";
}

function getFallbackRankings(genre: RankingGenre = "overall"): MagazineRankingRow[] {
  if (!memoryCache) {
    const computed = rankMagazines(SEED_MAGAZINES, 2026);
    const rows: MagazineRankingRow[] = [];

    for (const item of computed) {
      // Overall
      rows.push({
        profileId: item.profileId,
        name: item.name,
        slug: item.profileId,
        websiteUrl: null,
        mediaUrl: null,
        rankingYear: 2026,
        genre: "overall",
        rankPosition: item.overall.rankPosition,
        previousYearRank: null,
        rankDelta: null,
        prestigeTier: item.overall.tier,
        totalScore: item.overall.totalScore,
        accoladesScore: item.overall.accoladesScore,
        payScore: item.overall.payScore,
        turnaroundScore: item.overall.turnaroundScore,
        feesScore: item.overall.feesScore,
        respectScore: item.overall.respectScore,
        formatEthicsScore: item.overall.formatAndEthicsScore,
        medianResponseDays: null,
        regularFeeCents: 0,
        contributorPayCents: 0,
        simultaneousPolicy: "allowed",
        activeOpportunity: null,
        schedule: null,
      });

      // Specific genres
      for (const [g, gScore] of Object.entries(item.genres) as Array<
        [
          Exclude<RankingGenre, "overall">,
          (ScoreBreakdown & { rankPosition: number }) | undefined,
        ]
      >) {
        if (!gScore) continue;
        rows.push({
          profileId: item.profileId,
          name: item.name,
          slug: item.profileId,
          websiteUrl: null,
          mediaUrl: null,
          rankingYear: 2026,
          genre: g,
          rankPosition: gScore.rankPosition,
          previousYearRank: null,
          rankDelta: null,
          prestigeTier: gScore.tier,
          totalScore: gScore.totalScore,
          accoladesScore: gScore.accoladesScore,
          payScore: gScore.payScore,
          turnaroundScore: gScore.turnaroundScore,
          feesScore: gScore.feesScore,
          respectScore: gScore.respectScore,
          formatEthicsScore: gScore.formatAndEthicsScore,
          medianResponseDays: null,
          regularFeeCents: 0,
          contributorPayCents: 0,
          simultaneousPolicy: "allowed",
          activeOpportunity: null,
          schedule: null,
        });
      }
    }
    memoryCache = rows;
  }

  return memoryCache
    .filter((r) => r.genre === genre)
    .sort((a, b) => a.rankPosition - b.rankPosition);
}

export function getMagazineRankingRepository(): {
  listRankings: (filter?: MagazineRankingsFilter) => Promise<MagazineRankingPage & { dataSource: "seed" | "database" }>;
  getMagazineStanding: (profileId: string) => Promise<MagazineRankingRow[]>;
  getTelemetrySummary: (profileId: string) => Promise<MagazineTelemetrySummary>;
  recordSubmissionTelemetry: (input: {
    profileId: string;
    userId?: string | null;
    genre?: string | null;
    submittedDate: string;
    decisionDate?: string | null;
    responseDays?: number | null;
    outcome?: "accepted" | "rejected" | "withdrawn" | "pending" | null;
    rejectionType?: "form" | "tiered_personal" | "editor_note" | null;
    feePaidCents?: number;
  }) => Promise<{ success: boolean; newMedianDays: number | null }>;
} {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return {
      listRankings: async (filter = {}) => {
        const genre = filter.genre ?? "overall";
        const all = getFallbackRankings(genre);
        return {
          dataSource: "seed",
          items: all.slice(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? 50)),
          total: all.length,
          year: filter.year ?? 2026,
          genre,
        };
      },
      getMagazineStanding: async (profileId: string) => {
        const all = getFallbackRankings("overall");
        return all.filter((r) => r.profileId === profileId);
      },
      getTelemetrySummary: async (profileId: string) => ({
        profileId,
        sampleSize: 0,
        decidedReports: 0,
        acceptanceRate: null,
        medianResponseDays: null,
        p90ResponseDays: null,
        distribution: {
          under30: 0,
          days31To60: 0,
          days61To90: 0,
          days90Plus: 0,
        },
        outcomes: {
          accepted: 0,
          personalRejections: 0,
          formRejections: 0,
          withdrawn: 0,
          pending: 0,
        },
        latestReportAt: null,
      }),
      recordSubmissionTelemetry: async () => ({ success: true, newMedianDays: null }),
    };
  }

  if (!globalThis.__missaRankingRepo) {
    const pool = new Pool(missaPostgresPoolConfig(connectionString, "catalogue"));
    globalThis.__missaRankingRepo = new PostgresMagazineRankingRepository(pool);
  }

  const repo = globalThis.__missaRankingRepo;

  return {
    listRankings: async (filter = {}) => {
      try {
        const page = await repo.listRankings(filter);
        if (page.items.length > 0) return { ...page, dataSource: "database" };
      } catch (error) {
        if (!isUndefinedTableError(error)) throw error;
        console.warn(
          "Magazine rankings table is unavailable; serving the verified preview dataset.",
        );
      }

      // Graceful fallback to seeded engine computations if DB isn't hydrated yet
      const genre = filter.genre ?? "overall";
      const fallback = getFallbackRankings(genre);
      return {
        dataSource: "seed",
        items: fallback.slice(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? 50)),
        total: fallback.length,
        year: filter.year ?? 2026,
        genre,
      };
    },
    getMagazineStanding: async (profileId: string) => {
      try {
        const standing = await repo.getMagazineStanding(profileId);
        if (standing.length > 0) return standing;
      } catch (error) {
        if (!isUndefinedTableError(error)) throw error;
        console.warn(
          "Magazine rankings table is unavailable; serving the verified preview dataset.",
        );
      }

      const all = getFallbackRankings("overall");
      return all.filter((r) => r.profileId === profileId);
    },
    getTelemetrySummary: async (profileId: string) => {
      return repo.getTelemetrySummary(profileId);
    },
    recordSubmissionTelemetry: async (input) => {
      return repo.recordSubmissionTelemetry(input);
    },
  };
}
