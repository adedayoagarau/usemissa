import assert from "node:assert/strict";
import test from "node:test";
import {
  OPEN_CALL_IMPORT_COLUMN_TARGETS,
  SUBMISSION_IMPORT_COLUMN_TARGETS,
  createJevClient,
  type JevAnswer,
  type JevClient,
} from "@missa/decisions";
import {
  OPEN_CALL_IMPORT_TARGETS,
  SUBMISSION_IMPORT_TARGETS,
  WorkspaceEngine,
  checkDecisionLetters,
  createMemoryDecisionLedger,
  describeImportColumns,
  orderClaimReviewQueue,
  planOpenCallImport,
  planSubmissionImport,
  recordReviewConsistency,
  recordSubmissionTriage,
  recordGuidelineClauses,
  sanitizeImportColumnMapping,
  splitGuidelineClauses,
  suggestImportColumnMapping,
  type WorkspaceDecisionContext,
} from "../src/index.js";

/**
 * A fake Jev: `answer` picks the answer for each question from the state the
 * request carried, so tests can vary answers per record.
 */
function fakeJev(
  answer: (
    state: Record<string, unknown>,
    question: { type: string },
  ) => JevAnswer,
  options: { allowCreatorPrivateData?: boolean; fail?: boolean } = {},
) {
  const requests: Array<{
    state: Record<string, unknown>;
    questions: Record<string, { type: string; instructions: string }>;
  }> = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    requests.push(body);
    if (options.fail) return new Response("down", { status: 400 });
    const answers = Object.fromEntries(
      Object.entries(body.questions as Record<string, { type: string }>).map(
        ([id, question]) => [id, answer(body.state, question)],
      ),
    );
    return new Response(JSON.stringify({ model: "jev-test", answers }), {
      status: 200,
    });
  }) as typeof fetch;
  const client: JevClient = createJevClient({
    apiKey: "k",
    fetch: fetchImpl,
    maxRetries: 0,
    allowCreatorPrivateData: options.allowCreatorPrivateData ?? true,
  });
  return { client, requests };
}

function context(
  client: JevClient,
  mode: "live" | "shadow",
): WorkspaceDecisionContext & {
  ledger: ReturnType<typeof createMemoryDecisionLedger>;
} {
  return { client, ledger: createMemoryDecisionLedger(), mode };
}

const choice = (option: string, probability = 0.95): JevAnswer => ({
  type: "choice",
  choice: option,
  probabilities: { [option]: probability },
  confidence: probability,
});

// --- Decision letters --------------------------------------------------------

const letters = [
  {
    workId: "w1",
    decisionId: "d1",
    label: "First Poem",
    recordedDecision: "declined",
    subject: "About First Poem",
    letter: "We are delighted to accept First Poem.",
    note: "We are delighted to accept First Poem.",
  },
  {
    workId: "w2",
    decisionId: "d2",
    label: "Second Poem",
    recordedDecision: "accepted",
    subject: "About Second Poem",
    letter: "We are delighted to accept Second Poem.",
    note: "Congratulations.",
  },
  {
    workId: "w3",
    decisionId: "d3",
    label: "Third Poem",
    recordedDecision: "accepted",
    subject: "About Third Poem",
    letter: "We are delighted to accept Third Poem.",
  },
];

function letterJev() {
  return fakeJev((state, question) => {
    const mismatch = state.recordedDecision === "declined";
    if (question.type === "noul")
      return { type: "noul", noul: mismatch ? 0.03 : 0.97 };
    return choice("accept");
  });
}

test("a live, confident mismatch holds back only that letter", async () => {
  const { client, requests } = letterJev();
  const ctx = context(client, "live");
  const result = await checkDecisionLetters(ctx, letters);
  assert.deepEqual(result.blocked, [{ workId: "w1", label: "First Poem" }]);
  assert.equal(
    result.checked,
    2,
    "letters without the organization's own words are not checked",
  );
  assert.equal(requests.length, 2);
  assert.equal(ctx.ledger.records.length, 4);
  assert.ok(
    ctx.ledger.records.every(
      (record) => record.subjectType === "work_decision",
    ),
  );
});

test("shadow mode records the check but never holds a letter back", async () => {
  const { client } = letterJev();
  const ctx = context(client, "shadow");
  const result = await checkDecisionLetters(ctx, letters);
  assert.deepEqual(result.blocked, []);
  assert.equal(ctx.ledger.records.length, 4);
  assert.ok(ctx.ledger.records.every((record) => record.mode === "shadow"));
});

