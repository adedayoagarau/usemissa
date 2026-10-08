import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicSiteShell } from "@/components/public-site-shell";
import { PublicDiscoveryEvent } from "@/components/public-discovery-event";
import {
  GuideCard,
  GuideClosing,
  GuideFeaturedCard,
  GuideSectionHeading,
} from "@/components/missa/guide-article";
import { guideType } from "@/components/missa/guide-typography";
import { buttonVariants } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { discoveryGuides } from "@/lib/discoveryGuides";
import { GUIDE_SECTIONS, guideArticles } from "@/lib/guideArticles";
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { sectionAnchor } from "./[slug]/guide-article-page";

export const metadata = pageMetadata({
  title: "Guides: finding open calls, fees, residencies and magazines",
  description:
    "Practical guides for artists and writers: where to find open calls, what fees are fair, how to apply to residencies and how to pick magazines.",
  path: "/guides",
});

export default function GuidesPage() {
  const [featured, ...rest] = guideArticles;
  const sections = GUIDE_SECTIONS.map((section) => ({
    section,
    articles: rest.filter((article) => article.section === section),
  })).filter((group) => group.articles.length);
  const allEntries = [
    ...guideArticles.map((article) => ({
      name: article.title,
      path: `/guides/${article.slug}`,
    })),
    ...discoveryGuides.map((guide) => ({
      name: guide.title,
      path: `/guides/${guide.slug}`,
    })),
  ];

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
              surface: "guides-index",
              resultCount: allEntries.length,
            }}
          />
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: "Missa guides",
              url: absoluteUrl("/guides"),
              mainEntity: {
                "@type": "ItemList",
                itemListElement: allEntries.map((entry, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: entry.name,
                  url: absoluteUrl(entry.path),
                })),
              },
            }}
          />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "Missa", path: "/" },
              { name: "Guides" },
            ])}
          />

          <header className="flex flex-col gap-group py-section">
            <div className="flex flex-col gap-row">
              <p className={guideType.eyebrow}>Guides</p>
              <h1 className={guideType.display}>Before you send the work.</h1>
              <p className={`${guideType.dek} max-w-2xl`}>
                Making the work is half the job. These guides cover the other
                half: where calls turn up, what a fee should get you, how
                residencies choose, and how to keep track of it all.
              </p>
            </div>
            <nav aria-label="Guide topics">
              <ul className="flex flex-wrap gap-2">
                {GUIDE_SECTIONS.map((section) => (
                  <li key={section}>
                    <a
                      href={`#${sectionAnchor(section)}`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      {section}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="#quick-guides"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    Quick guides
                  </a>
                </li>
              </ul>
            </nav>
          </header>

          {featured ? (
            <div
              id={
                sections.some((group) => group.section === featured.section)
                  ? undefined
                  : sectionAnchor(featured.section)
              }
              className="scroll-mt-24"
            >
              <GuideFeaturedCard article={featured} />
            </div>
          ) : null}

          {GUIDE_SECTIONS.map((section) => {
            const group = sections.find(
              (candidate) => candidate.section === section,
            );
            const inSection = group?.articles ?? [];
            if (!inSection.length) return null;
            return (
              <section
                key={section}
                id={sectionAnchor(section)}
                className="mt-section scroll-mt-24"
                aria-labelledby={`${sectionAnchor(section)}-heading`}
              >
                <GuideSectionHeading id={`${sectionAnchor(section)}-heading`}>
                  {section}
                </GuideSectionHeading>
                <ul className="mt-group grid gap-gap sm:grid-cols-2 lg:grid-cols-3">
                  {inSection.map((article) => (
                    <li key={article.slug}>
                      <GuideCard article={article} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <section
            id="quick-guides"
            className="mt-section scroll-mt-24"
            aria-labelledby="quick-guides-heading"
          >
            <GuideSectionHeading
              id="quick-guides-heading"
              eyebrow="Short reads"
            >
              Quick guides
            </GuideSectionHeading>
            <ul className="mt-group grid gap-3 md:grid-cols-2">
              {discoveryGuides.map((guide) => (
                <li key={guide.slug}>
                  <Item
                    variant="outline"
                    className="h-full"
                    render={<Link href={`/guides/${guide.slug}`} />}
                  >
                    <ItemContent>
                      <ItemTitle>{guide.title}</ItemTitle>
                      <ItemDescription>{guide.description}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 text-muted-foreground"
                      />
                    </ItemActions>
                  </Item>
                </li>
              ))}
            </ul>
          </section>

          <div className="pt-section-major">
            <GuideClosing
              cta={{ label: "Browse open calls", href: "/opportunities" }}
            />
          </div>
        </div>
      </main>
    </PublicSiteShell>
  );
}
