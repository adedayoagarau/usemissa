import test from "node:test";
import assert from "node:assert/strict";
import {
  matchOpportunityToProfiles,
  normalizeHost,
  type OpportunityIdentityInput,
  type ProfileUrlEvidence,
} from "../src/profileIdentityMatcher.js";

function opportunity(overrides: Partial<OpportunityIdentityInput> = {}): OpportunityIdentityInput {
  return {
    opportunityId: "opp_1",
    title: "Willow Springs Surrealist Poetry Prize",
    sourceName: "Willow Springs",
    sourceCheckedAt: "2026-08-12T00:00:00.000Z",
    sourceUrl: "https://willowspringsmagazine.org/submit",
    guidelinesUrl: null,
    submissionUrl: null,
    ...overrides,
  };
}

function profile(overrides: Partial<ProfileUrlEvidence> = {}): ProfileUrlEvidence {
  return {
    profileId: "profile_1",
    profileName: "Willow Springs",
    profileCheckedAt: "2026-08-11T00:00:00.000Z",
    url: "https://willowspringsmagazine.org",
    aliasKind: "official",
    ...overrides,
  };
}

const NOW = new Date("2026-08-12T12:00:00.000Z");

test("normalizes equivalent website hosts", () => {
  assert.equal(normalizeHost("https://WWW.Example.org/path"), "example.org");
  assert.equal(normalizeHost("example.org"), "example.org");
});

test("confirms an unambiguous exact-host plus name match", () => {
  const decisions = matchOpportunityToProfiles(opportunity(), [profile()], NOW);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0]?.status, "confirmed");
  assert.equal(decisions[0]?.matchedHost, "willowspringsmagazine.org");
  assert.ok((decisions[0]?.nameScore ?? 0) >= 0.35);
});

test("never links a name-only match", () => {
  const decisions = matchOpportunityToProfiles(opportunity(), [profile({ url: "https://different.example" })], NOW);
  assert.deepEqual(decisions, []);
});

test("keeps exact-host evidence pending when the name is incompatible", () => {
  const decisions = matchOpportunityToProfiles(
    opportunity({ title: "Thorn and Bloom", sourceName: "redrosethorns" }),
    [profile({ profileName: "Completely Different Review" })], NOW,
  );
  assert.equal(decisions[0]?.status, "pending");
});

test("keeps shared submission hosts pending when two profiles are equally plausible", () => {
  const decisions = matchOpportunityToProfiles(
    opportunity({
      title: "Annual Poetry Prize",
      sourceName: "Submittable",
      sourceUrl: null,
      submissionUrl: "https://manager.submittable.com/submit/123",
    }),
    [
      profile({ profileId: "a", profileName: "Alpha Review", url: "https://manager.submittable.com/submit/alpha", aliasKind: "submission" }),
      profile({ profileId: "b", profileName: "Beta Review", url: "https://manager.submittable.com/submit/beta", aliasKind: "submission" }),
    ], NOW,
  );
  assert.equal(decisions.length, 2);
  assert.ok(decisions.every((decision) => decision.status === "pending"));
});

test("the same profile can confirm multiple concurrent calls", () => {
  const first = matchOpportunityToProfiles(opportunity({ opportunityId: "one" }), [profile()], NOW);
  const second = matchOpportunityToProfiles(opportunity({ opportunityId: "two", title: "Willow Springs Fiction Prize" }), [profile()], NOW);
  assert.equal(first[0]?.status, "confirmed");
  assert.equal(second[0]?.status, "confirmed");
  assert.notEqual(first[0]?.opportunityId, second[0]?.opportunityId);
});

test("stale profile evidence cannot confirm an otherwise compatible identity", () => {
  const decisions = matchOpportunityToProfiles(
    opportunity(),
    [profile({ profileCheckedAt: "2026-06-01T00:00:00.000Z" })],
    NOW,
  );
  assert.equal(decisions[0]?.status, "pending");
});
