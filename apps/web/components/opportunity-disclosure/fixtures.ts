import type { OpportunityDetailProjection } from "@missa/radar-engine";

export type OpportunityFixture = {
  id: string;
  label: string;
  scenarios: string[];
  opportunity: OpportunityDetailProjection;
};

const source = {
  kind: "organization-website",
  name: "Official organization page",
  url: "https://example.org/opportunities",
  checkedAt: "2026-08-30T12:00:00.000Z",
  processingSucceededAt: "2026-08-30T12:00:00.000Z",
  organizationConfirmed: true,
};

function fixture(
  id: string,
  label: string,
  scenarios: string[],
  changes: Partial<OpportunityDetailProjection> = {},
): OpportunityFixture {
  const opportunity: OpportunityDetailProjection = {
    id: `opp-${id}`,
    slug: id,
    title: "North River Review — International Call for New Writing",
    organizationId: "org-north-river",
    organizationName: "North River Review",
    organizationVerified: true,
    status: "open",
    type: "magazine",
    discipline: "Writing & literature",
    genres: ["Poetry", "Fiction"],
    deadline: { kind: "exact", date: "2026-10-15", timezone: "UTC" },
    fee: { status: "no-fee" },
    prize: "Contributor copies and an honorarium",
    location: "Open internationally · online submission",
    simultaneousAllowed: true,
    submissionAvailable: true,
    source: { ...source },
    eligibility: [
      {
        key: "international",
        description: "Writers may submit from any country",
        certainty: "confirmed",
      },
    ],
    requiredMaterials: [
      {
        label: "Writing sample",
        description: "Up to five poems or one prose work",
        required: true,
        limit: "5 poems or 5,000 words",
      },
      {
        label: "Short biography",
        description: "Up to 100 words",
        required: true,
      },
    ],
    guidelinesUrl: "https://example.org/opportunities/guidelines",
    submissionUrl: "https://example.org/opportunities/apply",
    changes: [],
    organizationSummary:
      "An independent review publishing poetry, fiction, and literary essays.",
    relatedOpportunityIds: [],
    callProfile: {
      callKind: "general-submission",
      marketKind: "journal",
      publicationFormats: ["Print", "Digital"],
      acceptedFormats: ["DOCX", "PDF"],
      subgenres: ["Literary fiction", "Narrative poetry"],
      readingPeriodKind: "exact",
      readingPeriodLabel: "1 September–15 October 2026",
      paymentType: "flat-fee",
      paymentAmountCents: 7500,
      paymentCurrency: "USD",
      reprintsAllowed: false,
      previouslyUnpublishedRequired: true,
      multipleSubmissionsAllowed: true,
      wordLimitMax: 5000,
      responseTimeDays: 90,
      eligibilitySummary: "Open internationally to writers aged 18 and over.",
      rightsSummary: "First North American serial rights; rights revert after publication.",
      confidence: "confirmed",
      sourceUrl: "https://example.org/opportunities/guidelines",
      lastVerifiedAt: "2026-08-30T12:00:00.000Z",
      prizes: [],
      windows: [
        {
          label: "Autumn reading period",
          opensAt: "2026-09-01T00:00:00.000Z",
          closesAt: "2026-10-15T23:59:00.000Z",
          kind: "exact",
          timezone: "UTC",
          current: true,
          sourceUrl: "https://example.org/opportunities/guidelines",
          confidence: "confirmed",
        },
      ],
    },
    content: {
      builderVersion: "phase-1-fixture.v1",
      summary:
        "North River Review is reading poetry and fiction for its next issue, with international eligibility and an online submission route.",
      highlights: [
        {
          label: "Reading period",
          value: "1 September–15 October 2026",
          sourceUrl: "https://example.org/opportunities/guidelines",
          certainty: "confirmed",
        },
        {
          label: "Payment",
          value: "$75 flat fee",
          sourceUrl: "https://example.org/opportunities/guidelines",
          certainty: "confirmed",
        },
      ],
      preparation: ["Choose one prose work or up to five poems", "Prepare a 100-word biography"],
      unknowns: ["The current source does not state an AI-assisted work policy"],
      nextAction: "Read the official guidelines before preparing the submission.",
      sourceUrl: "https://example.org/opportunities/guidelines",
      generatedAt: "2026-08-30T12:00:00.000Z",
      review: {
        status: "approved",
        score: 100,
        reasons: [],
        checks: {},
        reviewedAt: "2026-08-30T12:30:00.000Z",
      },
    },
    ...changes,
  };
  return { id, label, scenarios, opportunity };
}

