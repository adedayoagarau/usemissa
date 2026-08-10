import assert from "node:assert/strict";
import test from "node:test";
import {
  chatAssistantPayloadSchema,
  chatPostInputSchema,
  opportunityBrowseQuerySchema,
  opportunityDetailResponseSchema,
  opportunityContentSchema,
  opportunityPreferenceInputSchema,
  opportunityTailoringReasonSchema,
  organizationMemberMutationSchema,
  resourceIdSchema,
  savedSearchInputSchema,
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
    taxonomySchemeVersion: 1,
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

test("opportunity intelligence content carries review state and source-linked facts", () => {
  const content = opportunityContentSchema.parse({
    builderVersion: "opportunity-brief.v1",
    summary: "Example Arts is offering an open call for poetry. The current source lists September 1 as the deadline.",
    highlights: [
      { label: "Deadline", value: "2026-09-01", sourceUrl: "https://example.com/call", certainty: "confirmed" },
      { label: "Fee", value: "No fee disclosed", sourceUrl: "https://example.com/call", certainty: "confirmed" },
    ],
    preparation: ["Manuscript"],
    unknowns: ["Rights need confirmation."],
    nextAction: "Read the official guidelines before preparing your submission.",
    sourceUrl: "https://example.com/call",
    generatedAt: "2026-08-06T00:00:00.000Z",
    review: { status: "approved", score: 100, reasons: ["Source-linked."], checks: { sourcePresent: true }, reviewedAt: "2026-08-06T00:01:00.000Z" },
  });
  assert.equal(content.review.status, "approved");
  assert.equal(content.highlights[0]?.sourceUrl, "https://example.com/call");
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

test("saved searches retain bounded canonical terms and no-fee intent", () => {
  const saved = savedSearchInputSchema.parse({
    name: "Poetry, no fee",
    criteria: {
      taxonomyTermIds: ["taxterm_disc-poetry"],
      taxonomyIncludeDescendants: true,
      noFeeOnly: true,
    },
  });
  assert.deepEqual(saved.criteria.taxonomyTermIds, ["taxterm_disc-poetry"]);
  assert.equal(saved.criteria.noFeeOnly, true);
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

test("chat input is bounded and the baseline payload keeps evidence source-linked", () => {
  const input = chatPostInputSchema.parse({
    message: " Find free fellowships for writers ",
  });
  assert.equal(input.message, "Find free fellowships for writers");
  assert.throws(() => chatPostInputSchema.parse({ message: "x".repeat(2_001) }));

  const payload = chatAssistantPayloadSchema.parse({
    intent: "opportunity-search",
    engine: "legacy-internal-value-must-be-stripped",
    answer: "I found one published fellowship.",
    search: { types: ["fellowship"], feeStatus: "no-fee", sort: "soonest-deadline", taxonomy: [{ facet: "role", label: "Writer" }], clarifications: [] },
    results: [
      {
        id: "opp_1",
        title: "Example Fellowship",
        status: "open",
        type: "fellowship",
        deadline: { kind: "fixed", date: "2026-09-01" },
        fee: { status: "no-fee" },
        taxonomy: [{ facet: "role", label: "Writer" }],
        source: {
          opportunityId: "opp_1",
          title: "Example Fellowship",
          url: "https://example.com/fellowship",
          checkedAt: "2026-08-06T00:00:00.000Z",
          organizationConfirmed: true,
        },
      },
    ],
    evidence: [
      {
        opportunityId: "opp_1",
        title: "Example Fellowship",
        url: "https://example.com/fellowship",
        checkedAt: "2026-08-06T00:00:00.000Z",
        organizationConfirmed: true,
      },
    ],
  });
  assert.equal(payload.results[0]?.source.opportunityId, "opp_1");
  assert.equal('engine' in payload, false);
  assert.equal('checkedAt' in payload.results[0]!.source, false);
  assert.equal('organizationConfirmed' in payload.results[0]!.source, false);
  assert.deepEqual(payload.search.taxonomy, [{ facet: "role", label: "Writer" }]);
});
