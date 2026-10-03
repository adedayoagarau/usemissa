import { Pool } from "pg";
import { missaPostgresPoolConfig } from "@missa/radar-adapters";
import {
  PostgresEditorialIntelligenceRepository,
  type EditorialIntelligenceFullProfile,
} from "@missa/radar-adapters";

declare global {
  var __missaEditorialIntelRepo: PostgresEditorialIntelligenceRepository | undefined;
}

type EditorialIntelligenceLookup = {
  getIntelligenceByProfileId: (profileId: string) => Promise<EditorialIntelligenceFullProfile | null>;
  getIntelligenceBySlug: (slug: string) => Promise<EditorialIntelligenceFullProfile | null>;
  getIntelligenceForProfile: (profileId: string, profileName?: string) => Promise<EditorialIntelligenceFullProfile | null>;
};

/**
 * Editorial intelligence comes only from stored, sourced rows. When a
 * publication has no row (or no database is configured) every lookup returns
 * null so the interface omits the section instead of inventing figures.
 */
const emptyEditorialIntelligence: EditorialIntelligenceLookup = {
  getIntelligenceByProfileId: async () => null,
  getIntelligenceBySlug: async () => null,
  getIntelligenceForProfile: async () => null,
};

export function getEditorialIntelligenceRepository(): EditorialIntelligenceLookup {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return emptyEditorialIntelligence;
  }

  if (!globalThis.__missaEditorialIntelRepo) {
    const pool = new Pool(missaPostgresPoolConfig(connectionString, "creator"));
    globalThis.__missaEditorialIntelRepo = new PostgresEditorialIntelligenceRepository(pool);
  }

  const repo = globalThis.__missaEditorialIntelRepo;

  return {
    getIntelligenceByProfileId: (profileId: string) => repo.getIntelligenceByProfileId(profileId),
    getIntelligenceBySlug: (slug: string) => repo.getIntelligenceBySlug(slug),
    getIntelligenceForProfile: async (profileId: string) => {
      const result = await repo.getIntelligenceByProfileId(profileId);
      if (result) return result;
      return repo.getIntelligenceBySlug(profileId);
    },
  };
}
