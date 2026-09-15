export type MissaWebMcpSurface =
  "public" | "creator" | "organization" | "reviewer" | "blocked";

type JsonSchema = Record<string, unknown>;

export type MissaWebMcpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
    consequentialHint: boolean;
  };
  execute: (
    input: Record<string, unknown>,
    options: { signal: AbortSignal },
  ) => Promise<unknown>;
};

export type MissaWebMcpRequest = (
  path: string,
  signal: AbortSignal,
) => Promise<unknown>;

export type MissaWebMcpPageContext = () => {
  title?: string;
  primaryHeading?: string;
};

type ToolContext = {
  pathname: string;
  search: string;
  surface: MissaWebMcpSurface;
  organizationId?: string;
  request: MissaWebMcpRequest;
  pageContext: MissaWebMcpPageContext;
};

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  untrustedContentHint: true,
  consequentialHint: false,
} as const;

const BLOCKED_PATHS = [
  /^\/admin(?:\/|$)/u,
  /^\/auth(?:\/|$)/u,
  /^\/(?:login|signup|forgot-password|reset-password)(?:\/|$)/u,
  /^\/unsubscribe(?:\/|$)/u,
  /^\/(?:publication-claim|rankings\/claim)(?:\/|$)/u,
  /^\/(?:my-submissions|tracker\/submissions)\/[^/]+(?:\/|$)/u,
  /^\/organization\/[^/]+\/(?:settings|submissions\/[^/]+)(?:\/|$)/u,
  /^\/workspace\/settings(?:\/|$)/u,
];

const CREATOR_PATHS = new Set([
  "/ask",
  "/calendar",
  "/following",
  "/goals",
  "/home",
  "/import",
  "/inbox",
  "/insights",
  "/library",
  "/messages",
  "/my-submissions",
  "/onboarding",
  "/profile",
  "/saved",
  "/tracker",
]);

const CREATOR_NESTED_PATHS = [...CREATOR_PATHS].filter(
  (path) => path !== "/profile",
);

const REVIEWER_PATHS = [/^\/reviewer(?:\/|$)/u, /^\/reviews(?:\/|$)/u];

const ORGANIZATION_PATHS = [
  /^\/organization(?:\/|$)/u,
  /^\/workspace(?:\/|$)/u,
  /^\/submissions(?:\/|$)/u,
];

const OPPORTUNITY_TYPES = new Set([
  "open-call",
  "magazine",
  "grant",
  "award",
  "fellowship",
  "residency",
  "festival",
  "scholarship",
  "conference",
  "rfp",
  "contest",
  "pitch",
  "exhibition",
  "commission",
  "job",
  "other",
]);

const MAGAZINE_GENRES = new Set(["overall", "poetry", "fiction", "nonfiction"]);

function matchesAny(pathname: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(pathname));
}

export function isWebMcpBlockedPath(pathname: string): boolean {
  return matchesAny(pathname, BLOCKED_PATHS);
}

export function classifyWebMcpSurface(pathname: string): MissaWebMcpSurface {
  if (isWebMcpBlockedPath(pathname)) return "blocked";
  if (matchesAny(pathname, REVIEWER_PATHS)) return "reviewer";
  if (matchesAny(pathname, ORGANIZATION_PATHS)) return "organization";
  if (
    CREATOR_PATHS.has(pathname) ||
    pathname === "/profile/portfolio" ||
    pathname.startsWith("/profile/portfolio/") ||
    CREATOR_NESTED_PATHS.some((path) => pathname.startsWith(`${path}/`))
  ) {
    return "creator";
  }
  return "public";
}

