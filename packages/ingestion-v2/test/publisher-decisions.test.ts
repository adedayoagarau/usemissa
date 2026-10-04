import test from "node:test";
import assert from "node:assert/strict";
import {
  CONFIRMING_QUESTIONS,
  createJevClient,
  createMemoryDecisionLedger,
  type JevAnswer,
} from "@missa/decisions";
import {
  createBenchmarkSources,
  publisherDecisionContextFromEnv,
  reviewForPublication,
  type PublisherDecisionContext,
  type PublisherInput,
} from "../src/index.js";

const choice = (value: string, probability = 0.97): JevAnswer => ({
  type: "choice",
  choice: value,
  probabilities: { [value]: probability },
  confidence: probability,
});
const noul = (probability: number): JevAnswer => ({
  type: "noul",
  noul: probability,
});

const APPROVE = {
  "opportunity.publication_route": choice("publish"),
  "opportunity.is_single_real_opportunity": noul(0.97),
};
const REJECT = {
  "opportunity.publication_route": choice("suppress"),
  "opportunity.is_single_real_opportunity": noul(0.02),
};

function jevContext(
  mode: "shadow" | "live",
  answers: Record<string, JevAnswer>,
): PublisherDecisionContext & {
  ledger: ReturnType<typeof createMemoryDecisionLedger>;
  calls: number;
} {
  const keyByInstructions = new Map(
    CONFIRMING_QUESTIONS.map((definition) => [
      definition.question.instructions,
      definition.key,
    ]),
  );
  const ledger = createMemoryDecisionLedger();
  const context = {
    ledger,
    mode,
    calls: 0,
    logger: { warn: () => undefined },
    client: createJevClient({
      apiKey: "k",
      maxRetries: 0,
      fetch: (async (_url: string, init: RequestInit) => {
        context.calls += 1;
        const body = JSON.parse(String(init.body)) as {
          questions: Record<string, { instructions: string }>;
        };
        const out: Record<string, JevAnswer> = {};
        for (const [id, question] of Object.entries(body.questions)) {
          const answer =
            answers[keyByInstructions.get(question.instructions) ?? ""];
          if (answer) out[id] = answer;
        }
        return new Response(
          JSON.stringify({ model: "jev-test", answers: out }),
          { status: 200 },
        );
      }) as typeof fetch,
    }),
  };
  return context;
}

function reconciledInput(): PublisherInput {
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
  const sourceSnapshot = {
    id: "snap_source",
    runId: "ingv2_confirming",
    sourceId: source.id,
    url: source.url,
    finalUrl: source.url,
    fetchedAt: "2026-10-04T00:00:00.000Z",
    statusCode: 200,
    contentType: "text/html",
    contentHash: "source",
    html: "<h1>Example Prize</h1>",
    rendered: false,
  };
  const fields = (snapshotId: string) => [
    {
      fieldName: "title",
      rawValue: "Example Prize",
      normalizedValue: "Example Prize",
      confidence: 1,
      provenance: {
        adapterId: "test",
        method: "fixture",
        sourceUrl: "https://example.test/detail/prize",
        snapshotId,
      },
    },
    {
      fieldName: "organization",
      rawValue: "Example Foundation",
      normalizedValue: "Example Foundation",
      confidence: 1,
      provenance: {
        adapterId: "test",
        method: "fixture",
        sourceUrl: "https://example.test/detail/prize",
        snapshotId,
      },
    },
  ];
  return {
    source,
    sourceSnapshot,
    sourceExtraction: {
      fields: fields("snap_source"),
      candidateLinks: [
        {
          url: "https://example.test/detail/prize",
          role: "detail",
          authority: "destination",
        },
      ],
      warnings: [],
    },
    relatedSnapshots: [
      {
        ...sourceSnapshot,
        id: "snap_detail",
        url: "https://example.test/detail/prize",
        finalUrl: "https://example.test/detail/prize",
        html: "<h1>Example Prize</h1><p>Apply by December 1.</p>",
      },
    ],
    relatedFields: fields("snap_detail"),
  };
}

