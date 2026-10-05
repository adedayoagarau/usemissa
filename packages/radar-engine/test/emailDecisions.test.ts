import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createStore,
  FixtureFetcher,
  GMAIL_READONLY_SCOPE,
  RadarEngine,
  type EmailDecider,
  type EmailDecisionRequest,
  type EmailDecisionVerdict,
  type Opportunity,
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
      type: "magazine",
      genres: ["poetry"],
      deadline: { kind: "exact", date: "2026-12-01" },
      fee: { disclosed: true, amountCents: 0 },
      eligibility: [],
      requiredMaterials: [],
      contactEmailPresent: false,
    },
    sourceId: "source",
    sourceUrl: `https://north.example/${id}`,
    alternateSourceIds: [],
    scores: { freshness: 100, confidence: 100, trust: 100 },
    trustSignals: [],
    lastCheckedAt: "2026-01-01T00:00:00.000Z",
    lastChangedAt: "2026-01-01T00:00:00.000Z",
    lastExtractionConfidence: 100,
    lastOpenSignal: true,
    lastClosedSignal: false,
    lastSuspiciousSignals: [],
    pastCycles: [],
    conflicts: [],
  };
}

function decider(verdict: EmailDecisionVerdict | null | Error) {
  const requests: EmailDecisionRequest[] = [];
  const port: EmailDecider = {
    async decide(request) {
      requests.push(request);
      if (verdict instanceof Error) throw verdict;
      return verdict;
    },
  };
  return { port, requests };
}

function setup(titles: string[]) {
  const store = createStore();
  const engine = new RadarEngine({ store, fetcher: new FixtureFetcher() });
  engine.addUser({
    id: "creator_email_user",
    displayName: "Creator",
    genres: [],
    attributes: {},
  });
  titles.forEach((title, index) => {
    const opp = opportunity(`opp_${index}`, title, "North River");
    store.opportunities.set(opp.id, opp);
    store.tracked.push({
      userId: "creator_email_user",
      opportunityId: opp.id,
      trackedAt: "2026-08-01T00:00:00.000Z",
      notify: true,
      myStatus: "submitted",
      events: [],
    });
  });
  const connection = engine.connectGmail("creator_email_user", {
    googleSubjectId: "creator-google",
    accountEmail: "creator@gmail.com",
    refreshToken: "refresh",
    grantedScopes: [GMAIL_READONLY_SCOPE],
  });
  engine.setGmailMode("creator_email_user", "autopilot", true, "mode-1");
  const ingest = (id: string, subject: string, textBody: string) => {
    const result = engine.ingestGmailEnvelope(connection.id, {
      provider: "gmail-sync",
      providerMessageId: id,
      receivedAt: "2026-08-02T00:00:00.000Z",
      to: [],
      from: "editor@north.example",
      subject,
      textBody,
      headers: {},
      attachments: [],
    });
    return store.emailCandidates.find(
      (item) => item.id === result.candidateId,
    )!;
  };
  return { store, engine, ingest };
}

test("a decider can withdraw a rule status from a newsletter, and the creator still decides", async () => {
  const { engine, ingest } = setup(["North River Review"]);
  const candidate = ingest(
    "m1",
    "North River Review newsletter",
    "Congratulations to all of this year's winners!",
  );
  assert.equal(candidate.proposedStatus, "accepted");
  const { port, requests } = decider({ notAStatusUpdate: true });
  assert.deepEqual(await engine.decideEmailCandidate(candidate.id, port), {
    changed: true,
  });
  assert.equal(requests[0]!.ruleStatus, "accepted");
  assert.equal(requests[0]!.calls[0]!.sourceUrl, "https://north.example/opp_0");
  assert.equal(candidate.proposedStatus, undefined);
  assert.equal(
    candidate.state,
    "pending",
    "the email stays in the creator's review list",
  );
  assert.ok(
    candidate.evidenceReasons.every(
      (reason) => !/selection signal/.test(reason),
    ),
  );
  assert.equal(engine.gmailAutopilotGate(candidate.id).allowed, false);
  assert.throws(
    () =>
      engine.reviewEmailCandidate("creator_email_user", candidate.id, {
        kind: "confirm",
        opportunityId: "opp_0",
        idempotencyKey: "k1",
      }),
    /Choose a status/,
  );
});

test("a decider never adds a status, a call or Autopilot eligibility", async () => {
  const { engine, ingest } = setup([
    "North River Review Spring",
    "North River Review Autumn",
  ]);
  const candidate = ingest(
    "m2",
    "North River Review",
    "Thank you for your submission.",
  );
  assert.equal(candidate.classification, "ambiguous");
  assert.equal(candidate.proposedStatus, "received");
  const { port } = decider({
    confirmedCalls: ["opp_1", "opp_unknown"],
    rejectedCalls: ["opp_0", "opp_unknown"],
  });
  assert.deepEqual(await engine.decideEmailCandidate(candidate.id, port), {
    changed: true,
  });
  assert.deepEqual(
    candidate.candidates.map((call) => call.opportunityId),
    ["opp_1"],
  );
  assert.equal(candidate.matchedOpportunityId, "opp_1");
  assert.equal(candidate.classification, "matched");
  assert.equal(candidate.proposedStatus, "received");
  assert.equal(candidate.confidence, "possible");
  assert.equal(
    engine.gmailAutopilotGate(candidate.id).allowed,
    false,
    "a narrowed match is never automated",
  );
});

test("rejecting every call leaves the email unmatched for the creator", async () => {
  const { engine, ingest } = setup(["North River Review"]);
  const candidate = ingest(
    "m3",
    "North River Review",
    "Thank you for your submission.",
  );
  await engine.decideEmailCandidate(
    candidate.id,
    decider({ rejectedCalls: ["opp_0"] }).port,
  );
  assert.equal(candidate.classification, "unmatched");
  assert.equal(candidate.matchedOpportunityId, undefined);
  assert.deepEqual(candidate.candidates, []);
});

test("empty, failing or late verdicts change nothing", async () => {
  const { engine, ingest } = setup(["North River Review"]);
  const candidate = ingest(
    "m4",
    "North River Review",
    "Thank you for your submission.",
  );
  const before = JSON.stringify(candidate);
  assert.deepEqual(
    await engine.decideEmailCandidate(candidate.id, decider(null).port),
    { changed: false },
  );
  assert.deepEqual(
    await engine.decideEmailCandidate(
      candidate.id,
      decider(new Error("down")).port,
    ),
    { changed: false },
  );
  assert.deepEqual(
    await engine.decideEmailCandidate(
      candidate.id,
      decider({ notAStatusUpdate: false, confirmedCalls: ["opp_0"] }).port,
    ),
    { changed: false },
  );
  assert.equal(JSON.stringify(candidate), before);
  assert.equal(
    engine.gmailAutopilotGate(candidate.id).allowed,
    true,
    "rule-only Autopilot is unchanged",
  );

  engine.reviewEmailCandidate("creator_email_user", candidate.id, {
    kind: "ignore",
    idempotencyKey: "ignore-1",
  });
  assert.deepEqual(
    await engine.decideEmailCandidate(
      candidate.id,
      decider({ notAStatusUpdate: true }).port,
    ),
    { changed: false },
  );
});
