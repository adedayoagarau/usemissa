import { Pool } from "pg";
import {
  PostgresMagazineRankingRepository,
  type MagazineRankingRow,
  type MagazineRankingPage,
  type MagazineRankingsFilter,
} from "@missa/radar-adapters";
import { rankMagazines, type RankingGenre } from "@missa/radar-engine";
import { SEED_MAGAZINES } from "@missa/radar-adapters/dist/src/ranking/data/seedRankings.js";

declare global {
  var __missaRankingRepo: PostgresMagazineRankingRepository | undefined;
}

let memoryCache: MagazineRankingRow[] | null = null;

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
      });

      // Specific genres
      for (const [g, gScore] of Object.entries(item.genres) as Array<[RankingGenre, any]>) {
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
  listRankings: (filter?: MagazineRankingsFilter) => Promise<MagazineRankingPage>;
  getMagazineStanding: (profileId: string) => Promise<MagazineRankingRow[]>;
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
      recordSubmissionTelemetry: async () => ({ success: true, newMedianDays: null }),
    };
  }

  if (!globalThis.__missaRankingRepo) {
    const pool = new Pool({ connectionString });
    globalThis.__missaRankingRepo = new PostgresMagazineRankingRepository(pool);
  }

  const repo = globalThis.__missaRankingRepo;

  return {
    listRankings: async (filter = {}) => {
      const page = await repo.listRankings(filter);
      if (page.items.length > 0) return page;

      // Graceful fallback to seeded engine computations if DB isn't hydrated yet
      const genre = filter.genre ?? "overall";
      const fallback = getFallbackRankings(genre);
      return {
        items: fallback.slice(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? 50)),
        total: fallback.length,
        year: filter.year ?? 2026,
        genre,
      };
    },
    getMagazineStanding: async (profileId: string) => {
      const standing = await repo.getMagazineStanding(profileId);
      if (standing.length > 0) return standing;

      const all = getFallbackRankings("overall");
      return all.filter((r) => r.profileId === profileId);
    },
    recordSubmissionTelemetry: async (input) => {
      return repo.recordSubmissionTelemetry(input);
    },
  };
}
