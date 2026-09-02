import type {
  OpportunityBrowseProjection,
  OpportunityRepositoryQuery,
} from "@missa/radar-engine";
import { taxonomyTermId } from "@missa/taxonomy";
import type { OpportunityFacetCounts } from "./opportunityFacetCounts";

const checkedAt = "2026-09-02T12:00:00.000Z";

const practice = {
  writing: taxonomyTermId("practice-family", "Writing & literature"),
  visual: taxonomyTermId("practice-family", "Visual arts"),
  performance: taxonomyTermId("practice-family", "Performance & live art"),
  film: taxonomyTermId("practice-family", "Film & moving image"),
  music: taxonomyTermId("practice-family", "Music & sound"),
  design: taxonomyTermId("practice-family", "Design"),
  interdisciplinary: taxonomyTermId(
    "practice-family",
    "Interdisciplinary, hybrid & emerging practice",
  ),
};

function previewOpportunity(
  input: Omit<OpportunityBrowseProjection, "source" | "submissionAvailable"> & {
    summary: string;
  },
): OpportunityBrowseProjection {
  const { summary, ...opportunity } = input;
  return {
    ...opportunity,
    submissionAvailable: true,
    source: {
      kind: "preview-fixture",
      name: opportunity.organizationName ?? "Preview organization",
      url: "https://preview.invalid/opportunity",
      checkedAt,
      organizationConfirmed: true,
    },
    content: {
      builderVersion: "preview.v1",
      summary,
      highlights: [],
      preparation: [],
      unknowns: [],
      nextAction: "Review the opportunity details.",
      sourceUrl: "https://preview.invalid/opportunity",
      generatedAt: checkedAt,
      review: { status: "approved", score: 1, reasons: [], checks: {} },
    },
  };
}

