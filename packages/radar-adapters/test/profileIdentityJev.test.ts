import test from "node:test";
import assert from "node:assert/strict";
import {
  createJevClient,
  createMemoryDecisionLedger,
  type DecisionMode,
  type JevResponse,
} from "@missa/decisions";
import {
  adjudicatePendingProfileLinks,
  matchOpportunityToProfiles,
  profileIdentityJevFromEnv,
  profileLinkActionFromJev,
  type OpportunityIdentityInput,
  type ProfileUrlEvidence,
} from "../src/profileIdentityMatcher.js";
import { createDedupIdentityDecider } from "../src/dedupIdentityDecider.js";

const NOW = new Date("2026-08-12T12:00:00.000Z");

type Verdict = { hosts: number; role: string; roleProbability?: number };

/** A fake Jev that answers per profile name; q0 is org_hosts_opportunity, q1 host_relation. */
function fakeJev(verdicts: Record<string, Verdict>) {
  const calls: unknown[] = [];
  const fetch = (async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as {
      state: { profile: { name: string } };
    };
    calls.push(body.state);
    const verdict = verdicts[body.state.profile.name] ?? {
      hosts: 0.5,
      role: "unrelated",
      roleProbability: 0.5,
    };
    const response: JevResponse = {
      model: "jev-test",
      answers: {
        q0: { type: "noul", noul: verdict.hosts },
        q1: {
          type: "choice",
          choice: verdict.role,
          probabilities: { [verdict.role]: verdict.roleProbability ?? 0.95 },
          confidence: 0.9,
        },
      },
    };
    return new Response(JSON.stringify(response), { status: 200 });
  }) as typeof globalThis.fetch;
  return { client: createJevClient({ apiKey: "k", fetch }), calls };
}

function opportunity(
  overrides: Partial<OpportunityIdentityInput> = {},
): OpportunityIdentityInput {
  return {
    opportunityId: "opp_identity_1",
    title: "Annual Poetry Prize",
    organizationName: null,
    sourceName: "Submittable",
    sourceCheckedAt: "2026-08-12T00:00:00.000Z",
    sourceUrl: null,
    guidelinesUrl: null,
    submissionUrl: "https://manager.submittable.com/submit/123",
    ...overrides,
  };
}

function profile(overrides: Partial<ProfileUrlEvidence>): ProfileUrlEvidence {
  return {
    profileId: "p",
    profileName: "Profile",
    profileCheckedAt: "2026-08-11T00:00:00.000Z",
    url: "https://manager.submittable.com/submit/p",
    aliasKind: "submission",
    ...overrides,
  };
}

const PROFILES = [
  profile({
    profileId: "a",
    profileName: "Alpha Review",
    url: "https://manager.submittable.com/submit/alpha",
  }),
  profile({
    profileId: "b",
    profileName: "Beta Review",
    url: "https://manager.submittable.com/submit/beta",
  }),
];

async function run(
  mode: DecisionMode,
  verdicts: Record<string, Verdict>,
  profiles = PROFILES,
  input = opportunity(),
) {
  const decisions = matchOpportunityToProfiles(input, profiles, NOW);
  const { client, calls } = fakeJev(verdicts);
  const ledger = createMemoryDecisionLedger();
  const result = await adjudicatePendingProfileLinks(
    input,
    decisions,
    profiles,
    { client, ledger, mode },
  );
  return {
    before: decisions,
    after: result.decisions,
    asked: result.asked,
    ledger,
    calls,
  };
}

test("shadow mode records both questions per pending link and changes nothing", async () => {
  const { before, after, ledger, calls } = await run("shadow", {
    "Alpha Review": { hosts: 0.97, role: "organizer" },
    "Beta Review": { hosts: 0.02, role: "unrelated" },
  });
  assert.ok(before.every((decision) => decision.status === "pending"));
  assert.deepEqual(after, before);
  assert.equal(calls.length, 2);
  assert.equal(ledger.records.length, 4);
  assert.ok(
    ledger.records.every(
      (record) =>
        record.mode === "shadow" &&
        record.subjectType === "opportunity_profile_link",
    ),
  );
  // Each link's state names the runner-up profile on the same host.
  assert.deepEqual(
    (calls[0] as { otherProfiles: string[] }).otherProfiles.length,
    1,
  );
});

test("live mode confirms a single confident organizer and rejects an unrelated profile", async () => {
  const { after } = await run("live", {
    "Alpha Review": { hosts: 0.97, role: "organizer" },
    "Beta Review": { hosts: 0.02, role: "unrelated" },
  });
  const byProfile = Object.fromEntries(
    after.map((decision) => [decision.profileId, decision]),
  );
  assert.equal(byProfile.a?.status, "confirmed");
  assert.equal(byProfile.a?.decidedBy, "jev:identity.org_hosts_opportunity");
  assert.equal(byProfile.b?.status, "rejected");
});

