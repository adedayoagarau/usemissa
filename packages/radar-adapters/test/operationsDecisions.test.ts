import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import type { PageSnapshot, Source } from "@missa/radar-engine";
import {
  createJevClient,
  createMemoryDecisionLedger,
  OperationsUsage,
  type DecisionMode,
  type JevAnswer,
} from "@missa/decisions";
import {
  createJevRadarExtractionGate,
  httpStatusOf,
  type OperationsDecider,
} from "../src/operationsDecisions.js";
import {
  runLifecycleReconcilerBatch,
  type LifecycleFetchResult,
} from "../src/lifecycleReconciler.js";
import {
  enrichmentRetryDelayMinutes,
  enrichmentRetryWaitsLongest,
  failJob,
  type ClaimedJob,
} from "../src/enrichmentWorker.js";
import {
  verifySourceCandidate,
  verifySourceCandidateWithDecisions,
} from "../src/sourcePromotionWorker.js";

/** A Jev decider whose answers come from `answer` (or a failure). */
function fakeDecider(mode: DecisionMode, answer: JevAnswer | "fail") {
  const ledger = createMemoryDecisionLedger();
  let calls = 0;
  const client = createJevClient({
    apiKey: "k",
    maxRetries: 0,
    fetch: (async () => {
      calls += 1;
      if (answer === "fail") throw new Error("Jev down");
      return new Response(
        JSON.stringify({ model: "jev-test", answers: { q0: answer } }),
        { status: 200 },
      );
    }) as typeof fetch,
  });
  const decider: OperationsDecider = { client, ledger, mode: () => mode };
  return { decider, ledger, calls: () => calls };
}

const noul = (value: number): JevAnswer => ({ type: "noul", noul: value });
const choice = (value: string): JevAnswer => ({
  type: "choice",
  choice: value,
  probabilities: { [value]: 0.95 },
  confidence: 0.95,
});

// ── radar_extract_gate ─────────────────────────────────────────────────

const source = {
  id: "src_ops",
  name: "Example",
  url: "https://example.org/call",
  kind: "organization-website",
} as Source;
const snap = (content: string): PageSnapshot => ({
  id: `snap_${content.length}`,
  sourceId: source.id,
  url: source.url,
  fetchedAt: "2026-10-01T00:00:00Z",
  status: "ok",
  contentHash: String(content.length),
  content,
});

test("radar extraction gate extracts first sightings without asking Jev", async () => {
  const fake = fakeDecider("live", noul(0.01));
  const gate = createJevRadarExtractionGate(fake.decider);
  assert.equal(
    await gate.shouldExtract(source, undefined, snap("Deadline: May 1")),
    true,
  );
  assert.equal(fake.calls(), 0);
});

test("radar extraction gate records in shadow and skips only on a live confident no", async () => {
  const previous = snap("Deadline: May 1. Visitors 10");
  const next = snap("Deadline: May 1. Visitors 11");

  const shadow = fakeDecider("shadow", noul(0.01));
  const shadowGate = createJevRadarExtractionGate(shadow.decider);
  assert.equal(await shadowGate.shouldExtract(source, previous, next), true);
  assert.equal(
    shadow.ledger.records[0]?.questionKey,
    "operations.worth_extracting",
  );
  assert.deepEqual(shadowGate.usage.get("radar_extract_gate"), {
    asked: 1,
    made: 1,
    skipped: 0,
    shadowWouldSkip: 1,
  });

  const live = fakeDecider("live", noul(0.01));
  const liveGate = createJevRadarExtractionGate(live.decider);
  assert.equal(await liveGate.shouldExtract(source, previous, next), false);
  assert.deepEqual(liveGate.usage.get("radar_extract_gate"), {
    asked: 1,
    made: 0,
    skipped: 1,
    shadowWouldSkip: 0,
  });

  for (const answer of [noul(0.5), noul(0.95), "fail"] as const) {
    assert.equal(
      await createJevRadarExtractionGate(
        fakeDecider("live", answer).decider,
      ).shouldExtract(source, previous, next),
      true,
    );
  }
});