export const PUBLIC_OPPORTUNITY_PREVIEW_ITEMS: OpportunityBrowseProjection[] = [
  previewOpportunity({
    id: "preview-hopper",
    slug: "preview-hopper-poetry-prize",
    title: "The Hopper Poetry Prize",
    organizationName: "Green Writers Press",
    organizationVerified: true,
    identityAssetUrl: "/media/home/opportunity-mountains.webp",
    identityAssetAlt: "Mountain valley beneath an open sky",
    status: "opening-soon",
    type: "contest",
    discipline: "Poetry",
    genres: ["First book", "Poetry"],
    taxonomy: { schemeVersion: 1, termIds: [practice.writing], primaryTermIds: [practice.writing] },
    deadline: { kind: "exact", date: "2026-10-24", timezone: "America/New_York" },
    fee: { status: "paid", amountCents: 3000, currency: "USD" },
    prize: "$2,500 and publication",
    location: "Worldwide",
    summary: "A first-book prize for poets writing in English, with publication and an editorial mentorship.",
  }),
  previewOpportunity({
    id: "preview-vcca",
    slug: "preview-vcca-fellowship",
    title: "Virginia Center for the Creative Arts Fellowship",
    organizationName: "VCCA",
    organizationVerified: true,
    identityAssetUrl: "/media/home/opportunity-architecture.webp",
    identityAssetAlt: "Modern arts center beneath a blue sky",
    status: "closing-soon",
    type: "fellowship",
    discipline: "Interdisciplinary practice",
    genres: ["Residency", "Fellowship"],
    taxonomy: { schemeVersion: 1, termIds: [practice.interdisciplinary], primaryTermIds: [practice.interdisciplinary] },
    deadline: { kind: "exact", date: "2026-09-08", timezone: "America/New_York" },
    fee: { status: "paid", amountCents: 5000, currency: "USD" },
    prize: "Funded studio residency",
    location: "Virginia, USA",
    summary: "Dedicated time, studio space, and an interdisciplinary community for artists and writers.",
  }),
  previewOpportunity({
    id: "preview-dance",
    slug: "preview-new-movement-fund",
    title: "New Movement Commission Fund",
    organizationName: "Kinetic Assembly",
    organizationVerified: true,
    identityAssetUrl: "/media/home/opportunity-dance.webp",
    identityAssetAlt: "Dancer rehearsing in a sunlit studio",
    status: "open",
    type: "commission",
    discipline: "Dance & choreography",
    genres: ["Performance", "Commission"],
    taxonomy: { schemeVersion: 1, termIds: [practice.performance], primaryTermIds: [practice.performance] },
    deadline: { kind: "exact", date: "2026-09-29", timezone: "Europe/London" },
    fee: { status: "no-fee", amountCents: 0, currency: "USD" },
    prize: "$8,000 production award",
    location: "International",
    summary: "Production support for a new live work led by an independent choreographer or collective.",
  }),
  previewOpportunity({
    id: "preview-gallery",
    slug: "preview-emerging-visions",
    title: "Emerging Visions Exhibition Open Call",
    organizationName: "Northline Contemporary",
    organizationVerified: true,
    identityAssetUrl: "/media/home/gallery-interior.webp",
    identityAssetAlt: "Contemporary gallery with large-scale artworks",
    status: "open",
    type: "exhibition",
    discipline: "Visual arts",
    genres: ["Exhibition", "Emerging artists"],
    taxonomy: { schemeVersion: 1, termIds: [practice.visual], primaryTermIds: [practice.visual] },
    deadline: { kind: "exact", date: "2026-10-12", timezone: "UTC" },
    fee: { status: "no-fee", amountCents: 0, currency: "USD" },
    prize: "Exhibition and production support",
    location: "Berlin, Germany",
    summary: "A group exhibition for ambitious new work across painting, sculpture, installation, and lens-based media.",
  }),
  previewOpportunity({
    id: "preview-film",
    slug: "preview-short-film-lab",
    title: "Independent Short Film Lab",
    organizationName: "Frame North",
    organizationVerified: true,
    identityAssetUrl: "/media/home/artist-at-work.webp",
    identityAssetAlt: "Artist working inside a studio",
    status: "open",
    type: "fellowship",
    discipline: "Film & moving image",
    genres: ["Short film", "Development lab"],
    taxonomy: { schemeVersion: 1, termIds: [practice.film], primaryTermIds: [practice.film] },
    deadline: { kind: "exact", date: "2026-10-03", timezone: "UTC" },
    fee: { status: "unknown" },
    prize: "Mentorship and post-production support",
    location: "Remote with Toronto residency",
    summary: "A development lab for directors preparing a narrative, documentary, or experimental short.",
  }),
  previewOpportunity({
    id: "preview-design",
    slug: "preview-social-design",
    title: "Designing for Public Life Fellowship",
    organizationName: "Civic Forms Institute",
    organizationVerified: true,
    identityAssetUrl: "/media/home/portfolio-still-life.webp",
    identityAssetAlt: "Objects arranged as a design still life",
    status: "closing-soon",
    type: "fellowship",
    discipline: "Design",
    genres: ["Social design", "Public realm"],
    taxonomy: { schemeVersion: 1, termIds: [practice.design], primaryTermIds: [practice.design] },
    deadline: { kind: "exact", date: "2026-09-15", timezone: "UTC" },
    fee: { status: "no-fee", amountCents: 0, currency: "USD" },
    prize: "$12,000 fellowship",
    location: "Hybrid",
    summary: "A supported fellowship for designers working on civic systems, services, and public space.",
  }),
  previewOpportunity({
    id: "preview-music",
    slug: "preview-listening-room",
    title: "The Listening Room: Sound Art Commission",
    organizationName: "Bosphorus Arts Lab",
    organizationVerified: true,
    identityAssetUrl: "/media/missa-bosphorus-poster.jpg",
    identityAssetAlt: "Editorial poster for an arts programme",
    status: "open",
    type: "commission",
    discipline: "Music & sound",
    genres: ["Sound art", "Installation"],
    taxonomy: { schemeVersion: 1, termIds: [practice.music], primaryTermIds: [practice.music] },
    deadline: { kind: "exact", date: "2026-11-01", timezone: "Europe/Istanbul" },
    fee: { status: "no-fee", amountCents: 0, currency: "USD" },
    prize: "€6,000 commission",
    location: "Istanbul, Türkiye",
    summary: "A site-responsive commission for artists working with sound, listening, performance, and place.",
  }),
  previewOpportunity({
    id: "preview-journal",
    slug: "preview-saltwater-lessons",
    title: "Saltwater Lessons: Hybrid Writing Call",
    organizationName: "Morrow Journal",
    organizationVerified: true,
    identityAssetUrl: "/media/prototypes/saltwater-lessons.png",
    identityAssetAlt: "Saltwater Lessons editorial artwork",
    status: "open",
    type: "magazine",
    discipline: "Writing & literature",
    genres: ["Hybrid", "Essay", "Poetry"],
    taxonomy: { schemeVersion: 1, termIds: [practice.writing], primaryTermIds: [practice.writing] },
    deadline: { kind: "rolling" },
    fee: { status: "no-fee", amountCents: 0, currency: "USD" },
    location: "Worldwide",
    summary: "A rolling call for lyric essays, poetry, image-text work, and writing that resists a single form.",
  }),
];