test("letters are never checked without consent to send creator data", async () => {
  const { client, requests } = fakeJev(() => ({ type: "noul", noul: 0 }), {
    allowCreatorPrivateData: false,
  });
  const result = await checkDecisionLetters(context(client, "live"), letters);
  assert.deepEqual(result.blocked, []);
  assert.equal(requests.length, 0);
});

test("a Jev failure never holds letters back", async () => {
  const { client } = fakeJev(() => ({ type: "noul", noul: 0 }), { fail: true });
  const result = await checkDecisionLetters(context(client, "live"), letters);
  assert.deepEqual(result.blocked, []);
  assert.ok(result.errors.length > 0);
});

test("a confident, different message kind holds a letter back when the match is not confirmed", async () => {
  const { client } = fakeJev((_state, question) =>
    question.type === "noul" ? { type: "noul", noul: 0.5 } : choice("decline"),
  );
  const result = await checkDecisionLetters(context(client, "live"), [
    letters[1]!,
  ]);
  assert.deepEqual(result.blocked, [{ workId: "w2", label: "Second Poem" }]);
});

// --- Advisory flags ----------------------------------------------------------

test("submission triage records flags and changes nothing", async () => {
  const { client, requests } = fakeJev(() => ({ type: "noul", noul: 0.95 }));
  const ctx = context(client, "live");
  const flags = await recordSubmissionTriage(ctx, "sub_1", {
    openCallTitle: "Spring",
    categories: ["Poetry", "Fiction"],
    category: "Poetry",
    works: [{ title: "A story" }],
    criteria: { debut: "Has not published a book" },
  });
  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(flags.outcomes).sort(), [
    "submission.criterion_met.debut",
    "submission.wrong_category",
  ]);
  assert.ok(
    ctx.ledger.records.every(
      (record) =>
        record.subjectType === "submission" && record.subjectId === "sub_1",
    ),
  );
  assert.equal(
    (requests[0]!.state.criteria as Record<string, string>).debut,
    "Has not published a book",
  );
});

test("review consistency is asked only with a score and notes", async () => {
  const { client, requests } = fakeJev(() => ({ type: "noul", noul: 0.2 }));
  const ctx = context(client, "shadow");
  await recordReviewConsistency(ctx, "ra_1", { score: 90 });
  assert.equal(requests.length, 0);
  const flags = await recordReviewConsistency(ctx, "ra_1", {
    score: 90,
    notes: "Weak and unready.",
  });
  assert.equal(requests.length, 1);
  assert.equal(
    flags.outcomes["review.notes_contradict_score"]!.route,
    "review",
  );
});

test("guideline text splits into clauses that are classified one by one", async () => {
  const clauses = splitGuidelineClauses(
    "Send up to five poems. Entry fee is $10.\nWe accept PDF files only; no AI-generated work.",
  );
  assert.deepEqual(clauses, [
    "Send up to five poems.",
    "Entry fee is $10.",
    "We accept PDF files only;",
    "no AI-generated work.",
  ]);
  const { client, requests } = fakeJev(() => choice("fee"));
  const ctx = context(client, "shadow");
  const result = await recordGuidelineClauses(ctx, {
    openCallId: "oc_1",
    text: "Entry fee is $10. Send five poems.",
  });
  assert.equal(requests.length, 2);
  assert.equal(result.clauses.length, 2);
  assert.ok(
    ctx.ledger.records.every(
      (record) =>
        record.subjectType === "guideline_clause" &&
        record.subjectId.startsWith("oc_1:"),
    ),
  );
});

test("claim queue ordering puts supported claims first and never drops one", () => {
  const claims = [
    { id: "c1", requestedAt: "2026-01-01T00:00:00Z" },
    { id: "c2", requestedAt: "2026-01-02T00:00:00Z" },
    { id: "c3", requestedAt: "2026-01-03T00:00:00Z" },
  ];
  const outcome = (route: "apply" | "reject", actionable = true) =>
    ({ route, actionable }) as never;
  assert.deepEqual(
    orderClaimReviewQueue(claims, {
      c3: outcome("apply"),
      c1: outcome("reject"),
    }).map((claim) => claim.id),
    ["c3", "c2", "c1"],
  );
  assert.deepEqual(
    orderClaimReviewQueue(claims, { c3: outcome("apply", false) }).map(
      (claim) => claim.id,
    ),
    ["c1", "c2", "c3"],
    "shadow answers leave the queue in its usual order",
  );
});

// --- Import column mapping ---------------------------------------------------

