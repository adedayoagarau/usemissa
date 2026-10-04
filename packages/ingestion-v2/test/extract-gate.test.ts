import test from "node:test";
import assert from "node:assert/strict";
import {
  createJevClient,
  createMemoryDecisionLedger,
  type DecisionMode,
  type JevClient,
} from "@missa/decisions";
import {
  DeepSeekHtmlAdapter,
  createBenchmarkSources,
  createJevModelExtractionGate,
  createRun,
  type IngestionMode,
  type PageSnapshot,
} from "../src/index.js";

const source = {
  ...createBenchmarkSources()[0]!,
  url: "https://example.test/opportunity",
  adapterId: "deepseek-html-v2",
  config: { destination: { pageRole: "detail" as const } },
};

function snapshot(id: string, html: string, contentHash: string): PageSnapshot {
  return {
    id,
    runId: "run",
    sourceId: source.id,
    url: source.url,
    finalUrl: source.url,
    fetchedAt: "2026-10-01T00:00:00.000Z",
    statusCode: 200,
    contentType: "text/html",
    contentHash,
    html,
    rendered: false,
  };
}

function deepSeek() {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Example grant",
                organization: "Example Arts",
                deadlineDate: "2026-12-31",
                deadlineKind: "exact",
              }),
            },
          },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;
  return { fetchImpl, calls: () => calls };
}

function jev(noul: number | "fail"): {
  client: JevClient;
  calls: () => number;
} {
  let calls = 0;
  const client = createJevClient({
    apiKey: "k",
    maxRetries: 0,
    fetch: (async () => {
      calls += 1;
      if (noul === "fail") throw new Error("Jev down");
      return new Response(
        JSON.stringify({
          model: "jev-test",
          answers: { q0: { type: "noul", noul } },
        }),
        { status: 200 },
      );
    }) as typeof fetch,
  });
  return { client, calls: () => calls };
}

async function twoPasses(options: {
  gate?: ReturnType<typeof createJevModelExtractionGate>;
  mode?: IngestionMode;
  secondHtml?: string;
  secondHash?: string;
}) {
  const model = deepSeek();
  const adapter = new DeepSeekHtmlAdapter({
    apiKey: "test",
    endpoint: "https://api.deepseek.test/chat/completions",
    fetchImpl: model.fetchImpl,
    extractionGate: options.gate,
  });
  const run = createRun(source, "scheduled", options.mode ?? "shadow");
  const first = snapshot(
    "snap_1",
    "<h1>Example grant</h1><p>Deadline: December 31, 2026.</p><p>Visitors: 10</p>",
    "hash_1",
  );
  const second = snapshot(
    "snap_2",
    options.secondHtml ??
      "<h1>Example grant</h1><p>Deadline: December 31, 2026.</p><p>Visitors: 11</p>",
    options.secondHash ?? "hash_2",
  );
  await adapter.extract({ run, source, snapshot: first }, first);
  const result = await adapter.extract(
    { run, source, snapshot: second },
    second,
  );
  return { result, modelCalls: model.calls() };
}

function gateFor(client: JevClient, mode: DecisionMode) {
  const ledger = createMemoryDecisionLedger();
  return {
    ledger,
    gate: createJevModelExtractionGate({ client, ledger, mode: () => mode }),
  };
}

test("without a gate every pass calls DeepSeek", async () => {
  const { modelCalls } = await twoPasses({});
  assert.equal(modelCalls, 2);
});

test("shadow mode records the decision but still calls DeepSeek", async () => {
  const fake = jev(0.02);
  const { gate, ledger } = gateFor(fake.client, "shadow");
  const { modelCalls, result } = await twoPasses({ gate });
  assert.equal(modelCalls, 2);
  assert.equal(fake.calls(), 1);
  assert.equal(ledger.records.length, 1);
  assert.equal(ledger.records[0]!.questionKey, "operations.worth_extracting");
  assert.equal(ledger.records[0]!.mode, "shadow");
  assert.ok(!result.warnings.some((warning) => /reused/.test(warning)));
  assert.deepEqual(gate.usage.summary(), [
    "[missa-decisions] usage scope=extract_gate jev_calls=1 made=2 skipped=0 shadow_would_skip=1",
  ]);
});

test("live confident 'no new facts' reuses the earlier model fields", async () => {
  const fake = jev(0.02);
  const { gate } = gateFor(fake.client, "live");
  const { modelCalls, result } = await twoPasses({ gate });
  assert.equal(modelCalls, 1);
  const organization = result.fields.find(
    (field) =>
      field.provenance.method === "deepseek-json-shadow" &&
      field.fieldName === "organization",
  );
  assert.equal(organization?.normalizedValue, "Example Arts");
  assert.equal(organization?.provenance.snapshotId, "snap_2");
  assert.ok(
    result.warnings.some((warning) =>
      /reused from the previous extraction/.test(warning),
    ),
  );
  assert.ok(
    !result.warnings.some((warning) =>
      /failed|invalid|blocked|timeout/i.test(warning),
    ),
  );
  assert.deepEqual(gate.usage.get("extract_gate"), {
    asked: 1,
    made: 1,
    skipped: 1,
    shadowWouldSkip: 0,
  });
});

test("live mode still calls DeepSeek when Jev is unsure, says yes, or fails", async () => {
  for (const answer of [0.5, 0.97, "fail"] as const) {
    const { gate } = gateFor(jev(answer).client, "live");
    const { modelCalls } = await twoPasses({ gate });
    assert.equal(modelCalls, 2, String(answer));
  }
});

test("review replays reuse fields only for byte-identical content", async () => {
  const changed = await twoPasses({
    gate: gateFor(jev(0.02).client, "live").gate,
    mode: "review",
  });
  assert.equal(changed.modelCalls, 2);
  const html =
    "<h1>Example grant</h1><p>Deadline: December 31, 2026.</p><p>Visitors: 10</p>";
  const identical = await twoPasses({
    gate: gateFor(jev(0.02).client, "live").gate,
    mode: "review",
    secondHtml: html,
    secondHash: "hash_1",
  });
  assert.equal(identical.modelCalls, 1);
});
