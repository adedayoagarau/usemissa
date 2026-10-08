import type { Metadata } from "next";
import Link from "next/link";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import { PublicSiteShell } from "@/components/public-site-shell";
import { PublicDiscoveryEvent } from "@/components/public-discovery-event";
import {
  GuideAnswer,
  GuideBody,
  GuideByline,
  GuideClosing,
  GuideCover,
  GuideFaq,
  GuideKeepReading,
  GuideOpenNow,
  GuideSources,
  formatGuideDate,
} from "@/components/missa/guide-article";
import { guideType } from "@/components/missa/guide-typography";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { GuideTocDisclosure, GuideTocRail } from "@/components/missa/guide-toc";
import { getPublicOpportunityPage } from "@/lib/publicOpportunityReads";
import { discoveryCollection } from "@/lib/discoveryGuides";
import {
  guideListItems,
  relatedGuideArticles,
  type GuideArticleWithBody,
} from "@/lib/guideArticles";
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { contactMailto } from "@/lib/legalContact";
import { cn } from "@/lib/utils";

/** The guide's own share card, built by ./cover.png/route.tsx. */
function coverImageUrl(slug: string): string {
  return absoluteUrl(`/guides/${slug}/cover.png`);
}

export function guideArticleMetadata(article: GuideArticleWithBody): Metadata {
  const base = pageMetadata({
    title: article.seoTitle,
    description: article.description,
    path: `/guides/${article.slug}`,
  });
  const cover = {
    url: coverImageUrl(article.slug),
    width: 1200,
    height: 630,
    type: "image/png",
    alt: article.title,
  };
  return {
    ...base,
    authors: [{ name: article.author.name }],
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: `${article.publishedAt}T00:00:00.000Z`,
      modifiedTime: `${article.updatedAt}T00:00:00.000Z`,
      authors: [article.author.name],
      section: article.section,
      images: [cover],
    },
    twitter: { ...base.twitter, images: [cover.url] },
  };
}

/** Which live calls sit under a guide, and where "see all" goes. */
function openNowFor(article: GuideArticleWithBody) {
  if (article.liveCalls?.startsWith("country:")) {
    const code = article.liveCalls.slice("country:".length).toUpperCase();
    return {
      title: "Calls open to people in Nigeria",
      query: {
        countryCode: code,
        openNow: true,
        sort: "soonest-deadline" as const,
        limit: 2,
      },
      moreHref: `/countries/${code.toLowerCase()}`,
      moreLabel: "See every call open in Nigeria",
    };
  }
  const collection = article.liveCalls
    ? discoveryCollection(article.liveCalls)
    : undefined;
  if (collection)
    return {
      title: collection.title,
      query: { ...collection.query, limit: 2 },
      moreHref: `/discover/${collection.slug}`,
      moreLabel: "See them all",
    };
  return {
    title: "Calls closing soon",
    query: { openNow: true, sort: "soonest-deadline" as const, limit: 2 },
    moreHref: "/opportunities",
    moreLabel: "Browse all open calls",
  };
}

