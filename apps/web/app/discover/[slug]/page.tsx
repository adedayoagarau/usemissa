import { collectionArtDirection } from "@/lib/collectionArtDirection";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowRight } from "lucide-react";
import { OpportunitySort } from "@/components/opportunity-sort";
import { OpportunityBrowsePagination } from "@/components/opportunity-browse-pagination";

import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import { PublicSiteShell } from "@/components/public-site-shell";
import { GuideLinks } from "@/components/missa/guide-links";
import { EditorialMotif } from "@/components/missa/editorial-motif";
import { headerSessionFor } from "@/lib/headerSession";
import { OpportunityBrowseProjectCard } from "@/components/design-system/opportunity-browse-project-card";
import { PublicDiscoveryEvent } from "@/components/public-discovery-event";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import {
  discoveryCollection,
  discoveryCollections,
  discoveryContentLastModified,
} from "@/lib/discoveryGuides";
import {
  JsonLd,
  absoluteUrl,
  breadcrumbJsonLd,
  currentMonthYear,
  listingMetadata,
  pageMetadata,
} from "@/lib/seo";
import styles from "./collection.module.css";

export const dynamic = "force-dynamic";
export function generateStaticParams() {
  return discoveryCollections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = discoveryCollection(slug);
  // Sorted and paged variants stay out of the index; the hub itself is dated
  // so it matches "… October 2026" searches.
  return collection
    ? listingMetadata(
        {
          title: `${collection.title}, ${currentMonthYear()}`,
          description: collection.description,
          path: `/discover/${collection.slug}`,
        },
        searchParams,
      )
    : pageMetadata({
        title: "Collection not found",
        description: "This Missa collection is not available.",
        path: `/discover/${slug}`,
        noIndex: true,
      });
}

export default async function DiscoveryCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; cursor?: string }>;
}) {
  const { slug } = await params;
  const collection = discoveryCollection(slug);
  if (!collection) notFound();
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  const filters = await searchParams;
  const sort =
    filters.sort === "recently-added" ||
    filters.sort === "no-fee-first" ||
    filters.sort === "alphabetical"
      ? filters.sort
      : "soonest-deadline";
  const art = collectionArtDirection[slug];
  let nextCursor: string | null = null;
  let total: number | null = null;
  let items: OpportunityBrowseProjection[] = [];
  let unavailable = false;
  try {
    const result = await getOpportunityRepository().browse(
      { ...collection.query, limit: 48, sort, cursor: filters.cursor },
      session?.account.id ? { accountId: session.account.id } : undefined,
    );
    items = result.items;
    nextCursor = result.nextCursor ?? null;
    total = typeof result.total === "number" ? result.total : null;
  } catch {
    unavailable = true;
  }

  return (
    <PublicSiteShell
      current="Opportunities"
      session={headerSessionFor(session)}
      collectionLinks={discoveryCollections.filter(
        (entry) => entry.slug !== slug,
      )}
    >
      <main id="main-content" className={styles.main} data-theme={slug}>
        <PublicDiscoveryEvent
          eventName="public.collection_view"
          properties={{
            collection: collection.slug,
            resultCount: items.length,
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: collection.title,
            description: collection.description,
            url: absoluteUrl(`/discover/${collection.slug}`),
            dateModified: discoveryContentLastModified.toISOString(),
            isPartOf: {
              "@type": "WebSite",
              name: "Missa",
              url: absoluteUrl("/"),
            },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: items.length,
              itemListElement: items.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.title,
                url: absoluteUrl(`/opportunities/${item.slug}`),
              })),
            },
          }}
        />
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "Missa", path: "/" },
            { name: "Opportunities", path: "/opportunities" },
            { name: collection.title },
          ])}
        />
        <header className={styles.hero}>
          <Link href="/opportunities" className={styles.back}>
            ← All open calls
          </Link>
          <div className={styles.coverLayout}>
            <div className={styles.coverCopy}>
              <p className={styles.eyebrow}>{collection.title}</p>
              <h1 className={art?.editorial ? "font-heading" : "font-sans"}>
                {art?.title ?? collection.title}
              </h1>
              <p className={styles.description}>{collection.description}</p>
              <a href="#browse-results" className={styles.explore}>
                Explore opportunities{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
            {slug !== "women-nonbinary-opportunities" && (
              <div
                className={styles.artwork}
                data-motif={art?.motif ?? "orbit"}
                aria-hidden="true"
              >
                <EditorialMotif motif={art?.motif ?? "orbit"} />
              </div>
            )}
          </div>
        </header>
        <section
          className={styles.results}
          aria-labelledby="collection-guide"
        >
          <h2 id="collection-guide" className="font-sans text-xl font-medium">
            Before you apply
          </h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            {total !== null && !unavailable
              ? `${total.toLocaleString("en-US")} open now on Missa, each linked to the organizer's own page. `
              : ""}
            {collection.answer}
          </p>
          {collection.checklist.length ? (
            <ul className="mt-4 grid list-disc gap-1 pl-5 text-sm sm:grid-cols-2">
              {collection.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
        <section
          id="browse-results"
          className={styles.results}
          aria-labelledby="collection-results"
        >
          <header className={styles.resultsHeader}>
            <div>
              <h2 id="collection-results" className="font-sans">
                {items.length
                  ? `${items.length} opportunities${filters.cursor ? " on this page" : " to explore"}`
                  : "No matching records shown"}
              </h2>
            </div>
            <OpportunitySort />
          </header>
          {items.length ? (
            <div className={styles.grid}>
              {items.map((item) => (
                <OpportunityBrowseProjectCard
                  key={item.id}
                  item={item}
                  signedIn={Boolean(session)}
                />
              ))}
            </div>
          ) : (
            <div
              className={styles.empty}
              role={unavailable ? "alert" : "status"}
            >
              <h3>
                {unavailable
                  ? "This collection is temporarily unavailable"
                  : "Missa has no matching published records in this collection"}
              </h3>
              <p>
                {unavailable
                  ? "Please try again later or browse all opportunities."
                  : "This does not mean no such Opportunities exist. Try the full library or a broader collection."}
              </p>
            </div>
          )}
          {!unavailable && (
            <OpportunityBrowsePagination
              nextCursor={nextCursor}
              className={styles.pagination}
            />
          )}
        </section>
        <div className={styles.results}>
          <GuideLinks path={`/discover/${collection.slug}`} />
        </div>
      </main>
    </PublicSiteShell>
  );
}