/** Fakes the DeepSeek endpoint through global fetch; returns how often it was called. */
async function withDeepSeek<T>(
  decision: "approve" | "review" | "reject",
  run: (calls: { count: number }) => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  const calls = { count: 0 };
  globalThis.fetch = (async () => {
    calls.count += 1;
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({ decision, reason: "fixture" }),
            },
          },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

test("publisher without a Jev key behaves exactly as before", async () => {
  const noJev = publisherDecisionContextFromEnv(undefined, {
    DECISIONS_MODE_INGESTION_PUBLISHER: "live",
  });
  await withDeepSeek("review", async (calls) => {
    const review = await reviewForPublication(reconciledInput(), {
      apiKey: "deepseek",
      decisions: noJev,
    });
    assert.equal(review.decision, "review");
    assert.equal(review.model, "deepseek");
    assert.equal(calls.count, 1);
  });
  const unconfigured = await reviewForPublication(reconciledInput(), {
    apiKey: "",
    decisions: noJev,
  });
  assert.equal(unconfigured.model, "deterministic");
  assert.equal(unconfigured.decision, "review");
});

test("publisher shadow records Jev and DeepSeek and keeps DeepSeek's verdict", async () => {
  const context = jevContext("shadow", APPROVE);
  await withDeepSeek("review", async (calls) => {
    const review = await reviewForPublication(reconciledInput(), {
      apiKey: "deepseek",
      decisions: context,
    });
    assert.equal(review.decision, "review");
    assert.equal(review.model, "deepseek");
    assert.equal(review.publicWrite, false);
    assert.equal(calls.count, 1);
  });
  assert.equal(context.calls, 1);
  const jevRow = context.ledger.records.find(
    (row) =>
      row.deciderKind === "jev" &&
      row.questionKey === "opportunity.publication_route",
  );
  const llmRow = context.ledger.records.find(
    (row) => row.deciderKind === "llm",
  );
  assert.equal(jevRow?.answer, "publish");
  assert.equal(jevRow?.mode, "shadow");
  assert.equal(llmRow?.decider, "deepseek-publisher");
  assert.equal(llmRow?.answer, "needs-human");
  assert.equal(llmRow?.inputHash, jevRow?.inputHash);
  assert.equal(llmRow?.subjectId, jevRow?.subjectId);
});

test("publisher live: a confident Jev verdict skips DeepSeek and never writes public state", async () => {
  for (const [answers, expected] of [
    [APPROVE, "approve"],
    [REJECT, "reject"],
  ] as const) {
    await withDeepSeek("review", async (calls) => {
      const review = await reviewForPublication(reconciledInput(), {
        apiKey: "deepseek",
        decisions: jevContext("live", answers),
      });
      assert.equal(review.decision, expected);
      assert.equal(review.model, "jev");
      assert.equal(review.publicWrite, false);
      assert.equal(calls.count, 0);
    });
  }
});

test("publisher live: an unsure or split Jev verdict falls back to DeepSeek", async () => {
  for (const answers of [
    { ...APPROVE, "opportunity.publication_route": choice("publish", 0.6) },
    { ...APPROVE, "opportunity.is_single_real_opportunity": noul(0.5) },
    { "opportunity.publication_route": choice("needs-human") },
    { ...REJECT, "opportunity.is_single_real_opportunity": noul(0.95) },
  ]) {
    await withDeepSeek("review", async (calls) => {
      const review = await reviewForPublication(reconciledInput(), {
        apiKey: "deepseek",
        decisions: jevContext("live", answers),
      });
      assert.equal(review.model, "deepseek");
      assert.equal(review.decision, "review");
      assert.equal(calls.count, 1);
    });
  }
});

test("publisher never asks Jev when deterministic reconciliation fails", async () => {
  const input = reconciledInput();
  const context = jevContext("live", APPROVE);
  const review = await reviewForPublication(
    { ...input, relatedSnapshots: [] },
    { apiKey: "", decisions: context },
  );
  assert.equal(review.decision, "reject");
  assert.equal(context.calls, 0);
});
