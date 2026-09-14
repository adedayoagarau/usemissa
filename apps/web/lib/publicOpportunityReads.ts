import "server-only";

import { unstable_cache } from "next/cache";
import type {
  OpportunityBrowsePage,
  OpportunityDetailProjection,
  OpportunityRepositoryContext,
  OpportunityRepositoryQuery,
} from "@missa/radar-engine";
import { getOpportunityFacetCounts } from "./opportunityFacetCounts";
import type { OpportunityFacetCounts } from "./opportunityFacetCounts";
import { getOpportunityRepository } from "./opportunityRepository";

const PUBLIC_OPPORTUNITY_CACHE_SECONDS = 300;

export type OpportunityBrowseWithFacets = readonly [
  OpportunityBrowsePage,
  OpportunityFacetCounts,
];

const browseInFlight = new Map<string, Promise<OpportunityBrowseWithFacets>>();
const pageInFlight = new Map<string, Promise<OpportunityBrowsePage>>();
const detailInFlight = new Map<
  string,
  Promise<OpportunityDetailProjection | null>
>();

function serializeQuery(query: OpportunityRepositoryQuery): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(query)
        .filter(([, value]) => value !== undefined)
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
}

async function loadOpportunityBrowse(
  query: OpportunityRepositoryQuery,
  context?: OpportunityRepositoryContext,
): Promise<OpportunityBrowseWithFacets> {
  return Promise.all([
    getOpportunityRepository().browse(query, context),
    getOpportunityFacetCounts(query, context),
  ]);
}

function loadOpportunityPageOnce(
  query: OpportunityRepositoryQuery,
): Promise<OpportunityBrowsePage> {
  const key = serializeQuery(query);
  const existing = pageInFlight.get(key);
  if (existing) return existing;

  const request = getOpportunityRepository()
    .browse(query)
    .finally(() => pageInFlight.delete(key));
  pageInFlight.set(key, request);
  return request;
}

function loadOpportunityBrowseOnce(
  query: OpportunityRepositoryQuery,
  context?: OpportunityRepositoryContext,
): Promise<OpportunityBrowseWithFacets> {
  const key = `${serializeQuery(query)}|${context?.accountId ?? "public"}`;
  const existing = browseInFlight.get(key);
  if (existing) return existing;

  const request = loadOpportunityBrowse(query, context).finally(() => {
    browseInFlight.delete(key);
  });
  browseInFlight.set(key, request);
  return request;
}

const cachedPublicBrowse = unstable_cache(
  async (serializedQuery: string) =>
    loadOpportunityBrowseOnce(
      JSON.parse(serializedQuery) as OpportunityRepositoryQuery,
    ),
  ["public-opportunity-browse-v2"],
  {
    revalidate: PUBLIC_OPPORTUNITY_CACHE_SECONDS,
    tags: ["opportunities"],
  },
);

const cachedPublicDetail = unstable_cache(
  async (id: string) => getOpportunityRepository().getById(id),
  ["public-opportunity-detail-v1"],
  {
    revalidate: PUBLIC_OPPORTUNITY_CACHE_SECONDS,
    tags: ["opportunities"],
  },
);

const cachedPublicPage = unstable_cache(
  async (serializedQuery: string) =>
    loadOpportunityPageOnce(
      JSON.parse(serializedQuery) as OpportunityRepositoryQuery,
    ),
  ["public-opportunity-page-v1"],
  {
    revalidate: PUBLIC_OPPORTUNITY_CACHE_SECONDS,
    tags: ["opportunities"],
  },
);

/** Shared, stampede-safe read for anonymous opportunity catalogue surfaces. */
export function getPublicOpportunityBrowse(
  query: OpportunityRepositoryQuery,
): Promise<OpportunityBrowseWithFacets> {
  return cachedPublicBrowse(serializeQuery(query));
}

/** Public catalogue page without the extra facet-count query. */
export function getPublicOpportunityPage(
  query: OpportunityRepositoryQuery,
): Promise<OpportunityBrowsePage> {
  return cachedPublicPage(serializeQuery(query));
}

/** Keep account-specific ranking out of the shared public cache. */
export function getPersonalizedOpportunityBrowse(
  query: OpportunityRepositoryQuery,
  context: OpportunityRepositoryContext,
): Promise<OpportunityBrowseWithFacets> {
  return loadOpportunityBrowseOnce(query, context);
}

/** Shared public detail read used by metadata and page rendering. */
export function getPublicOpportunityDetail(
  id: string,
): Promise<OpportunityDetailProjection | null> {
  const existing = detailInFlight.get(id);
  if (existing) return existing;

  const request = cachedPublicDetail(id).finally(() =>
    detailInFlight.delete(id),
  );
  detailInFlight.set(id, request);
  return request;
}