// ── recheck (lifecycle) ────────────────────────────────────────────────

function fakePool(job: Record<string, unknown>) {
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  const query = async (text: string, values?: unknown[]) => {
    queries.push({ text, values });
    return { rows: /with due as/.test(text) ? [job] : [], rowCount: 0 };
  };
  const pool = {
    query,
    connect: async () => ({ query, release() {} }),
  } as unknown as Pool;
  return { pool, queries };
}

const NOW = new Date("2026-08-30T12:00:00.000Z");
const lifecycleJob = {
  opportunityId: "operations_opp",
  title: "Example Grant",
  sourceUrl: "https://example.org/grant",
  guidelinesUrl: null,
  submissionUrl: null,
  publicationState: "published",
  attempts: 3,
  deadlineDate: "2026-11-30",
  status: "open",
};
const openWithDeadline: LifecycleFetchResult = {
  status: "ok",
  text: "Applications are now open. Deadline: November 30, 2026.",
};

function jobUpdate(queries: Array<{ text: string; values?: unknown[] }>) {
  return queries.find(
    (query) =>
      /update opportunity_lifecycle_verification_jobs/.test(query.text) &&
      !/with due as/.test(query.text),
  )!;
}

test("lifecycle recheck keeps today's interval by default and in shadow", async () => {
  const plain = fakePool(lifecycleJob);
  await runLifecycleReconcilerBatch(plain.pool, {
    now: NOW,
    fetchPage: async () => openWithDeadline,
  });
  assert.deepEqual(jobUpdate(plain.queries).values, [
    "operations_opp",
    NOW,
    "1 day",
  ]);

  const shadow = fakePool(lifecycleJob);
  const fake = fakeDecider("shadow", choice("7d"));
  await runLifecycleReconcilerBatch(shadow.pool, {
    now: NOW,
    fetchPage: async () => openWithDeadline,
    decisions: fake.decider,
  });
  assert.deepEqual(jobUpdate(shadow.queries).values, [
    "operations_opp",
    NOW,
    "1 day",
  ]);
  assert.equal(
    fake.ledger.records[0]?.questionKey,
    "operations.recheck_cadence",
  );
});

test("live recheck only lengthens, and never past a stated deadline", async () => {
  const live = fakePool(lifecycleJob);
  const usage = new OperationsUsage();
  await runLifecycleReconcilerBatch(live.pool, {
    now: NOW,
    fetchPage: async () => openWithDeadline,
    decisions: fakeDecider("live", choice("7d")).decider,
    usage,
  });
  assert.deepEqual(jobUpdate(live.queries).values, [
    "operations_opp",
    NOW,
    "168 hours",
  ]);
  assert.equal(usage.get("recheck").skipped, 1);

  const shorter = fakePool(lifecycleJob);
  await runLifecycleReconcilerBatch(shorter.pool, {
    now: NOW,
    fetchPage: async () => openWithDeadline,
    decisions: fakeDecider("live", choice("6h")).decider,
  });
  assert.deepEqual(jobUpdate(shorter.queries).values, [
    "operations_opp",
    NOW,
    "1 day",
  ]);

  const nearDeadline = fakePool(lifecycleJob);
  const soon: LifecycleFetchResult = {
    status: "ok",
    text: "Applications are now open. Deadline: September 2, 2026.",
  };
  await runLifecycleReconcilerBatch(nearDeadline.pool, {
    now: NOW,
    fetchPage: async () => soon,
    decisions: fakeDecider("live", choice("7d")).decider,
  });
  assert.deepEqual(jobUpdate(nearDeadline.queries).values, [
    "operations_opp",
    NOW,
    "1 day",
  ]);

  const vague = fakePool(lifecycleJob);
  await runLifecycleReconcilerBatch(vague.pool, {
    now: NOW,
    fetchPage: async () => ({
      status: "ok",
      text: "Applications are now open. Read our website for dates.",
    }),
    decisions: fakeDecider("live", choice("30d")).decider,
  });
  const update = jobUpdate(vague.queries);
  assert.match(update.text, /\$4::interval/);
  assert.equal(update.values?.[3], "720 hours");
});

