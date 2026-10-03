import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import {
  ManuscriptMatchEngine,
  indexTierKey,
  manuscriptMatchProfileSlug,
} from "../src/ranking/manuscriptMatchEngine.js";

const input = {
  genre: "fiction" as const,
  wordCount: 3200,
  aestheticTags: ["fabulist", "dark", "lyric"],
  compAuthors: ["Carmen Maria Machado"],
  isDebutAuthor: true,
  allowSimultaneous: true,
};

function poolReturning(rows: unknown[]): Pool {
  return { query: async () => ({ rows }) } as unknown as Pool;
}

function failingPool(): Pool {
  return {
    query: async () => {
      throw new Error("connection refused");
    },
  } as unknown as Pool;
}

function assertEmpty(result: Awaited<ReturnType<ManuscriptMatchEngine["matchManuscript"]>>) {
  assert.equal(result.totalAnalyzed, 0);
  assert.equal(result.matchedCount, 0);
  assert.deepEqual(result.dreamReach, []);
  assert.deepEqual(result.debutChampions, []);
  assert.deepEqual(result.rapidPro, []);
  assert.deepEqual(result.simultaneousPackets, []);
}

describe("ManuscriptMatchEngine", () => {
  it("reports the index as unavailable without a database instead of inventing publications", async () => {
    const result = await new ManuscriptMatchEngine(null).matchManuscript(input);
    assert.equal(result.status, "unavailable");
    assertEmpty(result);
  });

  it("reports the index as unavailable when the query fails", async () => {
    const result = await new ManuscriptMatchEngine(failingPool()).matchManuscript(input);
    assert.equal(result.status, "unavailable");
    assertEmpty(result);
  });

  it("returns an honest empty result when the index has no publications", async () => {
    const result = await new ManuscriptMatchEngine(poolReturning([])).matchManuscript(input);
    assert.equal(result.status, "available");
    assertEmpty(result);
  });

  it("scores stored rows and leaves missing figures empty", async () => {
    const result = await new ManuscriptMatchEngine(
      poolReturning([
        {
          profile_id: "profile-with-records",
          name: "Example Review",
          slug: "example review",
          website_url: null,
          prestige_tier: "tier_2",
          max_word_count: 5000,
          allows_simultaneous: true,
          writing_styles: ["fabulist"],
          author_comps: ["Carmen Maria Machado"],
          is_debut_champion: true,
          unsolicited_slush_ratio_percent: 80,
          is_pro_rate: true,
          pays_contributors: true,
          median_response_days: 20,
        },
        {
          profile_id: "profile-without-records",
          name: "Bare Quarterly",
          slug: "bare quarterly",
          website_url: null,
          prestige_tier: "unranked",
        },
      ]),
    ).matchManuscript(input);

    assert.equal(result.status, "available");
    assert.equal(result.totalAnalyzed, 2);

    const withRecords = result.debutChampions.find((c) => c.profileId === "profile-with-records");
    assert.ok(withRecords);
    assert.equal(withRecords.slug, "example-review");
    assert.equal(withRecords.telemetry.medianResponseDays, 20);
    assert.ok(withRecords.reasons.includes("Publishes debut writers"));

    const bare = result.simultaneousPackets.find((c) => c.profileId === "profile-without-records");
    assert.ok(bare);
    assert.equal(bare.telemetry.medianResponseDays, null);
    assert.equal(bare.telemetry.acceptanceRatePercent, null);
    assert.equal(bare.telemetry.freeCapStatus, null);
    assert.equal(bare.aesthetic.unsolicitedSlushRatioPercent, null);
    assert.equal(bare.aesthetic.debutAuthorFriendlyScore, null);
    assert.equal(bare.aesthetic.isDebutChampion, false);
    assert.deepEqual(bare.aesthetic.writingStyles, []);
    assert.equal(bare.compensation.paysContributors, null);
    assert.equal(bare.compensation.payRateKind, null);
    assert.equal(bare.compensation.submissionFeeCents, null);
    assert.equal(result.debutChampions.some((c) => c.profileId === "profile-without-records"), false);
  });
});

it("uses the same URL-safe publication slug as public profile routes", () => {
  assert.equal(manuscriptMatchProfileSlug("A Public Space", "a public space"), "a-public-space");
  assert.equal(manuscriptMatchProfileSlug("Adroit Journal", "adroit journal"), "adroit-journal");
  assert.equal(manuscriptMatchProfileSlug("Cincinnati Review", "cincinnati review"), "cincinnati-review");
});

describe("indexTierKey", () => {
  it("maps stored index tier labels to match-card keys", () => {
    assert.equal(indexTierKey("Tier 1 (Flagship Luminary)"), "tier_1");
    assert.equal(indexTierKey("Tier 2 (High Distinction)"), "tier_2");
    assert.equal(indexTierKey("Tier 3 (Distinguished Contemporary)"), "tier_3");
    assert.equal(indexTierKey("Tier 4 (Emerging & Community)"), "tier_3");
    assert.equal(indexTierKey("tier_2"), "tier_2");
    assert.equal(indexTierKey(null), "unranked");
    assert.equal(indexTierKey("unranked"), "unranked");
  });
});
