import { Pool } from "pg";
import { missaPostgresPoolConfig } from "@missa/radar-adapters";
import {
  PostgresResidencyRankingRepository,
  type ResidencyRankingRow,
  type ResidencyReviewRow,
  type ResidencyRankingPage,
  type ResidencyRankingsFilter,
  type SubmitResidencyReviewInput,
  type SubmitResidencyReviewResult,
} from "@missa/radar-adapters";

declare global {
  var __missaResidencyRankingRepo: PostgresResidencyRankingRepository | undefined;
}

type PostgresError = Error & { code?: string };

function isUndefinedTableError(error: unknown): error is PostgresError {
  return error instanceof Error && (error as PostgresError).code === "42P01";
}

export function getResidencyRankingRepository(): {
  listRankings: (filter?: ResidencyRankingsFilter) => Promise<ResidencyRankingPage & { dataSource: "database" | "empty" }>;
  getReviews: (profileId: string) => Promise<ResidencyReviewRow[]>;
  getDetail: (profileId: string) => Promise<(ResidencyRankingRow & { reviews: ResidencyReviewRow[] }) | null>;
  getIntelligence: (profileId: string) => Promise<import("@missa/radar-adapters").ResidencyFullIntelligenceProfile | null>;
  recordReview: (input: SubmitResidencyReviewInput) => Promise<SubmitResidencyReviewResult>;
} {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return {
      listRankings: async () => ({
        items: [],
        total: 0,
        dataSource: "empty",
      }),
      getReviews: async () => [],
      getDetail: async () => null,
      getIntelligence: async () => null,
      recordReview: async () => ({
        success: false,
        reviewId: "",
        newRating: 0,
        newTotalScore: 0,
      }),
    };
  }

  if (!globalThis.__missaResidencyRankingRepo) {
    const pool = new Pool({
      ...missaPostgresPoolConfig(connectionString, "catalogue"),
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
    globalThis.__missaResidencyRankingRepo = new PostgresResidencyRankingRepository(pool);
  }

  const repo = globalThis.__missaResidencyRankingRepo;

  return {
    listRankings: async (filter = {}) => {
      try {
        const page = await repo.listResidencyRankings(filter);
        return { ...page, dataSource: page.items.length > 0 ? "database" : "empty" };
      } catch (error) {
        if (!isUndefinedTableError(error)) throw error;
        console.warn(
          "Residency rankings table is unavailable; serving the intentional empty state.",
        );
        return { items: [], total: 0, dataSource: "empty" };
      }
    },
    getReviews: async (profileId: string) => {
      return repo.getResidencyReviews(profileId);
    },
    getDetail: async (profileId: string) => {
      return repo.getResidencyDetail(profileId);
    },
    getIntelligence: async (profileId: string) => {
      return repo.getResidencyIntelligence(profileId);
    },
    recordReview: async (input: SubmitResidencyReviewInput) => {
      return repo.recordResidencyReview(input);
    },
  };
}
