import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowRight } from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import { PublicSiteShell } from "@/components/public-site-shell";
import { OpportunityCatalogueCard } from "@/components/opportunity-catalogue-card";
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = discoveryCollection(slug);
  if (!collection) notFound();
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  let items: OpportunityBrowseProjection[] = [];
  let unavailable = false;
  try {
    items = (
      await getOpportunityRepository().browse(
        collection.query,
        session?.account.id ? { accountId: session.account.id } : undefined,
      )
    ).items;
  } catch {
    unavailable = true;
  }

  return (
    <PublicSiteShell current="Opportunities">
      <main id="main-content" className={styles.main}>
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
          <p className={styles.eyebrow}>Curated collection</p>
          <h1>{collection.title}</h1>
          <p>{collection.description}</p>
          <p>{collection.audience}</p>
        </header>
        <div className={styles.definition}>
          <section aria-labelledby="collection-inclusion">
            <h2 id="collection-inclusion">What this collection includes</h2>
            <p>{collection.answer}</p>
          </section>
          <section aria-labelledby="collection-checks">
            <h2 id="collection-checks">Compare these facts</h2>
            <ul>
              {collection.checklist.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          </section>
        </div>
        <section
          className={styles.results}
          aria-labelledby="collection-results"
        >
          <header className={styles.resultsHeader}>
            <div>
              <p className={styles.eyebrow}>Published Opportunities</p>
              <h2 id="collection-results">
                {items.length
                  ? `${items.length} to review`
                  : "No matching records shown"}
              </h2>
            </div>
            <Link href="/opportunities">
              Browse all <ArrowRight aria-hidden="true" />
            </Link>
          </header>
          {items.length ? (
            <div className={styles.grid}>
              {items.map((item) => (
                <OpportunityCatalogueCard
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
                  ? "The collection definition remains readable. Try the Opportunity library again later."
                  : "This does not mean no such Opportunities exist. Try the full library or a broader collection."}
              </p>
            </div>
          )}
        </section>
      </main>
    </PublicSiteShell>
  );
}
