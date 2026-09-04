import {
  matchesCriteria,
  matchesOpportunityPreferences,
  type Opportunity,
  type OpportunityBrowsePage,
  type OpportunityBrowseProjection,
  type OpportunityDetailProjection,
  type OpportunityFacetCounts,
  type OpportunityRepository,
  type OpportunityRepositoryContext,
  type OpportunityRepositoryQuery,
} from "@missa/radar-engine";
import { createPostgresOpportunityRepositoryFromUrl, creatorRelationalAuthorityEnabled } from "@missa/radar-adapters";
import { MISSA_TAXONOMY, taxonomyDescendantIds, taxonomyLabelFor } from "@missa/taxonomy";
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
  jobs: ["job"],
};

function feeStatus(opp: Opportunity): "no-fee" | "paid" | "unknown" {
  if (!opp.fields.fee.disclosed) return "unknown";
  return opp.fields.fee.amountCents === 0 ? "no-fee" : "paid";
}

function boundedSlug(value: string, fallback: string): string {
  const normalized = value.trim();
  if (!normalized) return fallback;
  if (normalized.length <= 160) return normalized;
  return normalized.slice(0, 160).replace(/[-\s]+$/u, "") || fallback;
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
  const user = userId ? engine.store.users.get(userId) : undefined;
  const profiles = userId
    ? [...engine.store.radarProfiles.values()].filter((profile) => profile.userId === userId)
    : [];
  const savedSearchReasons = profiles.flatMap((profile) =>
    matchesCriteria(profile.criteria, opp, new Date())?.slice(0, 2).map((reason) => ({
      code: "saved-search",
      label: `Matches ${profile.name}: ${reason}`,
    })) ?? [],
  );
  const opportunityPreferenceReasons = user?.opportunityPreferences
    ? matchesOpportunityPreferences(user.opportunityPreferences, opp, new Date())?.map((reason) => ({
        code: 'profile-preference' as const,
        label: `Matches your preferences: ${reason}`,
      })) ?? []
    : [];
  const assignedTermIds = new Set((opp.fields.taxonomyAssignments ?? []).flatMap((assignment) => assignment.termId ? [assignment.termId] : []));
  const preferenceReasons = (user?.taxonomyPreferences ?? []).flatMap((preference) => {
    if (preference.preference === 'exclude') return [];
    const matched = taxonomyDescendantIds(preference.termId).some((termId) => assignedTermIds.has(termId));
    if (!matched) return [];
    const label = taxonomyLabelFor(preference.termId);
    return [{
      code: 'discipline' as const,
      label: preference.preference === 'prefer' ? `Matches your preferred field: ${label}` : `Matches your field: ${label}`,
    }];
  });
  const workReasons = engine.library(userId ?? '').works.flatMap((work) =>
    (work.taxonomyAssignments ?? []).flatMap((assignment) => {
      const matched = taxonomyDescendantIds(assignment.termId).some((termId) => assignedTermIds.has(termId));
      if (!matched) return [];
      return [{ code: 'work' as const, label: `Matches your Work: ${taxonomyLabelFor(assignment.termId)}` }];
    }),
  );
  const matchedReasons = [...opportunityPreferenceReasons, ...preferenceReasons, ...workReasons, ...savedSearchReasons].slice(0, 4);
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
    slug: boundedSlug(opp.fields.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), opp.id),
    createdAt: opp.createdAt,
    title: opp.fields.title,
    organizationId: opp.fields.organizationId,
    organizationName: opp.fields.organizationName ?? organization?.name,
    organizationVerified: organization?.verified,
    status: publicStatus(opp),
    type: opp.fields.type,
    discipline: opp.fields.genres[0] ?? source?.registryDisciplines?.[0],
    genres: opp.fields.genres,
    taxonomy: {
      schemeVersion: 1,
      termIds: (opp.fields.taxonomyAssignments ?? []).flatMap((assignment) => assignment.termId ? [assignment.termId] : []),
      primaryTermIds: (opp.fields.taxonomyAssignments ?? []).flatMap((assignment) => assignment.termId && assignment.facet === 'discipline' ? [assignment.termId] : []),
    },
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