export const opportunityFixtures: OpportunityFixture[] = [
  fixture("complete", "Complete record", ["complete", "no fee", "international", "terms"]),
  fixture("long-title", "Long identity", ["long title", "long organization"], {
    title:
      "International Open Call for Interdisciplinary Artists Working Across Sound, Public Space, Moving Image, and Community Memory",
    organizationName:
      "The Centre for Experimental Civic Art, Shared Archives, and Public Imagination",
    type: "open-call",
    genres: ["Sound", "Moving image", "Social practice"],
  }),
  fixture("unknowns", "Unknown facts", ["missing organization", "missing deadline", "missing fee", "missing location", "missing image"], {
    organizationId: undefined,
    organizationName: undefined,
    organizationVerified: false,
    deadline: { kind: "unknown" },
    fee: { status: "unknown" },
    location: undefined,
    requiredMaterials: [],
    eligibility: [],
    callProfile: undefined,
  }),
  fixture("rolling", "Rolling opportunity", ["rolling deadline", "application fee"], {
    type: "residency",
    deadline: { kind: "rolling" },
    fee: { status: "paid", amountCents: 1500, currency: "USD" },
  }),
  fixture("conflict", "Conflicting deadline", ["conflicting deadline", "source warning"], {
    deadline: {
      kind: "conflicting",
      raw: "15 October on the call page; 30 October in the application portal",
    },
  }),
  fixture("changed", "Changed since saved", ["changed since saved", "deadline extended", "tracked"], {
    status: "deadline-extended",
    deadline: { kind: "exact", date: "2026-11-01" },
    personal: {
      tracked: true,
      followingOrganization: true,
      tailoringReasons: [],
    },
    changes: [
      {
        kind: "deadline",
        at: "2026-08-29T16:00:00.000Z",
        oldValue: "2026-10-15",
        newValue: "2026-11-01",
      },
    ],
  }),
  fixture("closed", "Closed opportunity", ["closed", "unavailable action"], {
    status: "closed",
    submissionAvailable: false,
  }),
  fixture("source-unavailable", "Source unavailable", ["unavailable source", "recoverable warning"], {
    guidelinesUrl: undefined,
    submissionUrl: undefined,
    source: {
      ...source,
      name: "Organization listing",
      url: "https://example.org/unavailable-source",
    },
  }),
  fixture("image", "Rights-cleared identity", ["image", "accessible alt"], {
    identityAssetUrl: "/media/home/opportunity-dance.webp",
    identityAssetAlt: "Performer moving across a dark stage under a narrow light",
    type: "commission",
    discipline: "Performance & live art",
    genres: ["Dance", "Performance"],
  }),
  fixture("prize", "Prize and judge", ["prize", "judge", "known fee"], {
    type: "contest",
    prize: "$5,000 first prize",
    fee: { status: "paid", amountCents: 2500, currency: "USD" },
    callProfile: {
      ...fixture("nested", "Nested", []).opportunity.callProfile!,
      callKind: "prize",
      marketKind: "contest",
      judgeName: "Mara Okafor",
      prizeSummary: "$5,000 first prize and publication",
      prizes: [
        {
          rank: 1,
          title: "First prize",
          amountCents: 500000,
          currency: "USD",
          judgeName: "Mara Okafor",
          sourceUrl: "https://example.org/opportunities/guidelines",
          confidence: "confirmed",
        },
      ],
    },
  }),
];

export const opportunityFixtureScenarios = [
  ...new Set(opportunityFixtures.flatMap((entry) => entry.scenarios)),
  "empty results",
  "loading results",
  "recoverable error",
  "pagination",
  "anonymous action",
  "authenticated action",
] as const;

export function opportunityFixtureById(id?: string): OpportunityFixture {
  return opportunityFixtures.find((entry) => entry.id === id) ?? opportunityFixtures[0];
}
