import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicSiteShell } from "@/components/public-site-shell";
import { SmartShortlistBuilder } from "@/components/rankings/smart-shortlist-builder";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { buildSubmissionPortfolioPlan } from "@missa/radar-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Smart Submission Shortlist & Strategy · Missa Index",
  description:
    "Generate an optimal literary magazine submission portfolio combining reach, target, and anchor journals matched to your genre, budget, and timing.",
};

export default async function SubmissionPlanPage() {
  const repository = getMagazineRankingRepository();
  const [page, cookieStore] = await Promise.all([
    repository.listRankings({ genre: "overall", year: 2026, limit: 1000 }),
    cookies(),
  ]);
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );

  const candidates = page.items.map((item) => ({
    profileId: item.profileId,
    name: item.name,
    slug: item.slug,
    websiteUrl: item.websiteUrl,
    rankPosition: item.rankPosition,
    totalScore: item.totalScore,
    prestigeTier: item.prestigeTier,
    medianResponseDays: item.medianResponseDays,
    regularFeeCents: item.regularFeeCents,
    contributorPayCents: item.contributorPayCents,
    simultaneousPolicy: item.simultaneousPolicy,
    formatEthicsScore: item.formatEthicsScore,
    activeOpportunity: item.activeOpportunity,
    schedule: item.schedule,
  }));

  const initialPlan = buildSubmissionPortfolioPlan(candidates, {
    genre: "overall",
    preset: "balanced",
    requireSimultaneousSubmissions: true,
  });

  return (
    <PublicSiteShell current="Directory">
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-5xl min-w-0 px-4 py-12 sm:px-6 sm:py-16"
      >
        {/* Navigation Breadcrumb */}
        <div className="mb-8 flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <Link
            href="/rankings/magazines"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Magazine Rankings
          </Link>

          <Link
            href="/rankings/compare"
            className="text-xs text-primary hover:underline"
          >
            Side-by-Side Comparison →
          </Link>
        </div>

        {/* Page Header */}
        <header className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
            Missa Submissions Strategy
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Smart Submissions Shortlist
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Do not submit in the dark. Our strategy engine evaluates hundreds of ranked literary magazines to generate an optimal portfolio of reach, target, and anchor journals customized to your manuscript, deadline horizons, and reading fee limits.
          </p>
        </header>

        {/* Interactive Builder */}
        <SmartShortlistBuilder
          initialPlan={initialPlan}
          initialGenre="overall"
          signedIn={Boolean(session)}
        />
      </main>
    </PublicSiteShell>
  );
}