export function organizationIdFromLocation(
  pathname: string,
  search: string,
): string | undefined {
  const routeId = pathname.match(/^\/organization\/([^/]+)(?:\/|$)/u)?.[1];
  const queryId =
    new URLSearchParams(search).get("organizationId") ?? undefined;
  const candidate = routeId ?? queryId;
  if (!candidate) return undefined;
  try {
    const decoded = decodeURIComponent(candidate).trim();
    return /^[A-Za-z0-9_-]{1,200}$/u.test(decoded) ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function optionalString(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function requiredString(
  input: Record<string, unknown>,
  key: string,
  maxLength: number,
): string {
  const value = optionalString(input[key], maxLength);
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

function authorityEnvelope(note: string) {
  return {
    authority_effect: "none",
    mutation_available: false,
    provider_confirmation: false,
    note,
  } as const;
}

function pagination(total: unknown, offset: number, count: number) {
  const totalCount =
    typeof total === "number" && Number.isFinite(total) ? total : count;
  const nextOffset = offset + count;
  return {
    totalCount,
    count,
    offset,
    hasMore: nextOffset < totalCount,
    nextOffset: nextOffset < totalCount ? nextOffset : null,
  };
}

function creatorIdentifierFromPathname(pathname: string): string | undefined {
  const handle = pathname.match(/^\/(@[A-Za-z0-9_-]{1,200})(?:\/|$)/u)?.[1];
  if (handle) return handle;
  return pathname.match(/^\/profile\/([A-Za-z0-9_-]{1,200})(?:\/|$)/u)?.[1];
}

function readOnlyTool(
  definition: Omit<MissaWebMcpTool, "annotations">,
): MissaWebMcpTool {
  return { ...definition, annotations: READ_ONLY_ANNOTATIONS };
}

function summarizeOpportunity(value: unknown) {
  const item = asRecord(value);
  const deadline = asRecord(item.deadline);
  const fee = asRecord(item.fee);
  const source = asRecord(item.source);
  const personal = asRecord(item.personal);
  return {
    id: item.id,
    title: item.title,
    organizationName: item.organizationName,
    type: item.type,
    status: item.status,
    deadline: {
      kind: deadline.kind,
      date: deadline.date,
      time: deadline.time,
      timezone: deadline.timezone,
    },
    fee: {
      status: fee.status,
      amountCents: fee.amountCents,
      currency: fee.currency,
    },
    location: item.location,
    country: item.country,
    submissionAvailable: item.submissionAvailable,
    source: {
      kind: source.kind,
      name: source.name,
      url: source.url,
    },
    personal: Object.keys(personal).length
      ? {
          tracked: personal.tracked,
          followingOrganization: personal.followingOrganization,
          tailoringReasons: asArray(personal.tailoringReasons).slice(0, 4),
        }
      : undefined,
  };
}

function boundedStringArray(value: unknown, limit: number, maxLength: number) {
  return asArray(value)
    .slice(0, limit)
    .map((item) => optionalString(item, maxLength))
    .filter((item): item is string => Boolean(item));
}

function summarizeOpportunityContent(value: unknown) {
  const content = asRecord(value);
  if (!Object.keys(content).length) return undefined;
  const targetAudience = asRecord(content.targetAudience);
  const review = asRecord(content.review);
  return {
    summary: optionalString(content.summary, 600),
    description: optionalString(content.description, 1_200),
    editorialHook: optionalString(content.editorialHook, 400),
    curatorialOverview: optionalString(content.curatorialOverview, 1_200),
    targetAudience: Object.keys(targetAudience).length
      ? {
          careerStages: boundedStringArray(targetAudience.careerStages, 4, 40),
          idealCandidate: optionalString(targetAudience.idealCandidate, 600),
        }
      : undefined,
    thematicFocus: optionalString(content.thematicFocus, 400),
    insiderTips: boundedStringArray(content.insiderTips, 8, 400),
    curatedChecklist: asArray(content.curatedChecklist)
      .slice(0, 20)
      .map((value) => {
        const item = asRecord(value);
        return {
          item: optionalString(item.item, 300),
          requirement: optionalString(item.requirement, 300),
          curatorialAdvice: optionalString(item.curatorialAdvice, 400),
        };
      }),
    highlights: asArray(content.highlights)
      .slice(0, 20)
      .map((value) => {
        const item = asRecord(value);
        return {
          label: optionalString(item.label, 100),
          value: optionalString(item.value, 320),
          sourceUrl: optionalString(item.sourceUrl, 2_048),
          certainty: optionalString(item.certainty, 20),
        };
      }),
    preparation: boundedStringArray(content.preparation, 32, 300),
    unknowns: boundedStringArray(content.unknowns, 32, 300),
    nextAction: optionalString(content.nextAction, 300),
    sourceUrl: optionalString(content.sourceUrl, 2_048),
    generatedAt: optionalString(content.generatedAt, 100),
    review: Object.keys(review).length
      ? {
          status: optionalString(review.status, 40),
          score:
            typeof review.score === "number" && Number.isFinite(review.score)
              ? review.score
              : undefined,
          reasons: boundedStringArray(review.reasons, 16, 300),
        }
      : undefined,
  };
}

function surfaceContextTool(context: ToolContext): MissaWebMcpTool {
  return readOnlyTool({
    name: "missa.get_surface_context",
    title: "Describe this Missa surface",
    description:
      "Describe the active Missa surface, its route scope, and the authority limits of the available browser tools.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    async execute() {
      const page = context.pageContext();
      return {
        surface: context.surface,
        path: `${context.pathname}${context.search}`,
        organizationId: context.organizationId,
        title: page.title,
        primaryHeading: page.primaryHeading,
        lifecycle:
          "Discover -> Evaluate -> Save -> Prepare -> Apply -> Confirm -> Track -> Outcome",
        available_tools: createMissaWebMcpTools(context).map(
          (tool) => tool.name,
        ),
        ...authorityEnvelope(
          "Tool output is a bounded Missa projection. An official-destination link or recorded personal status is not proof of eligibility, readiness, submission, publication, or provider confirmation.",
        ),
      };
    },
  });
}

function searchOpportunitiesTool(context: ToolContext): MissaWebMcpTool {
  return readOnlyTool({
    name: "missa.search_opportunities",
    title: "Search Missa opportunities",
    description:
      "Search Missa's source-attributed opportunity catalogue with bounded public filters. Results describe discovery records, not eligibility or provider acceptance.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 200 },
        type: { type: "string", enum: [...OPPORTUNITY_TYPES] },
        country: { type: "string", maxLength: 80 },
        noFeeOnly: { type: "boolean" },
        deadlineWithinDays: { type: "integer", minimum: 0, maximum: 366 },
        verifiedOnly: { type: "boolean" },
        limit: { type: "integer", minimum: 1, maximum: 12, default: 8 },
      },
      additionalProperties: false,
    },
    async execute(input, options) {
      const params = new URLSearchParams();
      const query = optionalString(input.query, 200);
      const country = optionalString(input.country, 80);
      const type = optionalString(input.type, 40);
      if (query) params.set("q", query);
      if (country) params.set("country", country);
      if (type && OPPORTUNITY_TYPES.has(type)) params.set("type", type);
      if (input.noFeeOnly === true) params.set("feeToggle", "true");
      if (input.verifiedOnly === true) params.set("verified", "true");
      if (typeof input.deadlineWithinDays === "number") {
        params.set(
          "deadlineWithinDays",
          String(boundedInteger(input.deadlineWithinDays, 366, 0, 366)),
        );
      }
      const limit = boundedInteger(input.limit, 8, 1, 12);
      params.set("limit", String(limit));
      const response = asRecord(
        await context.request(`/api/opportunities?${params}`, options.signal),
      );
      return {
        total: response.total,
        nextCursor: response.nextCursor,
        items: asArray(response.items)
          .slice(0, limit)
          .map(summarizeOpportunity),
        ...authorityEnvelope(
          "Catalogue inclusion and matching reasons are discovery evidence only. Verify current eligibility and submission instructions at the named source.",
        ),
      };
    },
  });
}

function getOpportunityTool(context: ToolContext): MissaWebMcpTool {
  return readOnlyTool({
    name: "missa.get_opportunity",
    title: "Inspect a Missa opportunity",
    description:
      "Read one source-attributed Missa opportunity, including stated eligibility, required materials, changes, and official destinations.",
    inputSchema: {
      type: "object",
      properties: {
        opportunityId: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          pattern: "^[A-Za-z0-9_-]+$",
        },
      },
      required: ["opportunityId"],
      additionalProperties: false,
    },
    async execute(input, options) {
      const opportunityId = requiredString(input, "opportunityId", 200);
      if (!/^[A-Za-z0-9_-]+$/u.test(opportunityId)) {
        throw new Error("opportunityId contains unsupported characters.");
      }
      const response = asRecord(
        await context.request(
          `/api/opportunities/${encodeURIComponent(opportunityId)}`,
          options.signal,
        ),
      );
      return {
        ...summarizeOpportunity(response),
        eligibility: asArray(response.eligibility).slice(0, 32),
        requiredMaterials: asArray(response.requiredMaterials).slice(0, 32),
        guidelinesUrl: response.guidelinesUrl,
        submissionUrl: response.submissionUrl,
        simultaneousAllowed: response.simultaneousAllowed,
        changes: asArray(response.changes).slice(0, 16),
        organizationSummary: optionalString(
          response.organizationSummary,
          1_000,
        ),
        content: summarizeOpportunityContent(response.content),
        ...authorityEnvelope(
          "This reads Missa's latest bounded record and official destinations. It does not test the creator's eligibility, prepare materials, open the provider site, or submit an application.",
        ),
      };
    },
  });
}

