import { publicIndexLayoutStyles as catalogueStyles } from "@/components/missa/public-index-layout";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PublicSiteShell } from "@/components/public-site-shell";
import { MagazineMethodology } from "@/components/rankings/magazine-methodology";
import { BetaBadge } from "@/components/ui/beta-badge";
import { Button } from "@/components/ui/button";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";

export const metadata: Metadata = pageMetadata({
  title: "How the rankings work · Missa Literary Magazine Index",
  description:
    "How Missa ranks literary magazines: what it counts, where each fact comes from, and what the numbers show.",
  path: "/rankings/methodology",
});

/** Served from the CDN and regenerated at most every five minutes. */
export const revalidate = 300;

const getCachedIndexReport = unstable_cache(
  async () => {
    const repository = getMagazineRankingRepository();
    const [coverage, analytics] = await Promise.all([
      repository.getIndexCoverage(),
      repository.getIndexAnalytics(),
    ]);
    return { coverage, analytics };
  },
  ["public-magazine-index-report-v1"],
  { revalidate: 300, tags: ["magazine-rankings"] },
);

export default async function RankingsMethodologyPage() {
  const { coverage, analytics } = await getCachedIndexReport().catch(() => ({
    coverage: null,
    analytics: null,
  }));

  return (
    <PublicSiteShell current="Magazine rankings">
      <main id="main-content" className={catalogueStyles.main}>
        <div className="mb-8 text-sm text-muted-foreground">
          <Link
            href="/rankings/magazines"
            className="inline-flex min-h-11 items-center gap-1.5 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to the magazine rankings
          </Link>
        </div>

        <header className={`${catalogueStyles.pageIntro} mb-10`}>
          <p className={catalogueStyles.eyebrow}>
            Rankings{coverage ? ` · ${coverage.year}` : ""}
          </p>
          <h1 className="mt-2">How the rankings work</h1>
          <p className={catalogueStyles.lede}>
            What we count, where every fact comes from, and what the numbers
            show.
          </p>
        </header>

        <aside className="mb-12 max-w-3xl space-y-2 border-l-2 border-border pl-4">
          <BetaBadge />
          <p className="text-sm leading-6 text-muted-foreground">
            The rankings are a guide, not an endorsement. They change as records
            are added or corrected. Before you submit, check fees, deadlines and
            guidelines on the magazine’s own site.
          </p>
        </aside>

        <div className="space-y-16">
          <MagazineMethodology coverage={coverage} analytics={analytics} />

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
              The residency rankings
            </h2>
            <p className="max-w-[68ch] text-base leading-7 text-muted-foreground">
              Residencies are scored out of 100 from public directory listings
              and from what residents report. The facts come from the Artist
              Communities Alliance directory, RateMyArtistResidency, reviews
              left on Missa and the open calls listed on Missa. Each fact links
              to the page it came from, and the list is rebuilt from those
              sources rather than edited by hand.
            </p>
            <ul className="max-w-[68ch] list-disc space-y-2 pl-5 text-base leading-7 text-muted-foreground marker:text-primary">
              <li>
                <strong className="text-foreground">
                  Funding, up to 35 points.
                </strong>{" "}
                25 when there is no residency fee and 10 when the program pays
                artists a stipend.
              </li>
              <li>
                <strong className="text-foreground">
                  What residents say, up to 30 points.
                </strong>{" "}
                The average rating past residents gave. A program with only a
                few ratings is pulled towards the middle until more come in, so
                one glowing review cannot carry it.
              </li>
              <li>
                <strong className="text-foreground">
                  Room to work, up to 20 points.
                </strong>{" "}
                10 when all meals are provided (7 for some meals) and 10 for a
                private studio.
              </li>
              <li>
                <strong className="text-foreground">
                  Standing and access, up to 15 points.
                </strong>{" "}
                The year the program was founded, whether more than one
                directory lists it, and whether an open call is accepting
                applications now.
              </li>
            </ul>
            <p className="max-w-[68ch] text-base leading-7 text-muted-foreground">
              When no source records a fact, it scores the middle of its range:
              a program is neither rewarded nor punished for what we have not
              found. Each program’s details panel shows which facts are on
              record and what share of its score rests on them. Every program
              those directories list is ranked; one that is missing may not be
              listed in either directory yet.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
              Using the rankings well
            </h2>
            <ul className="max-w-[68ch] list-disc space-y-2 pl-5 text-base leading-7 text-muted-foreground marker:text-primary">
              <li>
                Send each piece to a spread of tiers: a few long shots, several
                good fits, and magazines whose pages you already love.
              </li>
              <li>
                If you submit to several places at once, filter for magazines
                that welcome simultaneous submissions and reply within three
                months.
              </li>
              <li>
                Keep costs down with the “No submission fee” filter. It shows
                only magazines where a free route is on record.
              </li>
            </ul>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                nativeButton={false}
                render={<Link href="/rankings/magazines" />}
              >
                Magazine rankings <ArrowRight aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/rankings/residencies" />}
              >
                Residency rankings
              </Button>
            </div>
          </section>
        </div>
      </main>
    </PublicSiteShell>
  );
}
