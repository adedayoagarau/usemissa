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

describe("ManuscriptMatchEngine evidence", () => {
  const engine = new ManuscriptMatchEngine(null);

  it("leaves a magazine with no recorded facts at the neutral score with no reasons", () => {
    const [card] = engine.scoreRows(
      [{ profile_id: "bare", name: "Unrecorded Quarterly", prestige_tier: "unranked" }],
      input,
    );
    assert.equal(card.matchScore, 50);
    assert.deepEqual(card.reasons, []);
    assert.equal(card.specs.allowsSimultaneous, null);
    assert.equal(card.recognition.pushcart, null);
    assert.equal(card.recognition.prizeSelections, 0);
  });

  it("uses the index's cited facts when the detailed tables are empty", () => {
    const [card] = engine.scoreRows(
      [
        {
          profile_id: "indexed",
          name: "Indexed Review",
          rk_pay_kind: "cash",
          rk_charges_fee: false,
          rk_simultaneous: "allowed",
          rk_response_band: "under_3_months",
          rk_debut_friendly: true,
        },
      ],
      { ...input, feeTolerance: "free_only" },
    );
    assert.equal(card.compensation.paysContributors, true);
    assert.equal(card.compensation.submissionFeeCents, 0);
    assert.equal(card.specs.allowsSimultaneous, true);
    assert.equal(card.telemetry.responseBand, "under_3_months");
    assert.ok(card.reasons.includes("Free to submit"));
    assert.ok(card.reasons.includes("Pays contributors"));
    assert.ok(card.reasons.includes("Publishes debut writers"));
    assert.ok(card.matchScore > 50);
  });

  it("marks down a recorded conflict with the brief", () => {
    const [card] = engine.scoreRows(
      [{ profile_id: "strict", name: "Strict Review", rk_simultaneous: "forbidden", rk_charges_fee: true }],
      { ...input, feeTolerance: "free_only" },
    );
    assert.equal(card.specs.allowsSimultaneous, false);
    assert.ok(card.matchScore < 50);
  });

  it("credits prize records and names writers from the brief it has published", () => {
    const [card] = engine.scoreRows(
      [
        {
          profile_id: "prized",
          name: "Prized Review",
          pushcart_rank: 12,
          pushcart_edition: 2025,
          pushcart_genre: "fiction",
          anthology_count: 3,
          anthology_authors: ["Carmen Maria Machado", "Someone Else"],
          anthology_recent: JSON.stringify([
            { anthology: "Best Microfiction", award_year: 2025, author_name: "Someone Else", piece_title: "Piece" },
          ]),
        },
      ],
      input,
    );
    assert.deepEqual(card.recognition.pushcart, { rank: 12, genre: "fiction", edition: 2025 });
    assert.equal(card.recognition.anthologySelections, 3);
    assert.deepEqual(card.recognition.publishedComps, ["Carmen Maria Machado"]);
    assert.equal(card.reasons[0], "Published Carmen Maria Machado");
    assert.equal(card.recognition.recent[0].writer, "Someone Else");
  });

  it("counts stories that prize anthologies picked from the magazine", () => {
    const [card] = engine.scoreRows(
      [{ profile_id: "ny", name: "The New Yorker" }],
      input,
    );
    assert.ok(card.recognition.prizeSelections > 10);
    assert.ok(card.recognition.recent.length > 0);
  });
});

describe("ManuscriptMatchEngine name search", () => {
  function recordingPool(rows: unknown[]) {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const pool = {
      query: async (sql: string, params: unknown[]) => {
        calls.push({ sql, params });
        return { rows };
      },
    } as unknown as Pool;
    return { pool, calls };
  }

  it("filters the index by name with escaped wildcards and returns scored search results", async () => {
    const { pool, calls } = recordingPool([
      { profile_id: "p1", name: "100% Review", prestige_tier: "tier_2", max_word_count: 5000 },
    ]);
    const result = await new ManuscriptMatchEngine(pool).matchManuscript({
      ...input,
      query: " 100%_ ",
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].params[0], "%100\\%\\_%");
    assert.equal(calls[0].params[1], 40);
    assert.equal(result.status, "available");
    assert.equal(result.searchResults?.length, 1);
    assert.equal(result.searchResults?.[0].profileId, "p1");
    assert.deepEqual(result.dreamReach, []);
  });

  it("does not query for a one-character search", async () => {
    const { pool, calls } = recordingPool([]);
    const result = await new ManuscriptMatchEngine(pool).matchManuscript({ ...input, query: "a" });
    assert.equal(calls.length, 0);
    assert.deepEqual(result.searchResults, []);
  });

  it("leaves the full index unfiltered without a query", async () => {
    const { pool, calls } = recordingPool([]);
    const result = await new ManuscriptMatchEngine(pool).matchManuscript(input);
    assert.equal(calls[0].params[0], null);
    assert.equal(calls[0].params[1], 500);
    assert.equal(result.searchResults, undefined);
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