function listMagazineRankingsTool(context: ToolContext): MissaWebMcpTool {
  return readOnlyTool({
    name: "missa.list_magazine_rankings",
    title: "List magazine rankings",
    description:
      "List a bounded page of Missa's 2026 literary magazine index with score components, source state, and active opportunity references.",
    inputSchema: {
      type: "object",
      properties: {
        genre: {
          type: "string",
          enum: [...MAGAZINE_GENRES],
          default: "overall",
        },
        limit: { type: "integer", minimum: 1, maximum: 20, default: 10 },
        offset: { type: "integer", minimum: 0, maximum: 10_000, default: 0 },
      },
      additionalProperties: false,
    },
    async execute(input, options) {
      const requestedGenre = optionalString(input.genre, 20) ?? "overall";
      const genre = MAGAZINE_GENRES.has(requestedGenre)
        ? requestedGenre
        : "overall";
      const limit = boundedInteger(input.limit, 10, 1, 20);
      const offset = boundedInteger(input.offset, 0, 0, 10_000);
      const params = new URLSearchParams({
        genre,
        limit: String(limit),
        offset: String(offset),
      });
      const response = asRecord(
        await context.request(
          `/api/rankings/magazines?${params}`,
          options.signal,
        ),
      );
      const items = asArray(response.items)
        .slice(0, limit)
        .map((value) => {
          const ranking = asRecord(value);
          const activeOpportunity = asRecord(ranking.activeOpportunity);
          return {
            profileId: ranking.profileId,
            name: ranking.name,
            slug: ranking.slug,
            websiteUrl: ranking.websiteUrl,
            rankingYear: ranking.rankingYear,
            genre: ranking.genre,
            rankPosition: ranking.rankPosition,
            previousYearRank: ranking.previousYearRank,
            rankDelta: ranking.rankDelta,
            prestigeTier: ranking.prestigeTier,
            totalScore: ranking.totalScore,
            scores: {
              accolades: ranking.accoladesScore,
              pay: ranking.payScore,
              turnaround: ranking.turnaroundScore,
              fees: ranking.feesScore,
              respect: ranking.respectScore,
              formatAndEthics: ranking.formatEthicsScore,
            },
            medianResponseDays: ranking.medianResponseDays,
            regularFeeCents: ranking.regularFeeCents,
            contributorPayCents: ranking.contributorPayCents,
            simultaneousPolicy: ranking.simultaneousPolicy,
            activeOpportunity: Object.keys(activeOpportunity).length
              ? {
                  id: activeOpportunity.id,
                  title: activeOpportunity.title,
                  deadline: activeOpportunity.deadline,
                  status: activeOpportunity.status,
                  detailUrl: activeOpportunity.detailUrl,
                  officialWebsite: activeOpportunity.officialWebsite,
                }
              : null,
          };
        });
      return {
        methodology: {
          version: "2026 beta",
          path: "/rankings/methodology",
          genre,
          dataSource: response.dataSource,
          seededPreview: response.dataSource === "seed",
        },
        ...pagination(response.total, offset, items.length),
        items,
        ...authorityEnvelope(
          "Rank and score are rule-based comparison aids derived from the fields currently available to the index. They are not publisher endorsement, creator fit, eligibility, acceptance likelihood, or current-term certification.",
        ),
      };
    },
  });
}

