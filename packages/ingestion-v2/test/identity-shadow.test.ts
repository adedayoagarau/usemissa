import test from "node:test";
import assert from "node:assert/strict";
import {
  createJevClient,
  createMemoryDecisionLedger,
  type JevResponse,
} from "@missa/decisions";
import {
  createBenchmarkSources,
  createOpportunityIdentityShadow,
  opportunityIdentityShadowFromEnv,
  reviewForPublication,
  type PublisherInput,
} from "../src/index.js";

function fakeFetch(noul: number | Error): typeof fetch {
  return (async () => {
    if (noul instanceof Error) throw noul;
    const body: JevResponse = {
      model: "jev-test",
      answers: { q0: { type: "noul", noul } },
    };
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
}

function ambiguousInput(): PublisherInput {
  const source = {
    ...createBenchmarkSources()[0]!,
    config: {
      destination: {
        pageRole: "landing" as const,
        rules: [
          {
            role: "detail" as const,
            patterns: ["/detail/"],
            authority: "destination" as const,
          },
        ],
      },
    },
  };
  const url = "https://example.test/detail/prize";
  const sourceSnapshot = {
    id: "snap_source",
    runId: "ingv2_identity",
    sourceId: source.id,
    url: source.url,
    finalUrl: source.url,
    fetchedAt: new Date().toISOString(),
    statusCode: 200,
    contentType: "text/html",
    contentHash: "source",
    html: "<h1>Example Prize</h1>",
    rendered: false,
  };
  const field = (fieldName: string, value: string, snapshotId: string) => ({
    fieldName,
    rawValue: value,
    normalizedValue: value,
    confidence: 1,
    provenance: {
      adapterId: "test",
      method: "fixture",
      sourceUrl: url,
      snapshotId,
    },
  });
  return {
    source,
    sourceSnapshot,
    // Same title, different organization, and a destination URL that does not
    // canonicalize: the deterministic comparison leaves this pair in "review".
    sourceExtraction: {
      fields: [
        field("title", "Example Prize", "snap_source"),
        field("organization", "Example Foundation", "snap_source"),
      ],
      candidateLinks: [{ url, role: "detail", authority: "destination" }],
      warnings: [],
    },
    relatedSnapshots: [
      {
        ...sourceSnapshot,
        id: "snap_detail",
        url: "/detail/prize",
        finalUrl: "/detail/prize",
      },
    ],
    relatedFields: [
      field("title", "Example Prize", "snap_detail"),
      field("organization", "Another Trust", "snap_detail"),
    ],
    candidate: {
      url: "/detail/prize",
      role: "detail",
      authority: "destination",
    },
  };
}

test("an ambiguous identity is recorded as a shadow same_opportunity decision", async () => {
  const ledger = createMemoryDecisionLedger();
  const identityShadow = createOpportunityIdentityShadow({
    client: createJevClient({ apiKey: "k", fetch: fakeFetch(0.97) }),
    ledger,
  });
  const withShadow = await reviewForPublication(ambiguousInput(), {
    apiKey: "",
    identityShadow,
  });
  const without = await reviewForPublication(ambiguousInput(), { apiKey: "" });

  assert.equal(without.reconciliation.decision, "review");
  assert.deepEqual(withShadow, without);
  assert.equal(ledger.records.length, 1);
  const [record] = ledger.records;
  assert.equal(record?.questionKey, "identity.same_opportunity");
  assert.equal(record?.subjectType, "opportunity_pair");
  assert.equal(record?.mode, "shadow");
  assert.equal(record?.route, "apply");
});

test("a failing Jev call leaves publisher review unchanged", async () => {
  const warnings: string[] = [];
  const ledger = createMemoryDecisionLedger();
  const identityShadow = createOpportunityIdentityShadow({
    client: createJevClient({
      apiKey: "k",
      fetch: fakeFetch(new Error("boom")),
      maxRetries: 0,
    }),
    ledger,
    logger: { warn: (message: string) => warnings.push(message) },
  });
  const review = await reviewForPublication(ambiguousInput(), {
    apiKey: "",
    identityShadow,
  });
  assert.equal(review.decision, "review");
  assert.equal(ledger.records.length, 0);
  assert.equal(warnings.length, 1);
});

test("no shadow is built without JEV_API_KEY", () => {
  const db = { query: async () => ({ rows: [] }) };
  assert.equal(opportunityIdentityShadowFromEnv(db, {}), undefined);
  assert.equal(
    typeof opportunityIdentityShadowFromEnv(db, { JEV_API_KEY: "k" }),
    "function",
  );
});
