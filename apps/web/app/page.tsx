import type { Metadata } from "next";

import { MissaSiteHeader } from "@/components/missa-site-header";
import { PublicDiscoveryEvent } from "@/components/public-discovery-event";
import { HomepageBrowse } from "@/components/missa/homepage-browse";
import {
  HomepageClose,
  HomepageFooterStandard,
  HomepageHero,
  HomepageProof,
  HomepageQuestionsSection,
} from "@/components/missa/homepage-standard";
import { ShortlistBar } from "@/components/missa/homepage-shortlist";
import { pickShowcase } from "@/lib/homepageShowcase";
import { onePerOrganization } from "@/lib/onePerOrganization";
import type { ActiveFiltersState } from "@/components/missa/opportunities-browse";
import { getHomepageStats, type HomepageStats } from "@/lib/homepageStats";
import { parseOpportunityBrowseQuery } from "@/lib/opportunityQuery";
import { LOCATION_OPTIONS } from "@/lib/opportunityTaxonomy";
import {
  getPublicOpportunityBrowse,
  type OpportunityBrowseWithFacets,
} from "@/lib/publicOpportunityReads";
import { pageMetadata } from "@/lib/seo";
import styles from "@/components/missa/homepage-standard.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

/** Nine cards: three rows of the catalogue grid, enough to filter against. */
const HOMEPAGE_RESULT_LIMIT = 9;
/**
 * Read three pages' worth so the list can still fill nine cards after keeping
 * one call per organization.
 */
const HOMEPAGE_CANDIDATE_LIMIT = HOMEPAGE_RESULT_LIMIT * 3;

function toUrlSearchParams(input: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : [])
      params.append(key, item);
  }
  return params;
}

function hasFilters(raw: SearchParams): boolean {
  return Object.entries(raw).some(
    ([key, value]) =>
      key !== "cursor" &&
      (Array.isArray(value) ? value.length > 0 : Boolean(value)),
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}): Promise<Metadata> {
  const raw = searchParams ? await searchParams : {};
  return pageMetadata({
    title: "Missa: open calls, grants and residencies",
    description:
      "Open calls, grants, residencies and magazines, each with its fee, who can apply and the organizer's page. Save the ones you want and get reminded before they close.",
    path: "/",
    noIndex: hasFilters(raw),
  });
}

const EMPTY_BROWSE: OpportunityBrowseWithFacets = [
  { items: [], total: 0, nextCursor: null },
  { total: 0, types: [], disciplines: [] },
];

/**
 * The homepage runs the catalogue rather than describing it. Filters live in
 * the URL exactly as on /opportunities, so every state is shareable and the
 * server renders the first paint with results; the reads below share the
 * catalogue's five-minute cache.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const raw = searchParams ? await searchParams : {};
  const urlParams = toUrlSearchParams(raw);
  const query = {
    ...parseOpportunityBrowseQuery(urlParams),
    limit: HOMEPAGE_CANDIDATE_LIMIT,
  };
  // A second, small pool for the product examples: recently added calls
  // usually have weeks of lead time, unlike the soonest-closing list above.
  const showcaseQuery = {
    ...parseOpportunityBrowseQuery(new URLSearchParams({ sort: "recently-added" })),
    limit: 24,
  };
  const closingQuery = {
    ...parseOpportunityBrowseQuery(new URLSearchParams()),
    deadlineWithinDays: 7,
    limit: 1,
  };

  const [browse, closing, stats, recent] = await Promise.all([
    getPublicOpportunityBrowse(query).catch(
      (): OpportunityBrowseWithFacets | null => null,
    ),
    getPublicOpportunityBrowse(closingQuery).catch(
      (): OpportunityBrowseWithFacets | null => null,
    ),
    getHomepageStats().catch((): HomepageStats | null => null),
    getPublicOpportunityBrowse(showcaseQuery).catch(
      (): OpportunityBrowseWithFacets | null => null,
    ),
  ]);
  const loadFailed = browse === null;
  const today = new Date().toISOString().slice(0, 10);
  const [result, facetCounts] = browse ?? EMPTY_BROWSE;
  const items = onePerOrganization(result.items, HOMEPAGE_RESULT_LIMIT);
  const showcase = pickShowcase(
    [...result.items, ...(recent ? recent[0].items : [])],
    today,
  );

  const activeFilters: ActiveFiltersState = {
    type: query.types[0] ?? null,
    discipline: query.disciplines[0] ?? null,
    location: query.locations[0] ?? null,
    deadline: query.deadlineWithinDays ? String(query.deadlineWithinDays) : null,
    fee: query.feeStatus ?? null,
  };
  const activeFilterCount =
    query.types.length +
    query.disciplines.length +
    query.genres.length +
    query.taxonomyTermIds.length +
    query.locations.length +
    (query.feeStatus ? 1 : 0) +
    (query.deadlineWithinDays ? 1 : 0) +
    (query.deadlineKind ? 1 : 0) +
    (query.confirmedDatesOnly ? 1 : 0);

  return (
    <div className={styles.page} data-density="spacious">
      <MissaSiteHeader current="Home" omitLinks={["For organizations"]} />
      <PublicDiscoveryEvent
        eventName="public.discovery_view"
        properties={{ surface: "home", resultCount: items.length }}
      />
      <main id="main-content" aria-labelledby="homepage-heading">
        <HomepageHero
          open={stats?.open ?? null}
          closingThisWeek={closing ? closing[1].total : null}
          tourCall={showcase.lead ?? showcase.urgent}
        />
        <HomepageBrowse
          items={items}
          facetCounts={facetCounts}
          totalCount={facetCounts.total}
          loadFailed={loadFailed}
          activeFilters={activeFilters}
          activeFilterCount={activeFilterCount}
          initialQuery={query.query ?? ""}
          locations={LOCATION_OPTIONS}
        />
        <HomepageProof showcase={showcase} />
        <HomepageQuestionsSection />
        <HomepageClose showcase={showcase} />
      </main>
      <ShortlistBar />
      <HomepageFooterStandard />
    </div>
  );
}
