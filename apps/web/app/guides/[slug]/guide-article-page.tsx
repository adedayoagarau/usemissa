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
  guideStyles as styles,
} from "@/components/missa/guide-article";
import {
  GuideTocDisclosure,
  GuideTocRail,
} from "@/components/missa/guide-toc";
import { getPublicOpportunityPage } from "@/lib/publicOpportunityReads";
import { discoveryCollection } from "@/lib/discoveryGuides";
import {
  relatedGuideArticles,
  type GuideArticleWithBody,
} from "@/lib/guideArticles";
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { contactMailto } from "@/lib/legalContact";

const SOCIAL_IMAGE = "/brand/missa-social-share.png";

export function guideArticleMetadata(article: GuideArticleWithBody): Metadata {
  const base = pageMetadata({
    title: article.seoTitle,
    description: article.description,
    path: `/guides/${article.slug}`,
  });
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
    },
  };
}

/** Which live calls sit under a guide, and where "see all" goes. */
function openNowFor(article: GuideArticleWithBody) {
  if (article.liveCalls?.startsWith("country:")) {
    const code = article.liveCalls.slice("country:".length).toUpperCase();
    return {
      title: "Calls open to people in Nigeria",
      query: { countryCode: code, openNow: true, sort: "soonest-deadline" as const, limit: 4 },
      moreHref: `/countries/${code.toLowerCase()}`,
      moreLabel: "See every call open in Nigeria",
    };
  }
  const collection = article.liveCalls ? discoveryCollection(article.liveCalls) : undefined;
  if (collection)
    return {
      title: collection.title,
      query: { ...collection.query, limit: 4 },
      moreHref: `/discover/${collection.slug}`,
      moreLabel: "See them all",
    };
  return {
    title: "Calls closing soon",
    query: { openNow: true, sort: "soonest-deadline" as const, limit: 4 },
    moreHref: "/opportunities",
    moreLabel: "Browse all open calls",
  };
}

export async function GuideArticlePage({ article }: { article: GuideArticleWithBody }) {
  const path = `/guides/${article.slug}`;
  const url = absoluteUrl(path);
  const home = absoluteUrl("/");
  const openNow = openNowFor(article);
  let items: OpportunityBrowseProjection[] = [];
  let unavailable = false;
  try {
    items = (await getPublicOpportunityPage(openNow.query)).items.slice(0, 4);
  } catch {
    unavailable = true;
  }
  const related = relatedGuideArticles(article);
  const { parsed } = article;

  return (
    <PublicSiteShell current="Guides">
      <main id="main-content" className={styles.page} data-density="spacious">
        <PublicDiscoveryEvent
          eventName="public.discovery_view"
          properties={{ surface: `guide:${article.slug}`, resultCount: items.length }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.description,
            url,
            mainEntityOfPage: url,
            image: [absoluteUrl(SOCIAL_IMAGE)],
            datePublished: `${article.publishedAt}T00:00:00.000Z`,
            dateModified: `${article.updatedAt}T00:00:00.000Z`,
            articleSection: article.section,
            keywords: [article.primaryKeyword, ...article.secondaryKeywords].join(", "),
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

        <header className={styles.hero}>
          <div>
            <nav aria-label="Breadcrumb">
              <ol className={styles.crumbs}>
                <li>
                  <Link href="/guides">Guides</Link>
                </li>
                <li>
                  <Link href={`/guides#${sectionAnchor(article.section)}`}>{article.section}</Link>
                </li>
              </ol>
            </nav>
            <h1 className={`font-heading ${styles.title}`}>{article.title}</h1>
            <p className={styles.dek}>{article.description}</p>
            <GuideByline article={article} />
          </div>
          <GuideCover article={article} label={article.section} />
        </header>

        <div className={styles.layout}>
          <aside className={styles.rail}>
            <GuideTocRail headings={parsed.headings} />
            <p className={styles.railNote}>
              Facts checked {formatGuideDate(article.researchCheckedAt)}. Found something out of date?{" "}
              <a href={contactMailto(`Correction: ${article.title}`)}>Tell us</a>.
            </p>
          </aside>
          <article className={styles.article}>
            <GuideTocDisclosure headings={parsed.headings} />
            <GuideAnswer article={article} />
            <GuideBody blocks={parsed.blocks} slug={article.slug} />
            <GuideOpenNow
              title={openNow.title}
              items={items}
              unavailable={unavailable}
              moreHref={openNow.moreHref}
              moreLabel={openNow.moreLabel}
            />
            <GuideFaq items={parsed.faq} />
            <GuideSources sources={parsed.sources} checkedAt={article.researchCheckedAt} />
          </article>
        </div>

        <GuideKeepReading articles={related} />
        <GuideClosing cta={article.cta} />
      </main>
    </PublicSiteShell>
  );
}

export function sectionAnchor(section: string): string {
  return section.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}
