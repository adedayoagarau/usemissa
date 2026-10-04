import assert from "node:assert/strict";
import test from "node:test";
import {
  createJevClient,
  createMemoryDecisionLedger,
  type JevAnswer,
  type JevQuestion,
} from "@missa/decisions";
import {
  buildOpportunityContent,
  type OpportunityContentBuildInput,
} from "@missa/radar-engine";
import {
  applyGroundingHold,
  groundOpportunityContent,
  groundOrganizationProfile,
  reuseEditorial,
  shouldReuseEditorial,
  type ContentDecisionDeps,
} from "../src/contentGrounding.js";
import {
  buildDeterministicOrganizationEditorial,
  cleanAiProse,
} from "../src/editorialWriter.js";

function fakeClient(
  answer: (question: JevQuestion) => JevAnswer,
  calls: { count: number } = { count: 0 },
) {
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    calls.count += 1;
    const body = JSON.parse(String(init.body)) as {
      questions: Record<string, JevQuestion>;
    };
    const answers = Object.fromEntries(
      Object.entries(body.questions).map(([id, question]) => [
        id,
        answer(question),
      ]),
    );
    return new Response(JSON.stringify({ model: "jev-test", answers }), {
      status: 200,
    });
  }) as typeof fetch;
  return createJevClient({ apiKey: "k", fetch: fetchImpl });
}

/** Supports every sentence except ones mentioning `unsupported`; field checks answer no. */
function groundingAnswers(unsupported: string) {
  return (question: JevQuestion): JevAnswer => {
    if (question.type === "score") {
      return {
        type: "score",
        score: 1,
        legend: {},
        probabilities: { 0: 0.1, 1: 0.8, 2: 0.1 },
        confidence: 0.6,
      };
    }
    if (question.instructions.startsWith("Take this sentence")) {
      return {
        type: "noul",
        noul: question.instructions.includes(unsupported) ? 0.02 : 0.97,
      };
    }
    if (question.instructions.startsWith("Does source state enough"))
      return { type: "noul", noul: 0.95 };
    return { type: "noul", noul: 0.03 };
  };
}

function deps(
  overrides: Partial<ContentDecisionDeps> & Pick<ContentDecisionDeps, "client">,
): ContentDecisionDeps & { messages: string[] } {
  const messages: string[] = [];
  return {
    ledger: createMemoryDecisionLedger(),
    groundingMode: "shadow",
    regenerateMode: "shadow",
    log: (message) => messages.push(message),
    messages,
    ...overrides,
  };
}

const facts: OpportunityContentBuildInput = {
  title: "Summer Residency",
  type: "residency",
  status: "open",
  organizationName: "Lagos Studio",
  genres: [],
  deadline: { kind: "exact", date: "2026-11-01" },
  fee: { status: "no-fee" },
  location: "Lagos",
  requiredMaterials: [{ label: "Artist statement" }],
  sourceUrl: "https://example.org/call",
  organizationConfirmed: true,
  generatedAt: "2026-10-04T00:00:00.000Z",
};

function writtenContent() {
  return {
    ...buildOpportunityContent(facts),
    editorialHook: "Lagos Studio offers a summer residency in Lagos.",
    curatorialOverview:
      "Lagos Studio runs a summer residency. Past residents include famous painters.",
  };
}

test("cleanAiProse never leaves a doubled article", () => {
  assert.equal(
    cleanAiProse("This is a great opportunity for poets."),
    "This is an opportunity for poets.",
  );
  assert.equal(
    cleanAiProse("It is an exciting opportunity. Great opportunity ahead."),
    "It is an opportunity. An opportunity ahead.",
  );
  assert.equal(
    cleanAiProse("A great opportunity awaits, and an amazing chance too."),
    "An opportunity awaits, and an opportunity too.",
  );
  assert.equal(
    cleanAiProse("Apply to the exciting opportunity now. Don't miss out!"),
    "Apply to the opportunity now.",
  );
  assert.equal(
    cleanAiProse("Fees are low. Moreover, the prize is large."),
    "Fees are low. The prize is large.",
  );
  assert.doesNotMatch(
    cleanAiProse("a great opportunity, a amazing chance, an great opportunity"),
    /\ba an\b|\ban an\b/i,
  );
});

test("without Jev the write-up is untouched and nothing is asked", async () => {
  const content = writtenContent();
  const result = await groundOpportunityContent(
    deps({ client: createJevClient(), groundingMode: "live" }),
    { opportunityId: "writing-test-1", facts, content },
  );
  assert.equal(result, content);
});

