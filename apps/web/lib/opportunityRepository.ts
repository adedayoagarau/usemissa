import {
  matchesCriteria,
  type Opportunity,
  type OpportunityBrowsePage,
  type OpportunityBrowseProjection,
  type OpportunityDetailProjection,
  type OpportunityRepository,
  type OpportunityRepositoryContext,
  type OpportunityRepositoryQuery,
} from "@missa/radar-engine";
import { createPostgresOpportunityRepositoryFromUrl } from "@missa/radar-adapters";
import { getEngine } from "./engine";

declare global {
  var __missaOpportunityRepository: OpportunityRepository | undefined;
}

const CATEGORY_TYPES: Record<string, string[]> = {
  magazines: ["magazine"],
  grants: ["grant"],
  awards: ["award"],
  residencies: ["residency"],
  fellowships: ["fellowship"],
  contests: ["contest"],
};

function feeStatus(opp: Opportunity): "no-fee" | "paid" | "unknown" {
  if (!opp.fields.fee.disclosed) return "unknown";
  return opp.fields.fee.amountCents === 0 ? "no-fee" : "paid";
}

function publicStatus(opp: Opportunity): OpportunityBrowseProjection["status"] {
  switch (opp.status) {
    case "opening-soon":
    case "open":
    case "closing-soon":
    case "deadline-extended":
    case "closed":
    case "archived":
      return opp.status;
    default:
      return "opening-soon";
  }
}

function userIdFor(engine: Awaited<ReturnType<typeof getEngine>>, context?: OpportunityRepositoryContext): string | undefined {
  if (!context?.accountId) return undefined;
  return engine.store.accounts.get(context.accountId)?.userId ?? context.accountId;
}

function project(engine: Awaited<ReturnType<typeof getEngine>>, opp: Opportunity, context?: OpportunityRepositoryContext): OpportunityBrowseProjection {
  const organization = opp.fields.organizationId
    ? engine.store.organizations.get(opp.fields.organizationId)
    : undefined;
  const source = engine.store.sources.get(opp.sourceId);
  const userId = userIdFor(engine, context);
  const profiles = userId
    ? [...engine.store.radarProfiles.values()].filter((profile) => profile.userId === userId)
    : [];
  const matchedReasons = profiles.flatMap((profile) =>
    matchesCriteria(profile.criteria, opp, new Date())?.slice(0, 2).map((reason) => ({
      code: "saved-search",
      label: `Matches ${profile.name}: ${reason}`,
    })) ?? [],
  );
  const tracked = userId
    ? engine.store.tracked.some((item) => item.userId === userId && item.opportunityId === opp.id)
    : false;
  const followingOrganization = userId && opp.fields.organizationId
    ? engine.store.follows.some(
        (follow) => follow.userId === userId && follow.organizationId === opp.fields.organizationId,
      )
    : false;

  return {
    id: opp.id,
    slug: opp.fields.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    createdAt: opp.createdAt,
    title: opp.fields.title,
    organizationId: opp.fields.organizationId,
    organizationName: opp.fields.organizationName ?? organization?.name,
    organizationVerified: organization?.verified,
    status: publicStatus(opp),
    type: opp.fields.type,
    discipline: opp.fields.genres[0] ?? source?.registryDisciplines?.[0],
    genres: opp.fields.genres,
    deadline: {
      kind: opp.fields.deadline.kind,
      date: opp.fields.deadline.date,
      raw: opp.fields.deadline.raw,
    },
    fee: {
      status: feeStatus(opp),
      amountCents: opp.fields.fee.amountCents,
      currency: opp.fields.fee.currency,
      raw: opp.fields.fee.raw,
    },
    prize: opp.fields.prize,
    location: opp.fields.location ?? source?.registryGeography?.join(', '),
    simultaneousAllowed: opp.fields.simultaneousAllowed,
    submissionAvailable: Boolean(opp.fields.submissionUrl),
    source: {
      kind: source?.kind ?? "directory",
      name: source?.url ?? opp.sourceUrl,
      url: opp.sourceUrl,
      checkedAt: source?.lastCheckedAt ?? opp.lastCheckedAt,
      processingSucceededAt: source?.lastProcessedAt ?? source?.lastSuccessfulFetchAt,
      organizationConfirmed: Boolean(opp.claimedByOrganizationId),
    },
    personal: {
      tracked,
      followingOrganization: Boolean(followingOrganization),
      tailoringReasons: matchedReasons.slice(0, 4),
    },
  };
}

