import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { SearchX, X } from "lucide-react";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import { parseOpportunityBrowseQuery } from "@/lib/opportunityQuery";
import { getOpportunityFacetCounts } from "@/lib/opportunityFacetCounts";
import { getEngine } from "@/lib/engine";
import { LOCATION_OPTIONS, taxonomyLabelFor } from "@/lib/opportunityTaxonomy";
import { OpportunityShell } from "@/components/opportunity-shell";
import { OpportunityBrowseHeader } from "@/components/opportunity-browse-header";
import { OpportunityEditorialHero } from "@/components/opportunity-editorial-hero";
import { OpportunityCatalogueFilters } from "@/components/opportunity-catalogue-filters";
import { OpportunityResultsRefresh } from "@/components/opportunity-results-refresh";
import { OpportunityResults } from "@/components/opportunity-results";
import { OpportunitySearch } from "@/components/opportunity-search";
import { OpportunitySort } from "@/components/opportunity-sort";
import { OpportunityPracticeNav } from "@/components/opportunity-practice-nav";
import {
  OpportunityFeedTabs,
  type OpportunityFeedId,
} from "@/components/opportunity-feed-tabs";
import { SaveSearchButton } from "@/components/save-search-button";
import { PublicDiscoveryEvent } from "@/components/public-discovery-event";
import { Button } from "@/components/ui/button";
import { JsonLd, absoluteUrl, pageMetadata } from "@/lib/seo";
import {
  PUBLIC_OPPORTUNITY_PREVIEW_FACETS,
  previewItemsForQuery,
} from "@/lib/opportunityPreviewFixtures";
import styles from "./opportunities.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

const typeLabels: Record<string, string> = {
  "open-call": "Open call",
  magazine: "Magazine",
  grant: "Grant",
  award: "Award",
  residency: "Residency",
  fellowship: "Fellowship",
  contest: "Contest",
  commission: "Commission",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}): Promise<Metadata> {
  const raw = searchParams ? await searchParams : {};
  const hasFilters = Object.entries(raw).some(
    ([key, value]) =>
      key !== "cursor" &&
      (Array.isArray(value) ? value.length > 0 : Boolean(value)),
  );
  return pageMetadata({
    title: "Explore creative opportunities",
    description:
      "Browse grants, open calls, residencies, fellowships, awards, commissions, and other creative opportunities.",
    path: "/opportunities",
    noIndex: hasFilters,
  });
}

function toUrlSearchParams(input: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : [])
      params.append(key, item);
  }
  return params;
}