function listResidencyRankingsTool(context: ToolContext): MissaWebMcpTool {
  return readOnlyTool({
    name: "missa.list_residency_rankings",
    title: "List residency rankings",
    description:
      "List a bounded page of Missa's 2026 residency index with composite score components, coverage signals, and source state.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20, default: 10 },
        offset: { type: "integer", minimum: 0, maximum: 10_000, default: 0 },
      },
      additionalProperties: false,
    },
    async execute(input, options) {
      const limit = boundedInteger(input.limit, 10, 1, 20);
      const offset = boundedInteger(input.offset, 0, 0, 10_000);
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      const response = asRecord(
        await context.request(
          `/api/rankings/residencies?${params}`,
          options.signal,
        ),
      );
      const items = asArray(response.items)
        .slice(0, limit)
        .map((value) => {
          const ranking = asRecord(value);
          return {
            profileId: ranking.profileId,
            name: ranking.name,
            slug: ranking.slug,
            websiteUrl: ranking.websiteUrl,
            location: ranking.location,
            country: ranking.country,
            prestigeTier: ranking.prestigeTier,
            totalScore: ranking.totalScore,
            scores: {
              funding: ranking.fundingScore,
              communityRating: ranking.ratingScore,
              facilities: ranking.facilitiesScore,
              access: ranking.accessScore,
            },
            communityRating: ranking.rmarRating,
            communityRatingCount: ranking.rmarRatingsCount,
            communityReviewCount: ranking.rmarReviewsCount,
            isFullyFunded: ranking.isFullyFunded,
            hasStipend: ranking.hasStipend,
            hasMeals: ranking.hasMeals,
            hasPrivateStudio: ranking.hasPrivateStudio,
            disciplines: ranking.disciplines,
            foundingYear: ranking.foundingYear,
            summary: optionalString(ranking.summary, 600),
          };
        });
      return {
        methodology: {
          version: "2026 beta",
          path: "/rankings/methodology",
          dataSource: response.dataSource,
          intentionalEmptyState: response.dataSource === "empty",
        },
        ...pagination(response.total, offset, items.length),
        items,
        ...authorityEnvelope(
          "Residency scores are comparison aids from currently available program records and community reporting. They do not certify program quality, current terms, creator fit, eligibility, safety, or acceptance likelihood.",
        ),
      };
    },
  });
}