export const PUBLIC_OPPORTUNITY_PREVIEW_FACETS: OpportunityFacetCounts = {
  total: PUBLIC_OPPORTUNITY_PREVIEW_ITEMS.length,
  types: [
    { value: "open-call", label: "Open call", count: 0 },
    { value: "magazine", label: "Magazine", count: 1 },
    { value: "grant", label: "Grant", count: 0 },
    { value: "award", label: "Award", count: 0 },
    { value: "residency", label: "Residency", count: 0 },
    { value: "fellowship", label: "Fellowship", count: 3 },
    { value: "contest", label: "Contest", count: 1 },
    { value: "commission", label: "Commission", count: 2 },
  ],
  practices: [
    { value: practice.writing, label: "Writing & literature", count: 2 },
    { value: practice.visual, label: "Visual arts", count: 1 },
    { value: practice.performance, label: "Performance & live art", count: 1 },
    { value: practice.film, label: "Film & moving image", count: 1 },
    { value: practice.music, label: "Music & sound", count: 1 },
    { value: practice.design, label: "Design", count: 1 },
    { value: practice.interdisciplinary, label: "Interdisciplinary, hybrid & emerging practice", count: 1 },
  ],
};

export function previewItemsForQuery(
  query: OpportunityRepositoryQuery,
): OpportunityBrowseProjection[] {
  const normalizedSearch = query.query?.trim().toLowerCase();
  const now = new Date("2026-09-02T12:00:00.000Z").getTime();
  const filtered = PUBLIC_OPPORTUNITY_PREVIEW_ITEMS.filter((item) => {
    if (query.types?.length && !query.types.includes(item.type)) return false;
    if (
      query.taxonomyTermIds?.length &&
      !query.taxonomyTermIds.some((term) => item.taxonomy?.termIds.includes(term))
    )
      return false;
    if (query.feeStatus && item.fee.status !== query.feeStatus) return false;
    if (query.locations?.length && !query.locations.includes(item.location ?? ""))
      return false;
    if (query.deadlineWithinDays) {
      if (!item.deadline.date) return false;
      const deadline = new Date(`${item.deadline.date}T23:59:59Z`).getTime();
      if (deadline < now || deadline > now + query.deadlineWithinDays * 86_400_000)
        return false;
    }
    if (normalizedSearch) {
      const haystack = [
        item.title,
        item.organizationName,
        item.discipline,
        ...item.genres,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });

  if (query.sort === "recently-added") return [...filtered].reverse();
  return filtered;
}
