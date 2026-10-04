import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  COUNTRY_QUESTION_KEY,
  COUNTRY_UNSTATED,
  DATABASE_QUESTIONS,
  ELIGIBILITY_RULE_KEYS,
  MEDIA_CANDIDATE_KINDS,
  PAYMENT_TYPES,
  TAXONOMY_NONE,
  applyDatabaseDecisions,
  applyWriteStatement,
  countryQuestion,
  createJevClient,
  createMemoryDecisionLedger,
  databaseApplyTargets,
  decide,
  findCountryCandidates,
  markAppliedStatement,
  normalizePaymentTypeText,
  planDecisionApplication,
  prestigeTier,
  prestigeTierState,
  questionRegistry,
  routeAnswer,
  taxonomyQuestion,
  validateQuestion,
  type ApplyCandidateRow,
  type Queryable,
  type QuestionDefinition,
} from "../src/index.js";

const COUNTRIES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  NG: "Nigeria",
  NE: "Niger",
  GE: "Georgia",
  JE: "Jersey",
  SS: "South Sudan",
  SD: "Sudan",
  FR: "France",
};
const ALIASES: Record<string, string> = {
  usa: "US",
  uk: "GB",
  england: "GB",
  international: "GLOBAL",
  worldwide: "GLOBAL",
};

const migrationSql = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../db/migrations/0089_honest_defaults.sql",
  ),
  "utf8",
);

function codes(texts: string[], extra: { code: string }[] = []) {
  return findCountryCandidates({
    texts: texts.map((text, index) => ({ label: `t${index}`, text })),
    codes: extra.map(({ code }) => ({ label: "profile", code })),
    countries: COUNTRIES,
    aliases: ALIASES,
  }).map((candidate) => candidate.code);
}

test("every fixed database question is valid and keys are unique", () => {
  const dynamic = [
    countryQuestion([{ code: "US", name: "United States", foundIn: ["x"] }])!,
    taxonomyQuestion([
      { termId: "taxterm_a", facet: "genre", preferredLabel: "A" },
      { termId: "taxterm_b", facet: "form", preferredLabel: "B" },
    ])!,
  ];
  const all: QuestionDefinition[] = [...DATABASE_QUESTIONS, ...dynamic];
  for (const definition of all) {
    assert.deepEqual(validateQuestion(definition), [], definition.key);
    assert.equal(definition.dataClass, "public", definition.key);
    if (definition.policy.kind === "choice") {
      assert.ok(definition.policy.minProbability >= 0.85, definition.key);
    }
  }
  assert.equal(questionRegistry(all).size, all.length);
});

test("the country shortlist reads names, aliases, states and provinces", () => {
  assert.deepEqual(codes(["Lagos, Nigeria"]), ["NG"]);
  assert.deepEqual(codes(["Juba, South Sudan"]), ["SS"]);
  assert.deepEqual(codes(["Brooklyn, NY 11201"]), ["US"]);
  assert.deepEqual(codes(["Newark, New Jersey"]), ["US"]);
  assert.deepEqual(codes(["Toronto, ON"]), ["CA"]);
  assert.deepEqual(codes(["London, UK"]), ["GB"]);
  assert.deepEqual(codes(["Bristol, England"]), ["GB"]);
  // A place several countries share stays ambiguous: both are offered.
  assert.deepEqual(codes(["Atlanta, Georgia"]).sort(), ["GE", "US"]);
  assert.deepEqual(codes(["An online residency"]), ["GLOBAL"]);
  // Eligibility words are not a host country.
  assert.deepEqual(codes(["Open to international artists"]), []);
  assert.deepEqual(codes(["", "  "]), []);
});

test("structured codes come first and are deduplicated", () => {
  const result = findCountryCandidates({
    texts: [{ label: "location", text: "Paris, France or Lagos, Nigeria" }],
    codes: [
      { label: "profileCountryCode", code: "ng" },
      { label: "bad", code: "Nigeria" },
    ],
    countries: COUNTRIES,
    aliases: ALIASES,
  });
  assert.deepEqual(
    result.map((candidate) => [candidate.code, candidate.foundIn]),
    [
      ["NG", ["profileCountryCode", "location"]],
      ["FR", ["location"]],
    ],
  );
  const capped = findCountryCandidates({
    texts: [{ label: "x", text: "France, Nigeria, Niger, Canada, Sudan" }],
    countries: COUNTRIES,
    max: 2,
  });
  assert.equal(capped.length, 2);
});