function excludedByPrivatePreferences(engine: Awaited<ReturnType<typeof getEngine>>, opp: Opportunity, context?: OpportunityRepositoryContext): boolean {
  const userId = userIdFor(engine, context);
  const user = userId ? engine.store.users.get(userId) : undefined;
  if (!user) return false;
  if (user.opportunityPreferences && !matchesOpportunityPreferences(user.opportunityPreferences, opp, new Date())) return true;
  const assignedTermIds = new Set((opp.fields.taxonomyAssignments ?? []).flatMap((assignment) => assignment.termId ? [assignment.termId] : []));
  return (user.taxonomyPreferences ?? []).some((preference) => preference.preference === 'exclude' && taxonomyDescendantIds(preference.termId).some((termId) => assignedTermIds.has(termId)));
}

function matchesQuery(item: OpportunityBrowseProjection, query: OpportunityRepositoryQuery): boolean {
  if (query.query) {
    const taxonomyLabels = (item.taxonomy?.termIds ?? [])
      .map((termId) => MISSA_TAXONOMY.terms.find((term) => term.id === termId)?.preferredLabel ?? "")
      .join(" ");
    const haystack = `${item.title} ${item.organizationName ?? ""} ${item.genres.join(" ")} ${taxonomyLabels}`.toLowerCase();
    if (!haystack.includes(query.query.toLowerCase())) return false;
  }
  const categoryTypes = query.category ? CATEGORY_TYPES[query.category] ?? [] : [];
  if (categoryTypes.length && !categoryTypes.includes(item.type)) return false;
  if (query.types?.length && !query.types.includes(item.type)) return false;
  if (query.disciplines?.length && (!item.discipline || !query.disciplines.includes(item.discipline))) return false;
  if (query.genres?.length && !item.genres.some((genre) => query.genres?.some((g) => g.toLowerCase() === genre.toLowerCase() || genre.toLowerCase().includes(g.toLowerCase()) || g.toLowerCase().includes(genre.toLowerCase())))) return false;
  if ((query as { domain?: string }).domain) {
    const domain = (query as { domain?: string }).domain!.toLowerCase();
    const VISUAL_ARTS = ["painting", "sculpture", "photography", "film", "video", "film/video", "printmaking", "digital art", "sound art", "performance", "ceramics", "installation", "drawing", "textiles", "mixed media", "public art", "visual art"];
    const MULTI = ["multidisciplinary", "interdisciplinary", "cross-disciplinary"];
    const LIT = ["poetry", "fiction", "nonfiction", "creative nonfiction", "essay", "short story", "memoir", "literature", "literary", "writing"];
    const itemHaystack = `${item.title} ${item.genres.join(" ")} ${item.discipline ?? ""} ${item.type}`.toLowerCase();

    if (domain === "visual_arts" || domain === "visual-arts") {
      const match = item.type === "exhibition" || item.type === "commission" || VISUAL_ARTS.some((m) => itemHaystack.includes(m));
      if (!match) return false;
    } else if (domain === "residencies" || domain === "residency") {
      const match = item.type === "residency" || itemHaystack.includes("residency");
      if (!match) return false;
    } else if (domain === "multidisciplinary") {
      const match = MULTI.some((m) => itemHaystack.includes(m));
      if (!match) return false;
    } else if (domain === "literature") {
      const match = item.type === "magazine" || LIT.some((l) => itemHaystack.includes(l));
      if (!match) return false;
    }
  }
  if (query.taxonomyTermIds?.length) {
    const matchesRequested = (requestedId: string): boolean => {
      if (item.taxonomy?.termIds.includes(requestedId)) return true;
      if (!query.taxonomyIncludeDescendants) return false;
      const descendants = new Set<string>([requestedId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const term of MISSA_TAXONOMY.terms) {
          if (term.broaderTermIds.some((parent) => descendants.has(parent)) && !descendants.has(term.id)) {
            descendants.add(term.id);
            changed = true;
          }
        }
      }
      return [...descendants].some((termId) => item.taxonomy?.termIds.includes(termId));
    };
    if (!query.taxonomyTermIds.every(matchesRequested)) return false;
  }
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
    const nowIso = new Date().toISOString().slice(0, 10);
    const items = [...engine.store.opportunities.values()]
      .filter((opp) => !opp.duplicateOfId && !["archived", "closed", "duplicate", "uncertain"].includes(opp.status))
      .filter((opp) => !query.openNow || !opp.fields.deadline?.date || opp.fields.deadline.date >= nowIso)
      .filter((opp) => !excludedByPrivatePreferences(engine, opp, context))
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

  async facetCounts(query: OpportunityRepositoryQuery, context?: OpportunityRepositoryContext): Promise<OpportunityFacetCounts> {
    const engine = await getEngine();
    const nowIso = new Date().toISOString().slice(0, 10);
    const candidates = [...engine.store.opportunities.values()]
      .filter((opp) => !opp.duplicateOfId && !["archived", "closed", "duplicate", "uncertain"].includes(opp.status))
      .filter((opp) => !query.openNow || !opp.fields.deadline?.date || opp.fields.deadline.date >= nowIso)
      .filter((opp) => !excludedByPrivatePreferences(engine, opp, context))
      .map((opp) => project(engine, opp, context));
    const withoutPage = { ...query, cursor: undefined };
    const matching = candidates.filter((item) => matchesQuery(item, withoutPage));
    const typeBase = candidates.filter((item) => matchesQuery(item, { ...withoutPage, types: [], category: undefined }));
    const taxonomyBase = candidates.filter((item) => matchesQuery(item, { ...withoutPage, taxonomyTermIds: [] }));

    const typeCounts = new Map<string, number>();
    for (const item of typeBase) typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1);

    const taxonomyCounts = new Map<string, number>();
    for (const item of taxonomyBase) {
      const ancestors = new Set(item.taxonomy?.termIds ?? []);
      let changed = true;
      while (changed) {
        changed = false;
        for (const term of MISSA_TAXONOMY.terms) {
          if (!ancestors.has(term.id)) continue;
          for (const parent of term.broaderTermIds) {
            if (!ancestors.has(parent)) {
              ancestors.add(parent);
              changed = true;
            }
          }
        }
      }
      for (const termId of ancestors) taxonomyCounts.set(termId, (taxonomyCounts.get(termId) ?? 0) + 1);
    }

    return {
      total: matching.length,
      types: [...typeCounts].map(([value, count]) => ({ value: value as OpportunityBrowseProjection["type"], count })),
      taxonomyTerms: [...taxonomyCounts].map(([termId, count]) => ({ termId, count })),
    };
  }

  async getById(opportunityId: string, context?: OpportunityRepositoryContext): Promise<OpportunityDetailProjection | null> {
    const engine = await getEngine();
    const opp = engine.store.opportunities.get(opportunityId) ?? [...engine.store.opportunities.values()].find((candidate) => {
      const slug = boundedSlug(candidate.fields.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), candidate.id);
      return slug === opportunityId;
    });
    if (!opp || opp.duplicateOfId || excludedByPrivatePreferences(engine, opp, context)) return null;
    const base = project(engine, opp, context);
    // The in-memory compatibility repository has no durable review decision.
    // Do not synthesize a pending brief into a user-facing detail response;
    // only the Postgres repository may expose content after approved review.
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
        .filter((change) => change.opportunityId === opp.id)
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
  const relationalCreatorAuthority = creatorRelationalAuthorityEnabled(process.env);
  const postgresRequested = process.env.MISSA_OPPORTUNITY_REPOSITORY?.trim() === "postgres";
  if ((relationalCreatorAuthority || postgresRequested) && !process.env.DATABASE_URL) {
    throw new Error("Canonical Opportunity repository is unavailable");
  }
  if ((relationalCreatorAuthority || postgresRequested) && process.env.DATABASE_URL) {
    if (!globalThis.__missaOpportunityRepository) {
      globalThis.__missaOpportunityRepository = createPostgresOpportunityRepositoryFromUrl(process.env.DATABASE_URL);
    }
    return globalThis.__missaOpportunityRepository;
  }
  return new EngineOpportunityRepository();
}
