import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { PostgresEditorialIntelligenceRepository } from "../src/ranking/editorialIntelligenceRepository.js";

type Tables = Partial<Record<string, unknown[]>>;

function fakePool(tables: Tables): Pool {
  return {
    query: async (sql: string) => {
      const table = [
        "gary_profiles",
        "publication_editorial_specs",
        "publication_compensation_details",
        "publication_telemetry_analytics",
        "publication_aesthetic_profiles",
        "opportunity_contest_judges",
        "magazine_editorial_masthead",
        "missa_literary_awards",
      ].find((name) => sql.includes(`FROM ${name}`));
      return { rows: (table && tables[table]) ?? [] };
    },
  } as unknown as Pool;
}

const profile = {
  profile_id: "p1",
  name: "Example Review",
  slug: "example-review",
  website_url: null,
  prestige_tier: null,
};

describe("PostgresEditorialIntelligenceRepository", () => {
  it("returns null when a publication has no stored editorial records", async () => {
    const repo = new PostgresEditorialIntelligenceRepository(
      fakePool({ gary_profiles: [profile] }),
    );
    assert.equal(await repo.getIntelligenceByProfileId("p1"), null);
  });

  it("returns only stored sections and leaves missing figures empty", async () => {
    const repo = new PostgresEditorialIntelligenceRepository(
      fakePool({
        gary_profiles: [profile],
        publication_telemetry_analytics: [{ median_response_days: 40 }],
      }),
    );
    const result = await repo.getIntelligenceByProfileId("p1");
    assert.ok(result);
    assert.equal(result.prestigeTier, null);
    assert.equal(result.specs, null);
    assert.equal(result.compensation, null);
    assert.equal(result.aesthetic, null);
    assert.deepEqual(result.judges, []);
    assert.ok(result.telemetry);
    assert.equal(result.telemetry.medianResponseDays, 40);
    assert.equal(result.telemetry.acceptanceRatePercent, null);
    assert.equal(result.telemetry.freeCapStatus, null);
    assert.deepEqual(result.telemetry.responseCurveDistribution, []);
    assert.equal(result.telemetry.lastTelemetryUpdateAt, null);
  });
});