function hrefWith(
  params: URLSearchParams,
  changes: Record<string, string | undefined>,
): string {
  const next = new URLSearchParams(params);
  next.delete("cursor");
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/opportunities?${query}` : "/opportunities";
}

function removeListValueHref(
  params: URLSearchParams,
  key: string,
  value: string,
): string {
  const next = new URLSearchParams(params);
  next.delete("cursor");
  const remaining = next.getAll(key).filter((candidate) => candidate !== value);
  next.delete(key);
  for (const candidate of remaining) next.append(key, candidate);
  if (key === "taxonomy" && remaining.length === 0) {
    next.delete("taxonomyDescendants");
    next.delete("taxonomyVersion");
  }
  const query = next.toString();
  return query ? `/opportunities?${query}` : "/opportunities";
}

function activeFilterCount(
  query: ReturnType<typeof parseOpportunityBrowseQuery>,
): number {
  return (
    query.types.length +
    query.disciplines.length +
    query.genres.length +
    query.taxonomyTermIds.length +
    query.locations.length +
    (query.feeStatus ? 1 : 0) +
    (query.deadlineWithinDays ? 1 : 0)
  );
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  const rawParams = searchParams ? await searchParams : {};
  const publicPreview = rawParams.preview === "public";
  const activeSession = publicPreview ? null : session;
  const urlParams = toUrlSearchParams(rawParams);
  const query = parseOpportunityBrowseQuery(urlParams);
  const activeFeed: OpportunityFeedId =
    query.feeStatus === "no-fee"
      ? "free"
      : query.deadlineWithinDays === 14
        ? "closing"
        : query.sort === "recently-added"
          ? "recent"
          : "all";
  const baseQueryParams = new URLSearchParams(urlParams);
  baseQueryParams.delete("cursor");
  const [result, facetCounts] = await Promise.all([
    getOpportunityRepository().browse(
      query,
      activeSession?.account.id
        ? { accountId: activeSession.account.id }
        : undefined,
    ),
    getOpportunityFacetCounts(
      query,
      activeSession?.account.id
        ? { accountId: activeSession.account.id }
        : undefined,
    ),
  ]);
  const usePreviewFixtures = publicPreview && result.items.length === 0;
  const previewItems = usePreviewFixtures ? previewItemsForQuery(query) : [];
  const displayResult = usePreviewFixtures
    ? { items: previewItems, total: previewItems.length, nextCursor: null }
    : result;
  const displayFacetCounts = usePreviewFixtures
    ? PUBLIC_OPPORTUNITY_PREVIEW_FACETS
    : facetCounts;
  const filterCount = activeFilterCount(query);
  const activeChips = [
    ...query.types.map((value) => ({
      key: "type",
      value,
      label: typeLabels[value] ?? value,
      list: true,
    })),
    ...query.disciplines.map((value) => ({
      key: "discipline",
      value,
      label: value,
      list: true,
    })),
    ...query.genres.map((value) => ({
      key: "genre",
      value,
      label: value,
      list: true,
    })),
    ...query.taxonomyTermIds.map((value) => ({
      key: "taxonomy",
      value,
      label: taxonomyLabelFor(value),
      list: true,
    })),
    ...query.locations.map((value) => ({
      key: "location",
      value,
      label: value,
      list: true,
    })),
    ...(query.feeStatus
      ? [
          {
            key: "fee",
            value: query.feeStatus,
            label:
              query.feeStatus === "no-fee"
                ? "No fee"
                : query.feeStatus === "unknown"
                  ? "Fee not listed"
                  : "Application fee",
            list: false,
          },
        ]
      : []),
    ...(query.deadlineWithinDays
      ? [
          {
            key: "deadlineWithinDays",
            value: String(query.deadlineWithinDays),
            label: `Next ${query.deadlineWithinDays} days`,
            list: false,
          },
        ]
      : []),
  ];
  const saveCriteria = {
    taxonomyTermIds: query.taxonomyTermIds,
    taxonomySchemeVersion: query.taxonomySchemeVersion,
    taxonomyIncludeDescendants: query.taxonomyIncludeDescendants,
    genres: query.genres,
    noFeeOnly: query.feeStatus === "no-fee",
    deadlineWithinDays: query.deadlineWithinDays,
  };
  const emptyDescription = query.query
    ? `No opportunities match “${query.query}”. Try a broader search or remove a filter.`
    : filterCount
      ? "No opportunities match this combination yet. Try removing one filter or broadening the location."
      : "No open opportunities are available right now. Try again later.";
  const organizationStore = activeSession ? (await getEngine()).store.organizations : null;
  const headerSession = activeSession ? {
    email: activeSession.account.email,
    isAdmin: activeSession.account.isAdmin,
    organizations: activeSession.memberships.map((membership) => ({
      id: membership.organizationId,
      name: organizationStore?.get(membership.organizationId)?.name ?? "Organization",
    })),
  } : null;
  const clearFiltersHref = publicPreview
    ? "/opportunities?preview=public"
    : "/opportunities";
  const editorialCounts = {
    closing: displayResult.items.filter((item) => item.status === "closing-soon").length,
    free: displayResult.items.filter((item) => item.fee.status === "no-fee").length,
    opening: displayResult.items.length,
  };

  return (
    <OpportunityShell session={headerSession}>
    <div className={styles.shell}>
      <PublicDiscoveryEvent
        eventName="public.discovery_view"
        properties={{
          surface: "opportunities",
          resultCount: displayResult.items.length,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Creative opportunities",
          description:
            "Creative grants, open calls, residencies, awards, commissions, and fellowships.",
          url: absoluteUrl("/opportunities"),
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: displayResult.items.length,
            itemListElement: displayResult.items.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.title,
              url: absoluteUrl(`/opportunities/${item.slug}`),
            })),
          },
        }}
      />

      <main id="main-content" className={styles.main} data-density="comfortable">
        {usePreviewFixtures ? (
          <p className={styles.previewNotice} role="note">
            Design preview · Representative examples, not published listings
          </p>
        ) : null}

        <div className={styles.workspace}>
          <section className={styles.results} aria-labelledby="results-heading">
            <OpportunityEditorialHero counts={editorialCounts} />
            <OpportunityBrowseHeader
              practices={<OpportunityPracticeNav practices={displayFacetCounts.practices} currentQuery={urlParams.toString()} selectedTaxonomy={query.taxonomyTermIds} />}
              feeds={<OpportunityFeedTabs activeFeed={activeFeed} />}
              search={<div className={styles.searchRow}><OpportunitySearch
                key={query.query ?? ""}
                category={query.category}
                initialQuery={query.query}
              /></div>}
              activeFilters={activeChips.length ? (
                <div className={styles.activeFilters} aria-label="Active filters">
                  {activeChips.map((chip) => <Link key={`${chip.key}-${chip.value}`} href={chip.list ? removeListValueHref(urlParams, chip.key, chip.value) : hrefWith(urlParams, { [chip.key]: undefined })} className={styles.chip} aria-label={`Remove ${chip.label} filter`}>{chip.label}<X aria-hidden="true" /></Link>)}
                  <Link href={clearFiltersHref} className={styles.clear}>Clear all</Link>
                </div>
              ) : undefined}
              toolbar={<div className={styles.toolbar}>
                <h2 id="results-heading" aria-live="polite" aria-atomic="true">{displayResult.total.toLocaleString()} {displayResult.total === 1 ? "opportunity" : "opportunities"}</h2>
                <div className={styles.toolbarActions}>
                  <OpportunityCatalogueFilters locations={LOCATION_OPTIONS} activeFilterCount={filterCount} facetCounts={displayFacetCounts} resultCount={displayResult.total} placement="mobile" />
                  {activeSession?.account.userId ? <div className={styles.saveSearch}><SaveSearchButton userId={activeSession.account.userId} criteria={saveCriteria} defaultName={query.query ? `Search: ${query.query}` : "Opportunity search"} /></div> : null}
                  <OpportunitySort className={styles.sort} signedIn={Boolean(activeSession)} />
                </div>
              </div>}
            />
            <div className={styles.catalogueLayout}>
              <OpportunityCatalogueFilters
                locations={LOCATION_OPTIONS}
                activeFilterCount={filterCount}
                facetCounts={displayFacetCounts}
                resultCount={displayResult.total}
                placement="desktop"
              />
              <div className={styles.resultColumn}>
            <OpportunityResultsRefresh queryKey={urlParams.toString()}>
              {displayResult.items.length ? (
                <OpportunityResults
                  initialItems={displayResult.items}
                  initialNextCursor={displayResult.nextCursor}
                  baseQuery={baseQueryParams.toString()}
                  signedIn={Boolean(activeSession)}
                  previewMode={usePreviewFixtures}
                />
              ) : (
                <div className={styles.empty}>
                  <span>
                    <SearchX aria-hidden="true" />
                  </span>
                  <h2>No opportunities match these filters</h2>
                  <p>{emptyDescription}</p>
                  <Button
                    nativeButton={false}
                    render={<Link href={clearFiltersHref} />}
                    variant="outline"
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </OpportunityResultsRefresh>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
    </OpportunityShell>
  );
}