test("importer targets match the question's options", () => {
  assert.deepEqual(
    Object.keys(SUBMISSION_IMPORT_TARGETS).sort(),
    Object.keys(SUBMISSION_IMPORT_COLUMN_TARGETS).sort(),
  );
  assert.deepEqual(
    Object.keys(OPEN_CALL_IMPORT_TARGETS).sort(),
    Object.keys(OPEN_CALL_IMPORT_COLUMN_TARGETS).sort(),
  );
});

function importFixture() {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity("org1", "Acme");
  const program = engine.createProgram(entity.id, "Program");
  const call = engine.createOpenCall(program.id, "Fall Issue");
  engine.createSubmissionPath(call.id, [], []);
  const account = {
    id: "acct_1",
    email: "artist@example.com",
    passwordHash: "x",
    isAdmin: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  } as const;
  const lookup = (email: string) =>
    email === account.email ? account : undefined;
  return { engine, lookup };
}

const csv =
  "open call,Contact,piece name,status\nFall Issue,artist@example.com,First Poem,accepted";

test("without a mapping the alias rules decide exactly as before", () => {
  const { engine, lookup } = importFixture();
  const plan = planSubmissionImport(csv, engine, "org1", lookup);
  assert.equal(plan.invalidRows, 1);
  assert.equal(plan.rows[0]!.workTitle, "Imported submission");
});

test("live suggestions fill only unmapped columns and the organization's mapping wins", async () => {
  const { client, requests } = fakeJev((state) => {
    if (state.header === "Contact") return choice("submitterEmail");
    if (state.header === "piece name") return choice("workTitle");
    return choice("ignore");
  });
  const ctx = context(client, "live");
  const suggested = await suggestImportColumnMapping(ctx, {
    kind: "submission",
    csv,
    organizationId: "org1",
  });
  assert.deepEqual(suggested.mapping, {
    contact: "submitterEmail",
    "piece name": "workTitle",
  });
  assert.equal(requests.length, 2, "alias-mapped columns are never sent");
  assert.deepEqual(
    requests.map((request) => request.state.samples),
    [["artist@example.com"], ["First Poem"]],
  );

  const { engine, lookup } = importFixture();
  const plan = planSubmissionImport(csv, engine, "org1", lookup, "generic", {
    columnMapping: suggested.mapping,
  });
  assert.equal(plan.validRows, 1);
  assert.equal(plan.rows[0]!.workTitle, "First Poem");

  const organizationMapping = sanitizeImportColumnMapping(
    { "Piece Name": "ignore", Contact: "submitterEmail", bogus: "notAField" },
    SUBMISSION_IMPORT_TARGETS,
  );
  assert.deepEqual(organizationMapping, {
    "piece name": "ignore",
    contact: "submitterEmail",
  });
  const columns = describeImportColumns(
    csv,
    "submission",
    { ...suggested.mapping, ...organizationMapping },
    suggested.mapping,
  );
  assert.deepEqual(
    columns.map((column) => [column.key, column.target, column.source]),
    [
      ["open call", "openCall", "alias"],
      ["contact", "submitterEmail", "suggested"],
      ["piece name", "ignore", "organization"],
      ["status", "status", "alias"],
    ],
  );
});

test("shadow suggestions are recorded but never fill a column", async () => {
  const { client } = fakeJev(() => choice("workTitle"));
  const ctx = context(client, "shadow");
  const suggested = await suggestImportColumnMapping(ctx, {
    kind: "submission",
    csv,
    organizationId: "org1",
  });
  assert.deepEqual(suggested.mapping, {});
  assert.equal(ctx.ledger.records.length, 2);
  assert.ok(
    ctx.ledger.records.every(
      (record) =>
        record.subjectType === "import_column" && record.mode === "shadow",
    ),
  );
});

test("two columns claiming one field are both left for the organization", async () => {
  const { client } = fakeJev(() => choice("workTitle"));
  const suggested = await suggestImportColumnMapping(context(client, "live"), {
    kind: "submission",
    csv,
    organizationId: "org1",
  });
  assert.deepEqual(suggested.mapping, {});
});

test("open-call imports honour an organization mapping too", () => {
  const engine = new WorkspaceEngine();
  const plan = planOpenCallImport(
    "Call name,Team\nSpring Prize,Editors",
    engine,
    "org1",
    "generic",
    {
      columnMapping: { "call name": "title" },
    },
  );
  assert.equal(plan.rows[0]!.title, "Spring Prize");
  const unmapped = planOpenCallImport(
    "Call name,Team\nSpring Prize,Editors",
    engine,
    "org1",
  );
  assert.equal(unmapped.rows[0]!.title, "");
});