test("the country question offers the shortlist plus unstated", () => {
  assert.equal(countryQuestion([]), null);
  const question = countryQuestion([
    { code: "US", name: "United States", foundIn: ["location"] },
    { code: "GE", name: "Georgia", foundIn: ["location"] },
  ])!;
  assert.equal(question.key, COUNTRY_QUESTION_KEY);
  assert.deepEqual(Object.keys(question.question.criteria), [
    "US",
    "GE",
    COUNTRY_UNSTATED,
  ]);
  assert.deepEqual(
    question.policy.kind === "choice" && question.policy.alwaysReview,
    [COUNTRY_UNSTATED],
  );
});

test("a country decision records the shortlist it was asked with", async () => {
  const question = countryQuestion([
    { code: "US", name: "United States", foundIn: ["location"] },
    { code: "GE", name: "Georgia", foundIn: ["location"] },
  ])!;
  const sent: unknown[] = [];
  const client = createJevClient({
    apiKey: "k",
    fetch: (async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return new Response(
        JSON.stringify({
          model: "jev-test",
          answers: {
            q0: {
              type: "choice",
              choice: "US",
              probabilities: { US: 0.93, GE: 0.05, unstated: 0.02 },
              confidence: 0.9,
            },
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch,
  });
  const ledger = createMemoryDecisionLedger();
  const result = await decide({
    client,
    ledger,
    mode: "live",
    subjectId: "database-test:opp",
    state: { location: "Atlanta, Georgia" },
    questions: [question],
  });
  assert.equal(result.outcomes[COUNTRY_QUESTION_KEY]?.route, "apply");
  assert.equal(sent.length, 1);
  assert.deepEqual(ledger.records[0]?.options, ["US", "GE", "unstated"]);
  assert.equal(ledger.records[0]?.fieldName, "country_code");
});

test("payment spellings map only when their meaning is plain", () => {
  assert.equal(
    normalizePaymentTypeText("Contributor Copies"),
    "contributor-copy",
  );
  assert.equal(normalizePaymentTypeText(" Flat_Fee "), "flat-fee");
  assert.equal(
    normalizePaymentTypeText("contributor's copy"),
    "contributor-copy",
  );
  assert.equal(normalizePaymentTypeText("TOKEN"), "token");
  assert.equal(normalizePaymentTypeText(""), "unknown");
  assert.equal(normalizePaymentTypeText("$50 per poem"), null);
  assert.equal(normalizePaymentTypeText("paid"), null);
  assert.equal(normalizePaymentTypeText(null), null);
});

test("migration 0089 declares the same payment types and spellings", () => {
  const check = /"payment_type" IN \(([^)]*)\)\) NOT VALID/.exec(migrationSql);
  assert.ok(check, "payment_type check present");
  const declared = [...check[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(declared, [...PAYMENT_TYPES]);

  const values =
    /spellings \("spelling", "payment_type"\) AS \(\s*VALUES([\s\S]*?)\n\),/.exec(
      migrationSql,
    );
  assert.ok(values, "spelling table present");
  for (const pair of values[1]!.matchAll(/\('([^']*)', '([^']+)'\)/g)) {
    const [, spelling, mapped] = pair;
    assert.equal(normalizePaymentTypeText(spelling), mapped, spelling);
  }
});

test("migration 0089 checks opportunity types against the contract enum", () => {
  const check =
    /ADD CONSTRAINT "opportunities_type_check"\s+CHECK \("type" IN \(([^)]*)\)\)/.exec(
      migrationSql,
    );
  assert.ok(check);
  const declared = [...check[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.equal(declared.length, 16);
  assert.ok(declared.includes("other") && !declared.includes("public_art"));
});

test("eligibility keys keep the spellings the fit matcher compares", () => {
  for (const key of [
    "location",
    "career-stage",
    "nonprofit-status",
    "min-operating-budget",
    "premiere-status",
  ]) {
    assert.ok(Object.hasOwn(ELIGIBILITY_RULE_KEYS, key), key);
  }
});

test("prestige tiers only ever go to a person", () => {
  const outcome = routeAnswer(
    prestigeTier,
    {
      type: "choice",
      choice: "tier_1",
      probabilities: { tier_1: 0.99 },
      confidence: 0.99,
    },
    "live",
  );
  assert.equal(outcome.route, "review");
  assert.equal(outcome.actionable, false);
  assert.equal(
    prestigeTierState({ label: "Tier 3 (Emerging)" }).bulkDefault,
    true,
  );
  assert.equal(
    prestigeTierState({ label: "Tier 1 (Flagship)" }).bulkDefault,
    false,
  );
  assert.ok(!Object.hasOwn(databaseApplyTargets(), prestigeTier.key));
});

test("the taxonomy question offers resolver candidates plus none", () => {
  assert.equal(taxonomyQuestion([]), null);
  const question = taxonomyQuestion([
    { termId: "taxterm_a", facet: "genre", preferredLabel: "A" },
    { termId: "taxterm_a", facet: "genre", preferredLabel: "A" },
    { termId: "taxterm_b", facet: "form", preferredLabel: "B" },
  ])!;
  assert.deepEqual(Object.keys(question.question.criteria), [
    "taxterm_a",
    "taxterm_b",
    TAXONOMY_NONE,
  ]);
  assert.ok(!Object.hasOwn(databaseApplyTargets(), question.key));
});

function row(overrides: Partial<ApplyCandidateRow> = {}): ApplyCandidateRow {
  return {
    id: "dec_1",
    subject_type: "opportunity",
    subject_id: "opp_1",
    question_key: COUNTRY_QUESTION_KEY,
    question_version: 1,
    answer: "NG",
    mode: "live",
    route: "apply",
    status: "proposed",
    newer_count: 0,
    ...overrides,
  };
}

test("the apply plan writes only live, approved, allow-listed answers", () => {
  const targets = databaseApplyTargets();
  const plan = planDecisionApplication(
    [
      row(),
      row({ id: "dec_shadow", mode: "shadow" }),
      row({ id: "dec_review", route: "review" }),
      row({ id: "dec_done", status: "applied" }),
      row({ id: "dec_other", question_key: "opportunity.fee_status" }),
      row({ id: "dec_v2", question_version: 2 }),
      row({ id: "dec_newer", subject_id: "opp_2", newer_count: "1" }),
      row({ id: "dec_unstated", subject_id: "opp_3", answer: "unstated" }),
      row({ id: "dec_dup", answer: "US" }),
      row({
        id: "dec_subject",
        subject_type: "gary_profile",
        subject_id: "opp_4",
      }),
      row({
        id: "dec_media",
        subject_type: "opportunity_media_candidate",
        subject_id: "media_1",
        question_key: "media_candidate.candidate_kind",
        answer: "venue-place",
      }),
    ],
    targets,
  );
  assert.deepEqual(
    plan.writes.map((write) => [write.decisionId, write.value]),
    [
      ["dec_1", "NG"],
      ["dec_media", MEDIA_CANDIDATE_KINDS["venue-place"]],
    ],
  );
  assert.equal(plan.writes[1]?.value, "venue/place");
  assert.deepEqual(
    plan.skipped.map((skip) => skip.decisionId),
    [
      "dec_shadow",
      "dec_review",
      "dec_done",
      "dec_other",
      "dec_v2",
      "dec_newer",
      "dec_unstated",
      "dec_dup",
      "dec_subject",
    ],
  );
});

test("answers that fill nothing are never written", () => {
  const targets = databaseApplyTargets();
  const value = (key: string, answer: string) => targets[key]!.valueFor(answer);
  assert.equal(value("call_profile.payment_type_normalised", "unknown"), null);
  assert.equal(
    value("call_profile.payment_type_normalised", "per-word"),
    "per-word",
  );
  assert.equal(value("eligibility_rule.rule_key", "other"), null);
  assert.equal(value("eligibility_rule.rule_key", "age"), "age");
  assert.equal(value("profile.profile_kind", "organization"), null);
  assert.equal(value("profile.profile_kind", "gallery"), "gallery");
  assert.equal(
    value("profile_intelligence.editorial_archetype", "unspecified"),
    null,
  );
  assert.equal(value("identity_asset.surface_kind", "unclear"), null);
  assert.equal(value("media_candidate.candidate_kind", "unknown"), null);
  assert.equal(value(COUNTRY_QUESTION_KEY, "GLOBAL"), "GLOBAL");
  assert.equal(value(COUNTRY_QUESTION_KEY, "Nigeria"), null);
});

test("write statements guard the field and cite the decision", () => {
  const targets = databaseApplyTargets({ countryName: () => "Nigeria" });
  const country = applyWriteStatement({
    decisionId: "dec_1",
    subjectId: "opp_1",
    questionKey: COUNTRY_QUESTION_KEY,
    value: "NG",
    target: targets[COUNTRY_QUESTION_KEY]!,
  });
  assert.match(country.text, /t\.country_code IS NULL/);
  assert.match(country.text, /country = COALESCE\(t\.country, \$3\)/);
  assert.doesNotMatch(country.text, /metadata/);
  assert.deepEqual(country.values, ["opp_1", "NG", "Nigeria"]);

  const media = applyWriteStatement({
    decisionId: "dec_9",
    subjectId: "media_1",
    questionKey: "media_candidate.candidate_kind",
    value: "organization-logo",
    target: targets["media_candidate.candidate_kind"]!,
  });
  assert.match(media.text, /t\.candidate_kind = 'unknown'/);
  assert.match(media.text, /jsonb_build_object\('decisions'/);
  assert.ok(media.values.includes("data_decisions:dec_9"));

  const mark = markAppliedStatement("dec_9", "unknown");
  assert.match(
    mark.text,
    /status = 'applied', applied_at = now\(\), applied_from = \$2/,
  );
  assert.match(mark.text, /mode = 'live' AND route = 'apply'/);
});

function fakeDb(candidates: ApplyCandidateRow[], writable: boolean) {
  const queries: string[] = [];
  const db: Queryable = {
    async query(text: string) {
      queries.push(text.trim().split(/\s+/).slice(0, 3).join(" "));
      if (/FROM data_decisions d/.test(text)) return { rows: candidates };
      if (/^\s*(WITH previous|SELECT t\.)/.test(text))
        return { rows: writable ? [{ previous: null }] : [] };
      return { rows: [] };
    },
  };
  return { db, queries };
}

test("a dry run reads only, and refuses keys off the allow-list", async () => {
  const targets = databaseApplyTargets();
  const dry = fakeDb([row()], true);
  const report = await applyDatabaseDecisions(dry.db, {
    targets,
    questionKeys: [COUNTRY_QUESTION_KEY],
    dryRun: true,
  });
  assert.equal(report.applied.length, 1);
  assert.ok(dry.queries.includes("SET TRANSACTION READ"));
  assert.ok(!dry.queries.some((query) => /^(UPDATE|WITH)/.test(query)));
  assert.equal(dry.queries.at(-1), "ROLLBACK");

  const filled = fakeDb([row()], false);
  const skippedReport = await applyDatabaseDecisions(filled.db, {
    targets,
    questionKeys: [COUNTRY_QUESTION_KEY],
    dryRun: false,
  });
  assert.equal(skippedReport.applied.length, 0);
  assert.equal(skippedReport.skipped.length, 1);
  assert.ok(
    !filled.queries.some((query) => query.startsWith("UPDATE data_decisions")),
  );
  assert.equal(filled.queries.at(-1), "COMMIT");

  await assert.rejects(
    applyDatabaseDecisions(dry.db, {
      targets,
      questionKeys: [prestigeTier.key],
      dryRun: true,
    }),
    /Not on the apply allow-list/,
  );
});