export async function GuideArticlePage({
  article,
}: {
  article: GuideArticleWithBody;
}) {
  const path = `/guides/${article.slug}`;
  const url = absoluteUrl(path);
  const home = absoluteUrl("/");
  const openNow = openNowFor(article);
  let items: OpportunityBrowseProjection[] = [];
  let unavailable = false;
  try {
    items = (await getPublicOpportunityPage(openNow.query)).items.slice(0, 2);
  } catch {
    unavailable = true;
  }
  const related = relatedGuideArticles(article);
  const listItems = guideListItems(article);
  const { parsed } = article;

  return (
    <PublicSiteShell current="Guides">
      <main
        id="main-content"
        className="px-gutter pb-section-major"
        data-density="spacious"
      >
        <div className="mx-auto w-full max-w-6xl">
          <PublicDiscoveryEvent
            eventName="public.discovery_view"
            properties={{
              surface: `guide:${article.slug}`,
              resultCount: items.length,
            }}
          />
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "Article",
              headline: article.title,
              description: article.description,
              url,
              mainEntityOfPage: url,
              image: [coverImageUrl(article.slug)],
              datePublished: `${article.publishedAt}T00:00:00.000Z`,
              dateModified: `${article.updatedAt}T00:00:00.000Z`,
              articleSection: article.section,
              keywords: [
                article.primaryKeyword,
                ...article.secondaryKeywords,
              ].join(", "),
              wordCount: parsed.wordCount,
              inLanguage: "en-US",
              author: {
                "@type": "Person",
                name: article.author.name,
                jobTitle: "Founder",
                worksFor: { "@id": `${home}#organization` },
              },
              publisher: {
                "@type": "Organization",
                "@id": `${home}#organization`,
                name: "Missa",
                url: home,
                logo: absoluteUrl("/icon.png"),
              },
              isPartOf: { "@id": `${home}#website` },
            }}
          />
          {/* The comparison table is on the page; ItemList names what it compares. */}
          {listItems.length && article.itemList ? (
            <JsonLd
              data={{
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: article.itemList.name,
                url,
                numberOfItems: listItems.length,
                itemListElement: listItems.map((item, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: item.name,
                  ...(item.url
                    ? {
                        url: item.url.startsWith("/")
                          ? absoluteUrl(item.url)
                          : item.url,
                      }
                    : {}),
                })),
              }}
            />
          ) : null}
          {/* The questions below are visible on the page; FAQPage describes them. */}
          {parsed.faq.length ? (
            <JsonLd
              data={{
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: parsed.faq.map((item) => ({
                  "@type": "Question",
                  name: item.question,
                  acceptedAnswer: { "@type": "Answer", text: item.answer },
                })),
              }}
            />
          ) : null}
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "Missa", path: "/" },
              { name: "Guides", path: "/guides" },
              { name: article.title },
            ])}
          />

          <header className="grid items-end gap-group border-b py-group md:py-section lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:gap-section">
            <div className="flex flex-col gap-group">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href="/guides" />}>
                      Guides
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      render={
                        <Link
                          href={`/guides#${sectionAnchor(article.section)}`}
                        />
                      }
                    >
                      {article.section}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex flex-col gap-row">
                <h1 className={guideType.title}>{article.title}</h1>
                <p className={cn(guideType.dek, "max-w-2xl")}>
                  {article.description}
                </p>
              </div>
              <GuideByline article={article} />
            </div>
            <div className="max-lg:order-first">
              <GuideCover
                article={article}
                label={article.section}
                size="hero"
              />
            </div>
          </header>

          <div className="grid gap-x-section pt-section lg:grid-cols-[minmax(0,48rem)_14rem] lg:justify-between xl:grid-cols-[minmax(0,52rem)_14rem]">
            <article className="flex min-w-0 flex-col gap-section">
              <div className="flex flex-col gap-group">
                <GuideTocDisclosure
                  headings={parsed.headings}
                  className="lg:hidden print:hidden"
                />
                <GuideAnswer article={article} />
              </div>
              <GuideBody blocks={parsed.blocks} slug={article.slug} />
              <div className="print:hidden">
                <GuideOpenNow
                  title={openNow.title}
                  items={items}
                  unavailable={unavailable}
                  moreHref={openNow.moreHref}
                  moreLabel={openNow.moreLabel}
                />
              </div>
              <div className="flex flex-col gap-group">
                <GuideFaq items={parsed.faq} />
                <div className="flex flex-col gap-row">
                  <GuideSources
                    sources={parsed.sources}
                    checkedAt={article.researchCheckedAt}
                  />
                  <FactsChecked article={article} className="lg:hidden" />
                </div>
              </div>
            </article>
            <aside className="max-lg:hidden print:hidden">
              <div className="sticky top-24 flex max-h-[calc(100dvh-8rem)] flex-col gap-group overflow-y-auto pb-row">
                <GuideTocRail headings={parsed.headings} />
                <FactsChecked article={article} />
              </div>
            </aside>
          </div>

          <div className="flex flex-col gap-section pt-section-major print:hidden">
            <GuideKeepReading articles={related} />
            <GuideClosing cta={article.cta} />
          </div>
        </div>
      </main>
    </PublicSiteShell>
  );
}

function FactsChecked({
  article,
  className,
}: {
  article: GuideArticleWithBody;
  className?: string;
}) {
  return (
    <p className={cn(guideType.muted, className)}>
      Facts checked {formatGuideDate(article.researchCheckedAt)}. Found
      something out of date?{" "}
      <a
        href={contactMailto(`Correction: ${article.title}`)}
        className={guideType.link}
      >
        Tell us
      </a>
      .
    </p>
  );
}

export function sectionAnchor(section: string): string {
  return section
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}
