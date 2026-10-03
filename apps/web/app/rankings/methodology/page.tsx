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
              Residencies are scored out of 100 in the same spirit: from the
              program’s own records and from what residents report. Some
              programs have more on record than others, so treat the score as a
              way to compare, not as a judgement of a program.
            </p>
            <ul className="max-w-[68ch] list-disc space-y-2 pl-5 text-base leading-7 text-muted-foreground marker:text-primary">
              <li>
                <strong className="text-foreground">
                  Funding, up to 35 points.
                </strong>{" "}
                25 for a residency that costs nothing to attend, and 10 more for
                a living stipend.
              </li>
              <li>
                <strong className="text-foreground">
                  What residents say, up to 30 points.
                </strong>{" "}
                The ratings past residents have left on the program.
              </li>
              <li>
                <strong className="text-foreground">
                  Room to work, up to 20 points.
                </strong>{" "}
                10 for a private studio and 10 for meals provided.
              </li>
              <li>
                <strong className="text-foreground">
                  Standing and access, up to 15 points.
                </strong>{" "}
                How long the program has run, how many directories list it, and
                whether it has a current open call on record.
              </li>
            </ul>
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
