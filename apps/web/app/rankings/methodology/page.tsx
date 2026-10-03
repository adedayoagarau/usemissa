import { publicIndexLayoutStyles as catalogueStyles } from "@/components/missa/public-index-layout";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  DollarSign,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { PublicSiteShell } from "@/components/public-site-shell";
import { MagazineMethodology } from "@/components/rankings/magazine-methodology";
import { BetaBadge } from "@/components/ui/beta-badge";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";

export const metadata: Metadata = {
  title: "Ranking Methodology · Missa Literary Magazine Index",
  description:
    "How the Missa Literary Magazine Index evaluates publication prestige, writer compensation, turnaround dignity, and submission ethics.",
};

export const dynamic = "force-dynamic";

const getCachedIndexCoverage = unstable_cache(
  async () => getMagazineRankingRepository().getIndexCoverage(),
  ["public-magazine-index-coverage-v1"],
  { revalidate: 300, tags: ["magazine-rankings"] },
);

export default async function RankingsMethodologyPage() {
  const coverage = await getCachedIndexCoverage().catch(() => null);
  return (
    <PublicSiteShell current="Magazine rankings">
      <main id="main-content" className={catalogueStyles.main}>
        {/* Navigation Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/rankings/magazines"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Magazine Rankings
          </Link>
        </div>

        {/* Header */}
        <header className={`${catalogueStyles.pageIntro} mb-8`}>
          <p className={catalogueStyles.eyebrow}>Rankings · 2026</p>
          <h1 className="mt-2">Ranking methodology</h1>
          <p className={catalogueStyles.lede}>
            The sources, scoring criteria, and tiers behind Missa’s magazine
            rankings.
          </p>
        </header>

        <aside className="mb-8 rounded-xl border border-border bg-muted p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <BetaBadge />
            <p className="font-mono text-xs text-foreground tabular-nums">
              Method version: 2026 beta
            </p>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            These rankings are a testing tool, not a publisher or residency
            endorsement. Scores use only facts a source records, and change as
            records are added or corrected. Confirm fees, deadlines, policies,
            and benefits on the organization&apos;s official site before acting.
          </p>
        </aside>

        <section className="space-y-8 text-base leading-7 text-foreground/90">
          <MagazineMethodology coverage={coverage} />

          {/* Section: The Missa Residency Index */}
          <div className="pt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              The Missa Residency Index (MRI)
            </h2>
            <p className="mt-2 text-muted-foreground">
              For artists and writers, taking time away for an immersive
              residency is one of the most transformative commitments in a
              creative life. Yet the landscape has long suffered from
              information asymmetry: hidden program fees, ambiguous
              accommodations, and unpredictable fellowship support.
            </p>
            <p className="mt-3 text-muted-foreground">
              The Missa Residency Index applies a rule-based 100-point model to
              program records, community reporting, and institutional intake
              fields held in the current index. Coverage and field completeness
              vary by program, so the score is a comparison aid rather than a
              certification of program quality or current terms.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-card/60 p-5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <DollarSign className="size-4 text-primary" />
                  Funding Support (35 pts)
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Programs providing 100% free residencies (25 pts) and living
                  stipends (10 pts) receive top weight to ensure economic
                  access.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Sparkles className="size-4 text-primary" />
                  Community Rating (30 pts)
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Normalized aggregate scores derived from the resident and
                  community reports currently attached to each program record.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <CheckCircle2 className="size-4 text-primary" />
                  Facilities & Solitude (20 pts)
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Rewards dedicated private studio space (10 pts) and
                  chef-prepared or provided meals (10 pts) essential for
                  uninterrupted focus.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Award className="size-4 text-primary" />
                  Prestige & Access (15 pts)
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Recognizes institutional longevity, multi-directory
                  provenance, and linked open calls where a current
                  source-backed record is available.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground">
                Residency Prestige Tiers
              </h3>
              <div className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <RankingTierBadge tier="Tier 1">
                    Tier 1: Flagship Fellowships
                  </RankingTierBadge>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Nationally renowned, highly selective programs with full
                    funding, private studios, meals, and stipends (e.g.
                    MacDowell, Headlands, Yaddo, FAWC, VCCA, Skowhegan).
                  </p>
                </div>
                <div>
                  <RankingTierBadge tier="Tier 2">
                    Tier 2: High Distinction
                  </RankingTierBadge>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Celebrated institutions offering high-quality facilities,
                    competitive financial aid, or dedicated seasonal fellowship
                    cohorts.
                  </p>
                </div>
                <div>
                  <RankingTierBadge tier="Tier 3">
                    Tier 3: Emerging & Regional
                  </RankingTierBadge>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Vital incubator spaces, specialized medium retreats, and
                    regional sanctuaries nurturing local and international
                    creators.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Practical Strategy for Creators */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              A Strategic Compass, Not a Gatekeeper
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Rankings should serve your craft, not intimidate it. We encourage
              writers and artists to build a balanced portfolio strategy for
              each manuscript and residency cycle:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                <strong>Send to a spread of tiers:</strong> Combine a couple of
                Tier 1 &quot;reach&quot; journals or flagship residencies with
                Tier 2 targets and Tier 3 venues whose creative communities you
                personally admire.
              </li>
              <li>
                <strong>Batch simultaneous submissions:</strong> Filter for
                journals that record allowing simultaneous submissions and
                replying within three months.
              </li>
              <li>
                <strong>Protect your budget:</strong> Use the &quot;No
                submission fee&quot; filter. It shows only magazines whose
                listing records no fee.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/rankings/magazines"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent-deep"
              >
                Magazine Rankings <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/rankings/residencies"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Residency Rankings & Reviews
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicSiteShell>
  );
}