test("lifecycle retries wait the longest existing delay only on a live confident no", async () => {
  const gone: LifecycleFetchResult = { status: "error", error: "http-403" };

  const plain = fakePool(lifecycleJob);
  await runLifecycleReconcilerBatch(plain.pool, {
    now: NOW,
    fetchPage: async () => gone,
  });
  const defaultRetry = jobUpdate(plain.queries);
  assert.match(defaultRetry.text, /least\(attempts,12\) \* interval '2 hours'/);
  assert.deepEqual(defaultRetry.values, [
    "operations_opp",
    "No lifecycle source could be fetched.",
  ]);

  const shadow = fakePool(lifecycleJob);
  await runLifecycleReconcilerBatch(shadow.pool, {
    now: NOW,
    fetchPage: async () => gone,
    decisions: fakeDecider("shadow", noul(0.02)).decider,
  });
  assert.match(jobUpdate(shadow.queries).text, /least\(attempts,12\)/);

  const live = fakePool(lifecycleJob);
  await runLifecycleReconcilerBatch(live.pool, {
    now: NOW,
    fetchPage: async () => gone,
    decisions: fakeDecider("live", noul(0.02)).decider,
  });
  const longest = jobUpdate(live.queries);
  assert.match(longest.text, /\$3::int \* interval '2 hours'/);
  assert.deepEqual(longest.values, [
    "operations_opp",
    "No lifecycle source could be fetched.",
    12,
  ]);

  const hopeful = fakePool(lifecycleJob);
  await runLifecycleReconcilerBatch(hopeful.pool, {
    now: NOW,
    fetchPage: async () => gone,
    decisions: fakeDecider("live", noul(0.95)).decider,
  });
  assert.match(jobUpdate(hopeful.queries).text, /least\(attempts,12\)/);
  assert.equal(httpStatusOf("http-403"), 403);
});

// ── enrichment_retry ───────────────────────────────────────────────────

const enrichmentJob: ClaimedJob = {
  id: "operations_job",
  opportunityId: "operations_opp",
  kind: "guidelines",
  attempts: 2,
  sourceUrl: "https://example.org/guidelines",
  title: "Example",
  opportunityType: "grant",
  genres: [],
};

test("enrichment retry delay is unchanged unless a live Jev answer says the retry will fail", async () => {
  for (const attempts of [1, 2, 5, 8, 12])
    assert.equal(
      enrichmentRetryDelayMinutes(attempts),
      Math.min(24 * 60, 2 ** Math.min(attempts, 8)),
    );
  assert.equal(enrichmentRetryDelayMinutes(2, true), 24 * 60);

  assert.equal(
    await enrichmentRetryWaitsLongest(
      undefined,
      enrichmentJob,
      new Error("HTTP 410"),
    ),
    false,
  );
  assert.equal(
    await enrichmentRetryWaitsLongest(
      fakeDecider("shadow", noul(0.02)).decider,
      enrichmentJob,
      new Error("HTTP 410"),
    ),
    false,
  );
  assert.equal(
    await enrichmentRetryWaitsLongest(
      fakeDecider("live", noul(0.02)).decider,
      enrichmentJob,
      new Error("HTTP 410"),
    ),
    true,
  );
  assert.equal(
    await enrichmentRetryWaitsLongest(
      fakeDecider("live", "fail").decider,
      enrichmentJob,
      new Error("HTTP 410"),
    ),
    false,
  );

  const calls: unknown[][] = [];
  const client = {
    query: async (_text: string, values: unknown[]) => {
      calls.push(values);
      return { rows: [] };
    },
  };
  await failJob(client as never, enrichmentJob, new Error("HTTP 503"));
  await failJob(client as never, enrichmentJob, new Error("HTTP 410"), true);
  assert.deepEqual(calls, [
    ["operations_job", "HTTP 503", "4"],
    ["operations_job", "HTTP 410", "1440"],
  ]);
});