function getPublicCreatorProfileTool(context: ToolContext): MissaWebMcpTool {
  return readOnlyTool({
    name: "missa.get_public_creator_profile",
    title: "Read a public creator profile",
    description:
      "Read a creator's public Missa identity and currently published portfolio by @handle or public user ID. Private drafts and creator workspace data are never returned.",
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          pattern: "^@?[A-Za-z0-9_-]+$",
          description:
            "A Missa @handle or public user ID. Optional when the active page is already a public creator profile.",
        },
        workLimit: { type: "integer", minimum: 1, maximum: 12, default: 8 },
        includeWorkText: { type: "boolean", default: false },
      },
      additionalProperties: false,
    },
    async execute(input, options) {
      const identifier =
        optionalString(input.identifier, 200) ??
        creatorIdentifierFromPathname(context.pathname);
      if (!identifier || !/^@?[A-Za-z0-9_-]{1,200}$/u.test(identifier)) {
        throw new Error(
          "Provide a valid Missa @handle or public user ID, or open a public creator profile first.",
        );
      }
      const workLimit = boundedInteger(input.workLimit, 8, 1, 12);
      const response = asRecord(
        await context.request(
          `/api/public/creators/${encodeURIComponent(identifier)}?${new URLSearchParams(
            {
              workLimit: String(workLimit),
              includeWorkText:
                input.includeWorkText === true ? "true" : "false",
            },
          )}`,
          options.signal,
        ),
      );
      const profile = asRecord(response.profile);
      const portfolio = asRecord(response.portfolio);
      const book = asRecord(portfolio.book);
      const credit = asRecord(portfolio.credit);
      const contact = asRecord(portfolio.contact);
      const works = asArray(portfolio.works)
        .slice(0, workLimit)
        .map((value) => {
          const work = asRecord(value);
          return {
            title: work.title,
            text:
              input.includeWorkText === true
                ? optionalString(work.text, 3_000)
                : undefined,
            url: work.url,
            image: work.image,
            audio: work.audio,
            formats: asArray(work.formats).slice(0, 6),
          };
        });
      return {
        canonicalPath: response.canonicalPath,
        handle: response.handle,
        profile: Object.keys(profile).length
          ? {
              displayName: profile.displayName,
              bio: optionalString(profile.bio, 2_000),
            }
          : undefined,
        portfolio: Object.keys(portfolio).length
          ? {
              name: portfolio.name,
              bio: optionalString(portfolio.bio, 600),
              photo: portfolio.photo,
              selected: asArray(portfolio.selected).slice(0, 12),
              works,
              workCount:
                typeof portfolio.workCount === "number"
                  ? portfolio.workCount
                  : asArray(portfolio.works).length,
              book: Object.keys(book).length ? book : undefined,
              credit: Object.keys(credit).length ? credit : undefined,
              contact: Object.keys(contact).length ? contact : undefined,
              sections: asArray(portfolio.sections).slice(0, 2),
              theme: portfolio.theme,
            }
          : undefined,
        publicationState: Object.keys(portfolio).length
          ? "published-portfolio"
          : "public-profile-only",
        privateDataExcluded: [
          "portfolio drafts",
          "profile settings",
          "Library",
          "Tracker",
          "applications",
          "files not in the published portfolio",
        ],
        ...authorityEnvelope(
          "This is the creator's current public presentation in Missa, not verified identity, authorship, rights clearance, availability, or endorsement of linked external content.",
        ),
      };
    },
  });
}