test("shadow grounding records per-sentence rows and never holds", async () => {
  const ledger = createMemoryDecisionLedger();
  const content = writtenContent();
  const result = await groundOpportunityContent(
    deps({ client: fakeClient(groundingAnswers("famous painters")), ledger }),
    {
      opportunityId: "writing-test-2",
      facts,
      content,
      sourceText: "A residency.",
    },
  );
  assert.equal(result, content);
  const rows = ledger.records.filter((row) =>
    row.questionKey.startsWith("content.claim_supported.curatorial_overview."),
  );
  assert.deepEqual(
    rows.map((row) => [row.fieldName, row.route, row.mode]),
    [
      ["curatorialOverview#0", "apply", "shadow"],
      ["curatorialOverview#1", "reject", "shadow"],
    ],
  );
  assert.ok(ledger.records.every((row) => row.subjectId === "writing-test-2"));
});

test("live grounding holds a write-up with a confidently unsupported sentence", async () => {
  const content = writtenContent();
  const held = await groundOpportunityContent(
    deps({
      client: fakeClient(groundingAnswers("famous painters")),
      groundingMode: "live",
    }),
    { opportunityId: "writing-test-3", facts, content },
  );
  assert.equal(held.grounding?.status, "hold");
  assert.equal(held.curatorialOverview, content.curatorialOverview);

  const approved = {
    decision: "approved" as const,
    score: 95,
    reasons: [],
    checks: {} as Record<string, unknown>,
  };
  const reviewed = applyGroundingHold(approved, held);
  assert.equal(reviewed.decision, "needs-human");
  assert.equal(reviewed.checks.groundingHold, true);
  assert.equal(applyGroundingHold(approved, content), approved);
  const blocked = { ...approved, decision: "blocked" as const };
  assert.equal(applyGroundingHold(blocked, held).decision, "blocked");

  const clean = await groundOpportunityContent(
    deps({
      client: fakeClient(groundingAnswers("no sentence matches this")),
      groundingMode: "live",
    }),
    { opportunityId: "writing-test-3b", facts, content },
  );
  assert.equal(clean, content);
});

test("a Jev failure leaves the write-up untouched", async () => {
  const content = writtenContent();
  const failing = createJevClient({
    apiKey: "k",
    maxRetries: 0,
    fetch: (async () => new Response("down", { status: 400 })) as typeof fetch,
  });
  const context = deps({ client: failing, groundingMode: "live" });
  const result = await groundOpportunityContent(context, {
    opportunityId: "writing-test-4",
    facts,
    content,
  });
  assert.equal(result, content);
  assert.equal(context.messages.length, 1);
});

test("live grounding drops unsupported organization fields instead of publishing them", async () => {
  const source = { name: "Lagos Studio", kind: "residency_center" };
  const profile = buildDeterministicOrganizationEditorial(source);
  const answers = groundingAnswers(
    "established profile in the cultural sector",
  );
  const live = await groundOrganizationProfile(
    deps({ client: fakeClient(answers), groundingMode: "live" }),
    { organizationId: "writing-test-org", source, profile },
  );
  assert.equal(live.reputationSummary, undefined);
  assert.deepEqual(live.groundingWithheld, ["reputationSummary"]);
  assert.equal(live.overview, profile.overview);
  assert.equal(live.submissionGuidance, profile.submissionGuidance);

  const shadow = await groundOrganizationProfile(
    deps({ client: fakeClient(answers) }),
    { organizationId: "writing-test-org", source, profile },
  );
  assert.equal(shadow, profile);
});

test("the regenerate gate skips the LLM only on a live, confident not-material", async () => {
  const previous = writtenContent();
  const next = buildOpportunityContent({
    ...facts,
    generatedAt: "2026-10-05T00:00:00.000Z",
  });
  const ask = (noul: number, regenerateMode: "live" | "shadow") =>
    shouldReuseEditorial(
      deps({
        client: fakeClient(() => ({ type: "noul", noul })),
        regenerateMode,
      }),
      { opportunityId: "writing-test-5", previous, next },
    );
  assert.equal(await ask(0.03, "live"), true);
  assert.equal(await ask(0.03, "shadow"), false);
  assert.equal(await ask(0.5, "live"), false);
  assert.equal(await ask(0.97, "live"), false);
  assert.equal(
    await shouldReuseEditorial(
      deps({ client: createJevClient(), regenerateMode: "live" }),
      { opportunityId: "writing-test-5", previous, next },
    ),
    false,
  );

  const reused = reuseEditorial(
    buildOpportunityContent({
      ...facts,
      deadline: { kind: "exact", date: "2026-11-02" },
    }),
    previous,
  );
  assert.equal(reused.curatorialOverview, previous.curatorialOverview);
  assert.equal(reused.editorial?.editorialHook, previous.editorialHook);
  assert.equal(reused.highlights[0]?.value, "2026-11-02");
  assert.equal(reused.builderVersion, "editorial-writer.v2");
});
