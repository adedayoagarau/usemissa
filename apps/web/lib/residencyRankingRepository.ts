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
import { catalogueReadDatabaseUrl } from "./catalogueDatabase";

declare global {
  var __missaResidencyRankingReadRepo: PostgresResidencyRankingRepository | undefined;
  var __missaResidencyRankingWriteRepo: PostgresResidencyRankingRepository | undefined;
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
  const readConnectionString = catalogueReadDatabaseUrl();
  if (!readConnectionString) {
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

  if (!globalThis.__missaResidencyRankingReadRepo) {
    const pool = new Pool({
      ...missaPostgresPoolConfig(readConnectionString, "catalogue"),
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
    globalThis.__missaResidencyRankingReadRepo = new PostgresResidencyRankingRepository(pool);
  }

  const readRepo = globalThis.__missaResidencyRankingReadRepo;
  const applicationConnectionString = process.env.DATABASE_URL?.trim();
  if (applicationConnectionString && !globalThis.__missaResidencyRankingWriteRepo) {
    const pool = new Pool({
      ...missaPostgresPoolConfig(applicationConnectionString, "creator"),
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
    globalThis.__missaResidencyRankingWriteRepo = new PostgresResidencyRankingRepository(pool);
  }
  const writeRepo = globalThis.__missaResidencyRankingWriteRepo;

  return {
    listRankings: async (filter = {}) => {
      try {
        const page = await readRepo.listResidencyRankings(filter);
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
      return readRepo.getResidencyReviews(profileId);
    },
    getDetail: async (profileId: string) => {
      return readRepo.getResidencyDetail(profileId);
    },
    getIntelligence: async (profileId: string) => {
      return readRepo.getResidencyIntelligence(profileId);
    },
    recordReview: async (input: SubmitResidencyReviewInput) => {
      if (!writeRepo) {
        return { success: false, reviewId: "", newRating: 0, newTotalScore: 0 };
      }
      return writeRepo.recordResidencyReview(input);
    },
  };
}
