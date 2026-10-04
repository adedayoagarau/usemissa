import assert from "node:assert/strict";
import test from "node:test";
import {
  CREATOR_QUESTIONS,
  SENSITIVE_EMAIL_STATUSES,
  createJevClient,
  createMemoryDecisionLedger,
  decide,
  emailApplicationStatus,
  emailDecisionState,
  emailIsPersonalNote,
  emailMatchState,
  questionRegistry,
  routeAnswer,
  smsReplyIntent,
  trackerMatchState,
  validateQuestion,
  type JevResponse,
} from "../src/index.js";

function fakeFetch(body: JevResponse) {
  const calls: unknown[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

test("every creator question is valid, uniquely keyed and creator-private", () => {
  for (const definition of CREATOR_QUESTIONS) {
    assert.deepEqual(validateQuestion(definition), [], definition.key);
    assert.equal(definition.dataClass, "creator-private", definition.key);
    assert.match(definition.key, /^creator\./);
  }
  assert.equal(
    questionRegistry([...CREATOR_QUESTIONS]).size,
    CREATOR_QUESTIONS.length,
  );
});

test("sensitive email statuses can never route to apply", () => {
  for (const status of SENSITIVE_EMAIL_STATUSES) {
    const outcome = routeAnswer(
      emailApplicationStatus,
      {
        type: "choice",
        choice: status,
        probabilities: { [status]: 0.99 },
        confidence: 0.99,
      },
      "live",
    );
    assert.equal(outcome.route, "review", status);
    assert.equal(outcome.actionable, false, status);
  }
  const newsletter = routeAnswer(
    emailApplicationStatus,
    {
      type: "choice",
      choice: "newsletter-or-solicitation",
      probabilities: { "newsletter-or-solicitation": 0.95, accepted: 0.05 },
      confidence: 0.9,
    },
    "live",
  );
  assert.equal(newsletter.route, "apply");
  assert.equal(newsletter.actionable, true);
});

test("a stop reply routes like any other option; unclear replies go to review", () => {
  const stop = routeAnswer(
    smsReplyIntent,
    {
      type: "choice",
      choice: "stop",
      probabilities: { stop: 0.9 },
      confidence: 0.9,
    },
    "live",
  );
  assert.equal(stop.route, "apply");
  const other = routeAnswer(
    smsReplyIntent,
    {
      type: "choice",
      choice: "other",
      probabilities: { other: 0.99 },
      confidence: 0.99,
    },
    "live",
  );
  assert.equal(other.route, "review");
});

test("creator questions are refused unless creator-private data is allowed", async () => {
  const { fetchImpl, calls } = fakeFetch({ model: "jev-1", answers: {} });
  const refused = await decide({
    client: createJevClient({ apiKey: "k", fetch: fetchImpl }),
    mode: "live",
    subjectId: "creator_test_email_1",
    state: emailDecisionState({ subject: "Congratulations", body: "x" }),
    questions: [emailApplicationStatus, emailIsPersonalNote],
  });
  assert.equal(calls.length, 0);
  assert.equal(
    refused.outcomes["creator.email_application_status"]!.route,
    "unavailable",
  );

  const allowed = fakeFetch({
    model: "jev-1",
    answers: {
      q0: {
        type: "choice",
        choice: "newsletter-or-solicitation",
        probabilities: { "newsletter-or-solicitation": 0.97 },
        confidence: 0.95,
      },
      q1: { type: "noul", noul: 0.03 },
    },
  });
  const ledger = createMemoryDecisionLedger();
  const result = await decide({
    client: createJevClient({
      apiKey: "k",
      fetch: allowed.fetchImpl,
      allowCreatorPrivateData: true,
    }),
    ledger,
    mode: "shadow",
    subjectId: "creator_test_email_1",
    state: emailDecisionState({
      subject: "Our spring newsletter",
      body: "Congratulations to this year's winners!",
      senderDomain: "example.org",
    }),
    questions: [emailApplicationStatus, emailIsPersonalNote],
  });
  assert.equal(allowed.calls.length, 1);
  assert.equal(
    result.outcomes["creator.email_application_status"]!.answer,
    "newsletter-or-solicitation",
  );
  assert.equal(
    result.outcomes["creator.email_is_personal_note"]!.route,
    "reject",
  );
  assert.equal(ledger.records.length, 2);
  assert.ok(ledger.records.every((record) => record.mode === "shadow"));
});

test("state builders clip text and keep only hosts from URLs", () => {
  const state = emailMatchState({
    subject: "Re: your submission",
    body: "word ".repeat(2_000),
    senderDomain: "journal.org",
    call: {
      title: "Spring Prize",
      organizationName: "The Journal",
      sourceUrl: "https://www.journal.org/prize?ref=abc",
    },
  });
  assert.ok(state.text.length <= 4_000);
  assert.equal(state.call.site, "journal.org");

  const tracker = trackerMatchState({
    row: { title: "Spring Prize", organization: null, sourceUrl: "not a url" },
    opportunity: { title: "Spring Prize 2026", sourceUrl: null },
  });
  assert.equal(tracker.row.site, null);
  assert.equal(tracker.opportunity.organization, null);
});