function listApplicationsTool(context: ToolContext): MissaWebMcpTool {
  return readOnlyTool({
    name: "missa.list_my_applications",
    title: "List my Missa applications",
    description:
      "List the signed-in creator's bounded Missa application summaries without notes, files, saved answers, or material contents.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 25, default: 20 },
      },
      additionalProperties: false,
    },
    async execute(input, options) {
      const limit = boundedInteger(input.limit, 20, 1, 25);
      const response = asRecord(
        await context.request("/api/me/applications", options.signal),
      );
      const applications = asArray(response.applications)
        .slice(0, limit)
        .map((value) => {
          const application = asRecord(value);
          return {
            opportunityId: application.opportunityId,
            title: application.title,
            organizationName: application.organizationName,
            type: application.type,
            myStatus: application.myStatus,
            opportunityStatus: application.opportunityStatus,
            deadline: application.deadline,
            deadlineKind: application.deadlineKind,
            submittedAt: application.submittedAt,
            updatedAt: application.updatedAt,
            workTitle: application.workTitle,
            notify: application.notify,
          };
        });
      return {
        applications,
        returned: applications.length,
        ...authorityEnvelope(
          "Application status is Missa account-owned tracking state. Unless a canonical hosted-submission receipt says otherwise, it is not provider confirmation of receipt, review, or outcome.",
        ),
      };
    },
  });
}

function listOrganizationOpenCallsTool(context: ToolContext): MissaWebMcpTool {
  return readOnlyTool({
    name: "missa.list_organization_open_calls",
    title: "List organization open calls",
    description:
      "List bounded open-call metadata for the organization in the active Missa route. This tool cannot create, edit, publish, close, or restore a call.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 25, default: 20 },
      },
      additionalProperties: false,
    },
    async execute(input, options) {
      const organizationId = context.organizationId;
      if (!organizationId)
        throw new Error("No organization is selected in this route.");
      const limit = boundedInteger(input.limit, 20, 1, 25);
      const response = await context.request(
        `/api/orgs/${encodeURIComponent(organizationId)}/open-calls`,
        options.signal,
      );
      const openCalls = asArray(response)
        .slice(0, limit)
        .map((value) => {
          const call = asRecord(value);
          return {
            id: call.id,
            programId: call.programId,
            title: call.title,
            status: call.status,
            radarOpportunityId: call.radarOpportunityId,
            revision: call.revision,
          };
        });
      return {
        organizationId,
        openCalls,
        returned: openCalls.length,
        ...authorityEnvelope(
          "Open-call lifecycle state is read from the authorized Missa organization workspace. No configuration or publication action is available here.",
        ),
      };
    },
  });
}