test("live mode leaves runner-up ambiguity pending when Jev would confirm both", async () => {
  const { after } = await run("live", {
    "Alpha Review": { hosts: 0.97, role: "organizer" },
    "Beta Review": { hosts: 0.96, role: "organizer" },
  });
  assert.ok(
    after.every(
      (decision) =>
        decision.status === "pending" && decision.decidedBy === undefined,
    ),
  );
});

test("live mode keeps links pending when Jev is uncertain", async () => {
  const { after } = await run("live", {
    "Alpha Review": { hosts: 0.6, role: "organizer", roleProbability: 0.6 },
    "Beta Review": { hosts: 0.5, role: "host", roleProbability: 0.5 },
  });
  assert.ok(after.every((decision) => decision.status === "pending"));
});

test("live mode never touches a link the matcher already confirmed", async () => {
  const willow = profile({
    profileId: "w",
    profileName: "Willow Springs",
    url: "https://willowspringsmagazine.org",
    aliasKind: "official",
  });
  const input = opportunity({
    title: "Willow Springs Surrealist Poetry Prize",
    organizationName: "Willow Springs",
    sourceUrl: "https://willowspringsmagazine.org/submit",
    submissionUrl: null,
  });
  const { before, after, asked } = await run(
    "live",
    { "Willow Springs": { hosts: 0.01, role: "unrelated" } },
    [willow],
    input,
  );
  assert.equal(before[0]?.status, "confirmed");
  assert.deepEqual(after, before);
  assert.equal(asked, 0);
});

test("a submission platform answer confirms only a submission link", () => {
  const live = (route: "apply" | "review" | "reject", answer: string) => ({
    questionKey: "k",
    questionVersion: 1,
    kind: "choice" as const,
    route,
    answer,
    probability: 0.95,
    confidence: 0.9,
    distribution: {},
    actionable: route !== "review",
  });
  const notHosting = { ...live("reject", "false"), kind: "noul" as const };
  assert.equal(
    profileLinkActionFromJev(
      "submission",
      notHosting,
      live("apply", "submission-platform"),
    ),
    "confirm",
  );
  assert.equal(
    profileLinkActionFromJev(
      "host",
      notHosting,
      live("apply", "submission-platform"),
    ),
    "reject",
  );
  assert.equal(
    profileLinkActionFromJev("host", undefined, live("review", "organizer")),
    "keep",
  );
  assert.equal(
    profileLinkActionFromJev(
      "host",
      { ...live("apply", "true"), actionable: false },
      { ...live("apply", "organizer"), actionable: false },
    ),
    "keep",
  );
});

test("profile identity Jev options exist only with a key and default to shadow", () => {
  const db = { query: async () => ({ rows: [] }) };
  assert.equal(profileIdentityJevFromEnv(db, {}), undefined);
  assert.equal(
    profileIdentityJevFromEnv(db, { JEV_API_KEY: "k" })?.mode,
    "shadow",
  );
  assert.equal(
    profileIdentityJevFromEnv(db, {
      JEV_API_KEY: "k",
      DECISIONS_MODE_PROFILE_IDENTITY: "live",
    })?.mode,
    "live",
  );
  assert.equal(
    profileIdentityJevFromEnv(db, {
      JEV_API_KEY: "k",
      JEV_PROFILE_IDENTITY_MAX_PER_SYNC: "5",
    })?.maxDecisions,
    5,
  );
});

test("the dedup identity decider records one shadow same_opportunity row per near miss", async () => {
  const fetch = (async () =>
    new Response(
      JSON.stringify({
        model: "jev-test",
        answers: { q0: { type: "noul", noul: 0.3 } },
      }),
      { status: 200 },
    )) as typeof globalThis.fetch;
  const ledger = createMemoryDecisionLedger();
  const decider = createDedupIdentityDecider({
    client: createJevClient({ apiKey: "k", fetch }),
    ledger,
  });
  const existing = {
    id: "opp_existing",
    sourceUrl: "https://north.test/poetry",
    fields: {
      title: "North River Poetry Prize",
      organizationName: "North River Review",
      type: "contest",
      deadline: { kind: "unknown" },
    },
  };
  await decider(
    {
      sourceId: "src_new",
      url: "https://north.test/fiction",
      title: "North River Fiction Prize",
      organizationName: "North River Review",
      type: "contest",
      deadline: { kind: "exact", date: "2026-10-05" },
    } as never,
    [
      {
        opportunity: existing as never,
        similarity: 0.6,
        reason: "similar-title-same-organization",
      },
    ],
  );
  assert.equal(ledger.records.length, 1);
  assert.equal(ledger.records[0]?.questionKey, "identity.same_opportunity");
  assert.equal(ledger.records[0]?.subjectId, "opp_existing~source:src_new");
  assert.equal(ledger.records[0]?.mode, "shadow");
  assert.equal(ledger.records[0]?.route, "review");
});
