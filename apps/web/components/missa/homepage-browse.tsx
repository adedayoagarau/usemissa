"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";

import { OpportunityCatalogueFilters } from "@/components/opportunity-catalogue-filters";
import {
  OpportunitiesBrowse,
  type ActiveFiltersState,
} from "@/components/missa/opportunities-browse";
import {
  ShortlistBar,
  ShortlistSaveControl,
} from "@/components/missa/homepage-shortlist";
import { useSignedIn } from "@/lib/browserSession";
import type { OpportunityFacetCounts } from "@/lib/opportunityFacetCounts";
import styles from "./homepage-standard.module.css";

/**
 * The live catalogue on the homepage: the same browse composition, filter
 * model and cards as /opportunities, with the first page of results and a
 * shortlist that stands in for the Tracker until the visitor signs in.
 */
export function HomepageBrowse({
  items,
  facetCounts,
  totalCount,
  loadFailed,
  activeFilters,
  activeFilterCount,
  initialQuery,
  locations,
}: {
  items: OpportunityBrowseProjection[];
  facetCounts: OpportunityFacetCounts;
  totalCount: number;
  loadFailed: boolean;
  activeFilters: ActiveFiltersState;
  activeFilterCount: number;
  initialQuery: string;
  locations: Array<{ value: string; label: string }>;
}) {
  const signedIn = useSignedIn();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const browseAllHref = query ? `/opportunities?${query}` : "/opportunities";
  const remaining = Math.max(totalCount - items.length, 0);

  return (
    <OpportunitiesBrowse
      embedded
      landmark="section"
      landmarkLabel="Open opportunities"
      intro={null}
      showCollections={false}
      showPagination={false}
      signedIn={signedIn}
      initialItems={items}
      totalCount={totalCount}
      nextCursor={null}
      loadFailed={loadFailed}
      initialQuery={initialQuery}
      activeFilters={activeFilters}
      filterControls={
        <OpportunityCatalogueFilters
          key="homepage-filters"
          locations={locations}
          activeFilterCount={activeFilterCount}
          facetCounts={facetCounts}
          resultCount={totalCount}
          placement="all"
          appearance="index"
        />
      }
      beforeResults={<ShortlistBar />}
      renderSaveAction={(item) => (
        <ShortlistSaveControl item={item} signedIn={signedIn} />
      )}
      resultsFooter={
        !loadFailed && items.length > 0 ? (
          <p className={styles.browseAll}>
            <Link href={browseAllHref} className={styles.textLink}>
              {remaining > 0
                ? `See all ${totalCount.toLocaleString("en")} open opportunities`
                : "Open the full catalogue"}
              <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
          </p>
        ) : null
      }
    />
  );
}