// ── source_discovery ───────────────────────────────────────────────────

function countingFetch(pages: Record<string, string>) {
  let fetches = 0;
  const fetchImpl = async (input: string): Promise<Response> => {
    fetches += 1;
    const body = pages[input];
    return body === undefined
      ? new Response("", { status: 404 })
      : new Response(body, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
  };
  return { fetchImpl, fetches: () => fetches };
}

const promising = {
  "https://example.org/robots.txt": "User-agent: *\nAllow: /\n",
  "https://example.org/call":
    "Apply now. Open call submissions close on 30 September.",
};
const candidate = {
  id: "operations_cand",
  url: "https://example.org/call",
  title: "Example Open Call",
  snippet: "Apply now",
  proposed_kind: null,
};
const score = (level: number): JevAnswer => ({
  type: "score",
  score: level,
  legend: {},
  probabilities: { [String(level)]: 0.95 },
  confidence: 0.95,
});

test("source verification is unchanged without a decider", async () => {
  const site = countingFetch(promising);
  const direct = await verifySourceCandidate(candidate, {
    fetchImpl: site.fetchImpl,
    now: NOW,
  });
  const wrapped = await verifySourceCandidateWithDecisions(
    candidate,
    undefined,
    {
      verify: (item) =>
        verifySourceCandidate(item, { fetchImpl: site.fetchImpl, now: NOW }),
    },
  );
  assert.deepEqual(wrapped, direct);
});

test("a live confident not-a-source skips every verification fetch", async () => {
  const site = countingFetch(promising);
  const verify = (item: { url: string; title: string | null }) =>
    verifySourceCandidate(item, { fetchImpl: site.fetchImpl, now: NOW });

  const shadow = await verifySourceCandidateWithDecisions(
    candidate,
    fakeDecider("shadow", score(0)).decider,
    { verify, now: NOW },
  );
  assert.equal(shadow.decision, "needs-human");
  assert.ok(site.fetches() > 0);

  const before = site.fetches();
  const usage = new OperationsUsage();
  const live = await verifySourceCandidateWithDecisions(
    candidate,
    fakeDecider("live", score(0)).decider,
    { verify, usage, now: NOW },
  );
  assert.equal(live.decision, "rejected");
  assert.equal(site.fetches(), before);
  assert.equal(usage.get("source_discovery").skipped, 1);
});

test("a live confident reject only turns needs-human into rejected and never accepts", async () => {
  const needsHuman = async () => ({
    decision: "needs-human" as const,
    evidence: {
      candidateUrl: candidate.url,
      robots: "allowed" as const,
      terms: "allowed" as const,
      callSignals: ["action"],
      reason: "no canonical link",
      checkedAt: NOW.toISOString(),
    },
  });
  const accepted = async () => ({
    ...(await needsHuman()),
    decision: "accepted" as const,
  });

  // The pre-fetch screen and the verdict share one fake answer per decider, so
  // use a choice answer: the score screen then reads as unavailable.
  const rejectVerdict = fakeDecider("live", choice("reject")).decider;
  assert.equal(
    (
      await verifySourceCandidateWithDecisions(candidate, rejectVerdict, {
        verify: needsHuman,
      })
    ).decision,
    "rejected",
  );
  assert.equal(
    (
      await verifySourceCandidateWithDecisions(candidate, rejectVerdict, {
        verify: accepted,
      })
    ).decision,
    "accepted",
  );
  assert.equal(
    (
      await verifySourceCandidateWithDecisions(
        candidate,
        fakeDecider("shadow", choice("reject")).decider,
        { verify: needsHuman },
      )
    ).decision,
    "needs-human",
  );
  const acceptVerdict = fakeDecider("live", choice("accept")).decider;
  assert.equal(
    (
      await verifySourceCandidateWithDecisions(candidate, acceptVerdict, {
        verify: needsHuman,
      })
    ).decision,
    "needs-human",
  );
});