function listOrganizationSubmissionsTool(
  context: ToolContext,
): MissaWebMcpTool {
  return readOnlyTool({
    name: "missa.list_organization_submission_summaries",
    title: "List organization submission summaries",
    description:
      "List redacted, bounded submission summaries for the organization in the active Missa route. Submitter identity, answers, files, reviewers, and work titles are omitted.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 25, default: 20 },
      },
      additionalProperties: false,
    },
    async execute(input, options) {
      const organizationId = context.organizationId;
      if (!organizationId)
        throw new Error("No organization is selected in this route.");
      const limit = boundedInteger(input.limit, 20, 1, 25);
      const response = await context.request(
        `/api/orgs/${encodeURIComponent(organizationId)}/submissions`,
        options.signal,
      );
      const submissions = asArray(response)
        .slice(0, limit)
        .map((value) => {
          const submission = asRecord(value);
          return {
            id: submission.id,
            openCallId: submission.openCallId,
            openCallTitle: submission.openCallTitle,
            status: submission.status,
            submittedAt: submission.submittedAt,
            category: submission.category,
            paymentStatus: submission.paymentStatus,
            workCount: asArray(submission.works).length,
            assignmentCount: asArray(submission.assignments).length,
            decisionCount: asArray(submission.decisions).length,
          };
        });
      return {
        organizationId,
        submissions,
        returned: submissions.length,
        redacted: [
          "submitter identity",
          "answers",
          "files",
          "reviewer identity",
          "work titles",
        ],
        ...authorityEnvelope(
          "These are organization-scoped Missa records. Reading a summary does not review, decide, message, export, or change a submission.",
        ),
      };
    },
  });
}

function listReviewerAssignmentsTool(context: ToolContext): MissaWebMcpTool {
  return readOnlyTool({
    name: "missa.list_my_review_assignments",
    title: "List my review assignments",
    description:
      "List bounded assignments scoped by Missa to the signed-in reviewer. This tool cannot score, recommend, recuse, or submit a review.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 25, default: 20 },
      },
      additionalProperties: false,
    },
    async execute(input, options) {
      const limit = boundedInteger(input.limit, 20, 1, 25);
      const response = await context.request(
        "/api/reviewer/assignments",
        options.signal,
      );
      const assignments = asArray(response)
        .slice(0, limit)
        .map((value) => {
          const assignment = asRecord(value);
          const submission = asRecord(assignment.submission);
          const recommendation = asRecord(assignment.recommendation);
          return {
            id: assignment.id,
            submissionId: assignment.submissionId,
            reviewRoundId: assignment.reviewRoundId,
            completedAt: assignment.completedAt,
            recusedAt: assignment.recusedAt,
            expiresAt: assignment.expiresAt,
            submissionStatus: submission.status,
            submittedAt: submission.submittedAt,
            workCount: asArray(assignment.works).length,
            hasRecordedRecommendation: Object.keys(recommendation).length > 0,
          };
        });
      return {
        assignments,
        returned: assignments.length,
        ...authorityEnvelope(
          "Assignments are scoped to the signed-in reviewer. No review content or recommendation is created or submitted by this tool.",
        ),
      };
    },
  });
}

export function createMissaWebMcpTools(
  input: Omit<ToolContext, "surface" | "organizationId"> &
    Partial<Pick<ToolContext, "surface" | "organizationId">>,
): MissaWebMcpTool[] {
  const surface = input.surface ?? classifyWebMcpSurface(input.pathname);
  if (surface === "blocked") return [];
  const context: ToolContext = {
    ...input,
    surface,
    organizationId:
      input.organizationId ??
      organizationIdFromLocation(input.pathname, input.search),
  };
  const tools = [
    surfaceContextTool(context),
    searchOpportunitiesTool(context),
    getOpportunityTool(context),
    listMagazineRankingsTool(context),
    listResidencyRankingsTool(context),
    getPublicCreatorProfileTool(context),
  ];
  if (surface === "creator") tools.push(listApplicationsTool(context));
  if (surface === "organization" && context.organizationId) {
    tools.push(
      listOrganizationOpenCallsTool(context),
      listOrganizationSubmissionsTool(context),
    );
  }
  if (surface === "reviewer") tools.push(listReviewerAssignmentsTool(context));
  return tools;
}
