import assert from "node:assert/strict";
import test from "node:test";
import {
  opportunityBrowseQuerySchema,
  opportunityDetailResponseSchema,
  opportunityPreferenceInputSchema,
  opportunityTailoringReasonSchema,
  organizationMemberMutationSchema,
  resourceIdSchema,
  sourceCoverageCellSchema,
  taxonomyAssignmentSetSchema,
} from "../src/index.js";

test("resource IDs accept legacy and UUID-backed prefixed identities", () => {
  assert.equal(resourceIdSchema.parse("org_0001"), "org_0001");
  assert.equal(
    resourceIdSchema.parse("org_550e8400-e29b-41d4-a716-446655440000"),
    "org_550e8400-e29b-41d4-a716-446655440000",
  );
});

test("organization member mutations normalize email and accept the enterprise role set", () => {
  assert.deepEqual(
    organizationMemberMutationSchema.parse({ email: " EDITOR@EXAMPLE.COM " }),
    {
      email: "editor@example.com",
      role: "member",
    },
  );
  assert.equal(
    organizationMemberMutationSchema.parse({
      email: "editor@example.com",
      role: "owner",
    }).role,
    "owner",
  );
});

test("browse queries default to safe, bounded public search behavior", () => {
  assert.deepEqual(opportunityBrowseQuerySchema.parse({}), {
    category: "all",
    types: [],
    disciplines: [],
    genres: [],
    taxonomyTermIds: [],
    taxonomyIncludeDescendants: false,
    locations: [],
    openNow: true,
    verifiedOnly: false,
    sort: "soonest-deadline",
    limit: 24,
  });
  assert.throws(() =>
    opportunityBrowseQuerySchema.parse({ limit: 500, query: "x".repeat(201) }),
  );
});

test("tailoring reasons remain factual and bounded", () => {
  const reason = opportunityTailoringReasonSchema.parse({
    code: "genre",
    label: "Matches your Poetry preference",
  });
  assert.equal(reason.code, "genre");
  assert.throws(() =>
    opportunityTailoringReasonSchema.parse({
      code: "fit-score",
      label: "Perfect for your manuscript",
    }),
  );
});

test("detail contracts distinguish unknown fee and deadline states", () => {
  const detail = opportunityDetailResponseSchema.parse({
    id: "opp_0001",
    slug: "sewanee-review-contest",
    title: "Sewanee Review Contest",
    organizationName: "Sewanee Review",
    status: "closing-soon",
    type: "contest",
    genres: ["fiction"],
    deadline: { kind: "unknown", raw: "July 31" },
    fee: { status: "unknown" },
    submissionAvailable: false,
    source: {
      kind: "organization-website",
      name: "Sewanee Review",
      url: "https://example.com/guidelines",
      checkedAt: "2026-07-31T00:00:00.000Z",
      organizationConfirmed: false,
    },
    eligibility: [],
    requiredMaterials: [],
    changes: [],
    relatedOpportunityIds: [],
  });
  assert.equal(detail.fee.status, "unknown");
  assert.equal(detail.deadline.kind, "unknown");
});

test("public source and submission URLs reject non-http protocols", () => {
  assert.throws(() =>
    opportunityDetailResponseSchema.parse({
      id: "opp_0001",
      slug: "unsafe",
      title: "Unsafe destination",
      status: "open",
      type: "contest",
      genres: [],
      deadline: { kind: "rolling" },
      fee: { status: "unknown" },
      submissionAvailable: true,
      source: {
        kind: "directory",
        name: "Directory",
        url: "javascript:alert(1)",
        checkedAt: "2026-07-31T00:00:00.000Z",
        organizationConfirmed: false,
      },
      submissionUrl: "ftp://example.com/submit",
      eligibility: [],
      requiredMaterials: [],
      changes: [],
      relatedOpportunityIds: [],
    }),
  );
});

test("preference input is separate from manuscript Fit", () => {
  const preferences = opportunityPreferenceInputSchema.parse({
    types: ["magazine"],
    genres: ["poetry"],
    noFeeOnly: true,
  });
  assert.deepEqual(preferences.types, ["magazine"]);
  assert.equal(preferences.noFeeOnly, true);
});

test("canonical taxonomy assignments are versioned and bounded", () => {
  const assignmentSet = taxonomyAssignmentSetSchema.parse({
    schemeVersion: 1,
    assignments: [
      {
        termId: "taxterm_disc-poetry",
        sourcePhrase: "poems",
        assignmentOrigin: "source",
        certainty: "confirmed",
        primary: true,
      },
    ],
  });
  assert.equal(assignmentSet.assignments[0]?.termId, "taxterm_disc-poetry");
});

test("source coverage cells separate practice terms from opportunity type and geography", () => {
  const cell = sourceCoverageCellSchema.parse({
    id: "coverage_poetry-grants-ng",
    dimensionKey: "discipline=poetry|type=grant|geo=NG|lang=en|tier=0",
    termIds: ["taxterm_disc-poetry"],
    opportunityType: "grant",
    geographyCode: "NG",
    languageCode: "en",
    sourceTier: 0,
    minimumSources: 3,
    minimumCanonicalSources: 1,
    status: "gap",
  });
  assert.equal(cell.opportunityType, "grant");
});
