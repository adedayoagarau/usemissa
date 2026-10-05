import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RadarEngine,
  ManualClock,
  createStore,
  FixtureFetcher,
  findCanonical,
  findDedupNearMisses,
  type DedupNearMiss,
  type Extractor,
  type Opportunity,
  type OpportunityCandidate,
} from "../src/index.js";

function opportunity(
  id: string,
  title: string,
  organizationName: string,
): Opportunity {
  return {
    id,
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "open",
    fields: {
      title,
      organizationName,
      type: "contest",
      genres: [],
      deadline: { kind: "unknown" },
      fee: { disclosed: false },
      eligibility: [],
      requiredMaterials: [],
      contactEmailPresent: false,
    },
    sourceId: `src_${id}`,
    sourceUrl: `https://example.org/${id}`,
    alternateSourceIds: [],
    scores: { freshness: 100, confidence: 80, trust: 50 },
    trustSignals: [],
    lastCheckedAt: "2026-01-01T00:00:00.000Z",
    lastChangedAt: "2026-01-01T00:00:00.000Z",
    lastExtractionConfidence: 80,
    lastOpenSignal: true,
    lastClosedSignal: false,
    lastSuspiciousSignals: [],
    pastCycles: [],
    conflicts: [],
  };
}

function candidate(
  title: string,
  organizationName: string,
  sourceId = "src_new",
): OpportunityCandidate {
  return {
    sourceId,
    snapshotId: `snap_${sourceId}`,
    url: `https://directory.example/${sourceId}`,
    extractedAt: "2026-08-12T00:00:00.000Z",
    title,
    organizationName,
    type: "contest",
    genres: [],
    deadline: { kind: "unknown" },
    fee: { disclosed: false },
    eligibility: [],
    requiredMaterials: [],
    contactEmailPresent: false,
    openSignals: [],
    closeSignals: [],
    closedSignals: [],
    suspiciousSignals: [],
    issues: [],
    extractionConfidence: 90,
  };
}

test("near misses are the pairs findCanonical deliberately left unmerged", () => {
  const existing = [
    opportunity("opp_poetry", "North River Poetry Prize", "North River Review"),
    opportunity(
      "opp_fiction",
      "North River Fiction Prize",
      "North River Review",
    ),
    opportunity(
      "opp_other_org",
      "North River Poetry Prize",
      "South Lake Press",
    ),
    opportunity("opp_film", "Documentary Film Fund", "North River Review"),
  ];
  const incoming = candidate("North River Poetry Prize", "North River Review");
  const match = findCanonical(incoming, existing);
  assert.equal(match.kind, "duplicate");
  const nearMisses = findDedupNearMisses(incoming, existing, match);
  assert.deepEqual(
    nearMisses.map((miss) => [miss.opportunity.id, miss.reason]),
    [
      ["opp_other_org", "same-title-different-organization"],
      ["opp_fiction", "similar-title-same-organization"],
    ],
  );
});

test("machine feed records never produce near misses", () => {
  const existing = [
    opportunity("opp_1", "North River Fiction Prize", "North River Review"),
  ];
  const incoming = {
    ...candidate("North River Poetry Prize", "North River Review"),
    discoveryExternalId: "feed:1",
  };
  assert.deepEqual(
    findDedupNearMisses(incoming, existing, { kind: "new" }),
    [],
  );
});

test("the engine reports near misses to the decider and ignores its failures", async () => {
  async function run(
    decider?: (
      candidate: OpportunityCandidate,
      nearMisses: DedupNearMiss[],
    ) => Promise<void>,
  ) {
    const clock = new ManualClock(new Date("2026-08-12T00:00:00Z"));
    const fetcher = new FixtureFetcher();
    const titles: Record<string, string> = {
      "https://northriver.example/poetry": "North River Poetry Prize",
      "https://northriver.example/fiction": "North River Fiction Prize",
    };
    for (const url of Object.keys(titles))
      fetcher.setPage(url, `${titles[url]}. Submissions are open.`);
    const extractor: Extractor = {
      extract(source, snapshot) {
        return {
          ...candidate(source.name, "North River Review", source.id),
          url: source.url,
          snapshotId: snapshot.id,
          deadline: { kind: "exact" as const, date: "2026-10-05" },
          openSignals: ["submissions are open"],
          closeSignals: ["deadline"],
        };
      },
    };
    const engine = new RadarEngine({
      store: createStore(),
      fetcher,
      extractor,
      clock,
      dedupIdentityDecider: decider,
    });
    engine.addSource({
      name: "North River Poetry Prize",
      url: "https://northriver.example/poetry",
      kind: "organization-website",
    });
    engine.addSource({
      name: "North River Fiction Prize",
      url: "https://northriver.example/fiction",
      kind: "organization-website",
    });
    const report = await engine.tick();
    assert.equal(engine.store.opportunities.size, 2);
    return {
      report,
      titles: [...engine.store.opportunities.values()]
        .map((opp) => opp.fields.title)
        .sort(),
    };
  }

  const calls: Array<[string | undefined, string[]]> = [];
  const baseline = await run();
  const recorded = await run(async (incoming, nearMisses) => {
    calls.push([
      incoming.title,
      nearMisses.map((miss) => miss.opportunity.fields.title),
    ]);
  });
  const failing = await run(async () => {
    throw new Error("identity model unavailable");
  });

  // Only the second source processed sees the first as a near miss.
  assert.equal(calls.length, 1);
  assert.deepEqual([calls[0]![0], ...calls[0]![1]].sort(), [
    "North River Fiction Prize",
    "North River Poetry Prize",
  ]);
  for (const result of [recorded, failing]) {
    assert.deepEqual(result.titles, baseline.titles);
    assert.equal(
      result.report.opportunitiesCreated.length,
      baseline.report.opportunitiesCreated.length,
    );
    assert.equal(
      result.report.duplicatesMerged,
      baseline.report.duplicatesMerged,
    );
    assert.equal(
      result.report.processingFailures,
      baseline.report.processingFailures,
    );
  }
});
