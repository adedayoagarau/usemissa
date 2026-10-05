// Run: node --test scripts/tests/dedupe-organizations-decisions.test.mjs
// (requires `npm run build --workspace=@missa/decisions`).
import test from "node:test";
import assert from "node:assert/strict";
import {
  JUNK_HEURISTIC,
  MERGE_HEURISTIC,
  createOrganizationDedupeDecider,
  loadDecisions,
} from "../dedupe-organizations-decisions.mjs";

const decisions = await loadDecisions();

function jev(noul) {
  const fetch = async () =>
    new Response(
      JSON.stringify({
        model: "jev-test",
        answers: { q0: { type: "noul", noul } },
      }),
      { status: 200 },
    );
  return decisions.createJevClient({ apiKey: "k", fetch });
}

const canonical = {
  id: "identity_org_a",
  name: "North River Review",
  website_url: "https://northriver.test",
  profile_kind: "magazine",
};
const duplicate = {
  id: "identity_org_b",
  name: "The North River Review",
  website_url: "https://www.northriver.test",
  profile_kind: "magazine",
};
const junk = {
  id: "identity_org_junk",
  name: "Ace Plumbing",
  website_url: null,
  profile_kind: "organization",
};

test("without Jev or --require-decision every merge and purge proceeds and is recorded", async () => {
  const ledger = decisions.createMemoryDecisionLedger();
  const decider = createOrganizationDedupeDecider({
    decisions,
    client: decisions.createJevClient({}),
    ledger,
    mode: "shadow",
    requireDecision: false,
  });
  assert.equal((await decider.mergePair(canonical, duplicate)).merge, true);
  assert.equal((await decider.junkProfile(junk)).purge, true);
  assert.deepEqual(
    ledger.records.map((record) => [
      record.questionKey,
      record.decider,
      record.answer,
      record.route,
      record.mode,
    ]),
    [
      ["identity.same_organization", MERGE_HEURISTIC, "true", "apply", "live"],
      [
        "identity.is_arts_organization",
        JUNK_HEURISTIC,
        "false",
        "reject",
        "live",
      ],
    ],
  );
  assert.equal(ledger.records[0].subjectId, "identity_org_a~identity_org_b");
});

test("shadow Jev answers are recorded beside the heuristic and change nothing", async () => {
  const ledger = decisions.createMemoryDecisionLedger();
  const decider = createOrganizationDedupeDecider({
    decisions,
    client: jev(0.02),
    ledger,
    mode: "shadow",
    requireDecision: false,
  });
  const { merge, outcome } = await decider.mergePair(canonical, duplicate);
  assert.equal(merge, true);
  assert.equal(outcome.route, "reject");
  assert.deepEqual(
    ledger.records.map((record) => record.deciderKind),
    ["jev", "heuristic"],
  );
});

test("--require-decision merges only what live Jev confirms", async () => {
  const confirm = createOrganizationDedupeDecider({
    decisions,
    client: jev(0.97),
    ledger: decisions.createMemoryDecisionLedger(),
    mode: "live",
    requireDecision: true,
  });
  const deny = createOrganizationDedupeDecider({
    decisions,
    client: jev(0.5),
    ledger: decisions.createMemoryDecisionLedger(),
    mode: "live",
    requireDecision: true,
  });
  const shadow = createOrganizationDedupeDecider({
    decisions,
    client: jev(0.97),
    ledger: decisions.createMemoryDecisionLedger(),
    mode: "shadow",
    requireDecision: true,
  });
  assert.equal((await confirm.mergePair(canonical, duplicate)).merge, true);
  assert.equal((await deny.mergePair(canonical, duplicate)).merge, false);
  assert.equal((await shadow.mergePair(canonical, duplicate)).merge, false);
});

test("--require-decision purges only profiles live Jev says are not arts organizations", async () => {
  const ledger = decisions.createMemoryDecisionLedger();
  const notArts = createOrganizationDedupeDecider({
    decisions,
    client: jev(0.03),
    ledger,
    mode: "live",
    requireDecision: true,
  });
  const arts = createOrganizationDedupeDecider({
    decisions,
    client: jev(0.95),
    ledger: decisions.createMemoryDecisionLedger(),
    mode: "live",
    requireDecision: true,
  });
  assert.equal((await notArts.junkProfile(junk)).purge, true);
  assert.equal((await arts.junkProfile(junk)).purge, false);
  assert.equal(
    ledger.records.find((record) => record.deciderKind === "heuristic").mode,
    "live",
  );
});

test("a dry run records nothing and asks Jev only with --require-decision", async () => {
  let calls = 0;
  const client = {
    available: true,
    model: "jev-test",
    canSend: () => true,
    async evaluate() {
      calls++;
      return {
        model: "jev-test",
        answers: { q0: { type: "noul", noul: 0.97 } },
      };
    },
  };
  const audit = createOrganizationDedupeDecider({
    decisions,
    client,
    ledger: undefined,
    mode: "live",
    requireDecision: false,
  });
  assert.equal((await audit.mergePair(canonical, duplicate)).merge, true);
  assert.equal(calls, 0);
  const preview = createOrganizationDedupeDecider({
    decisions,
    client,
    ledger: undefined,
    mode: "live",
    requireDecision: true,
  });
  assert.equal((await preview.mergePair(canonical, duplicate)).merge, true);
  assert.equal(calls, 1);
});

test("a failing ledger never blocks a merge", async () => {
  const warnings = [];
  const decider = createOrganizationDedupeDecider({
    decisions,
    client: decisions.createJevClient({}),
    ledger: {
      record: async () => {
        throw new Error("relation data_decisions does not exist");
      },
    },
    mode: "shadow",
    requireDecision: false,
    logger: { warn: (message) => warnings.push(message) },
  });
  assert.equal((await decider.mergePair(canonical, duplicate)).merge, true);
  assert.equal(warnings.length, 1);
});
