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
import { OpportunityBrowseProjectCard } from "@/components/design-system/opportunity-browse-project-card";
import { PublicDiscoveryEvent } from "@/components/public-discovery-event";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import {
  discoveryCollection,
  discoveryCollections,
  discoveryContentLastModified,
} from "@/lib/discoveryGuides";
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import styles from "./collection.module.css";

export const dynamic = "force-dynamic";
export function generateStaticParams() {
  return discoveryCollections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = discoveryCollection(slug);
  return collection
    ? pageMetadata({
        title: collection.title,
        description: collection.description,
        path: `/discover/${collection.slug}`,
      })
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
  let items: OpportunityBrowseProjection[] = [];
  let unavailable = false;
  try {
    const result = await getOpportunityRepository().browse(
      { ...collection.query, limit: 48, sort, cursor: filters.cursor },
      session?.account.id ? { accountId: session.account.id } : undefined,
    );
    items = result.items;
    nextCursor = result.nextCursor ?? null;
  } catch {
    unavailable = true;
  }

  return (
    <PublicSiteShell
      current="Opportunities"
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
            ← All Opportunities
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
                <svg viewBox="0 0 240 240" focusable="false">
                  {art?.motif === "burst" ? (
                    Array.from({ length: 16 }, (_, i) => (
                      <path
                        key={i}
                        d="M120 18 L130 85 L120 100 L110 85 Z"
                        transform={`rotate(${i * 22.5} 120 120)`}
                        fill="currentColor"
                      />
                    ))
                  ) : art?.motif === "steps" ? (
                    <>
                      <path
                        d="M30 200V150H80V100H130V50H180V10H220V200Z"
                        fill="currentColor"
                      />
                      <path
                        d="M10 220H230"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </>
                  ) : art?.motif === "frame" ? (
                    [0, 1, 2, 3].map((i) => (
                      <rect
                        key={i}
                        x={24 + i * 18}
                        y={24 + i * 12}
                        width={180 - i * 36}
                        height={192 - i * 24}
                        rx="1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        transform={`rotate(${i * 7} 120 120)`}
                      />
                    ))
                  ) : (
                    <>
                      {[0, 60, 120].map((angle) => (
                        <ellipse
                          key={angle}
                          cx="120"
                          cy="120"
                          rx="100"
                          ry="46"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          transform={`rotate(${angle} 120 120)`}
                        />
                      ))}
                      <circle cx="120" cy="120" r="14" fill="currentColor" />
                    </>
                  )}
                </svg>
              </div>
            )}
          </div>
        </header>
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
      </main>
    </PublicSiteShell>
  );
}