function matchesQuery(item: OpportunityBrowseProjection, query: OpportunityRepositoryQuery): boolean {
  if (query.query) {
    const haystack = `${item.title} ${item.organizationName ?? ""} ${item.genres.join(" ")}`.toLowerCase();
    if (!haystack.includes(query.query.toLowerCase())) return false;
  }
  const categoryTypes = query.category ? CATEGORY_TYPES[query.category] ?? [] : [];
  if (categoryTypes.length && !categoryTypes.includes(item.type)) return false;
  if (query.types?.length && !query.types.includes(item.type)) return false;
  if (query.disciplines?.length && (!item.discipline || !query.disciplines.includes(item.discipline))) return false;
  if (query.genres?.length && !item.genres.some((genre) => query.genres?.includes(genre))) return false;
  if (query.locations?.length && (!item.location || !query.locations.includes(item.location))) return false;
  if (query.feeStatus && item.fee.status !== query.feeStatus) return false;
  if (query.maxFeeCents !== undefined && (item.fee.amountCents === undefined || item.fee.amountCents > query.maxFeeCents)) return false;
  if (query.verifiedOnly && !item.source.verifiedUntil && !item.source.organizationConfirmed) return false;
  if (query.simultaneousRequired && item.simultaneousAllowed !== true) return false;
  return true;
}

class EngineOpportunityRepository implements OpportunityRepository {
  async browse(query: OpportunityRepositoryQuery, context?: OpportunityRepositoryContext): Promise<OpportunityBrowsePage> {
    const engine = await getEngine();
    const items = [...engine.store.opportunities.values()]
      .filter((opp) => !opp.duplicateOfId && !["archived", "closed", "duplicate", "uncertain"].includes(opp.status))
      .map((opp) => project(engine, opp, context))
      .filter((item) => matchesQuery(item, query));

    items.sort((a, b) => {
      if (query.sort === "recently-added") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || a.id.localeCompare(b.id);
      if (query.sort === "recommended") return (b.personal?.tailoringReasons.length ?? 0) - (a.personal?.tailoringReasons.length ?? 0) || (a.deadline.date ?? "9999").localeCompare(b.deadline.date ?? "9999");
      return (a.deadline.date ?? "9999").localeCompare(b.deadline.date ?? "9999") || a.id.localeCompare(b.id);
    });

    const offset = query.cursor ? Number(Buffer.from(query.cursor, "base64url").toString("utf8")) || 0 : 0;
    const page = items.slice(offset, offset + query.limit);
    const nextOffset = offset + query.limit < items.length ? Buffer.from(String(offset + query.limit)).toString("base64url") : null;
    return { items: page, nextCursor: nextOffset, total: items.length };
  }

  async getById(opportunityId: string, context?: OpportunityRepositoryContext): Promise<OpportunityDetailProjection | null> {
    const engine = await getEngine();
    const opp = engine.store.opportunities.get(opportunityId);
    if (!opp || opp.duplicateOfId) return null;
    const base = project(engine, opp, context);
    return {
      ...base,
      openDate: opp.fields.openDate,
      eligibility: opp.fields.eligibility.map((rule) => ({
        key: rule.key,
        description: rule.description,
        value: rule.value,
        certainty: opp.claimedByOrganizationId ? "confirmed" : "inferred",
      })),
      requiredMaterials: opp.fields.requiredMaterials.map((label) => ({ label, required: true })),
      guidelinesUrl: opp.fields.guidelinesUrl,
      submissionUrl: opp.fields.submissionUrl,
      simultaneousAllowed: opp.fields.simultaneousAllowed,
      changes: [...engine.store.changes.values()]
        .filter((change) => change.opportunityId === opportunityId)
        .slice(-32)
        .map((change) => ({ kind: change.kind, at: change.at, oldValue: change.oldValue, newValue: change.newValue })),
      relatedOpportunityIds: [...engine.store.opportunities.values()]
        .filter((other) => other.id !== opportunityId && other.fields.organizationId === opp.fields.organizationId && !other.duplicateOfId)
        .slice(0, 24)
        .map((other) => other.id),
    };
  }
}

export function getOpportunityRepository(): OpportunityRepository {
  if (process.env.MISSA_OPPORTUNITY_REPOSITORY === "postgres" && process.env.DATABASE_URL) {
    if (!globalThis.__missaOpportunityRepository) {
      globalThis.__missaOpportunityRepository = createPostgresOpportunityRepositoryFromUrl(process.env.DATABASE_URL);
    }
    return globalThis.__missaOpportunityRepository;
  }
  return new EngineOpportunityRepository();
}
