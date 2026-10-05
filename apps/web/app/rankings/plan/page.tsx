import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicSiteShell } from "@/components/public-site-shell";
import { SmartShortlistBuilder } from "@/components/rankings/smart-shortlist-builder";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import { buildSubmissionPortfolioPlan } from "@missa/radar-engine";
import { planningCandidate } from "@/lib/magazineFacts";

/** Served from the CDN and regenerated at most every five minutes. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Smart Submission Shortlist & Strategy · Missa Index",
  description:
    "Generate an optimal literary magazine submission portfolio combining reach, target, and anchor journals matched to your genre, budget, and timing.",
};

export default async function SubmissionPlanPage() {
  const repository = getMagazineRankingRepository();
  const page = await repository.listRankings({ genre: "overall", limit: 1000 });

  // Plans are built only from the live index. Seed rankings are sample data
  // and must never be presented as a real shortlist.
  const liveIndex = page.dataSource === "database";
  const candidates = (liveIndex ? page.items : []).map(planningCandidate);

  const initialPlan = liveIndex
    ? buildSubmissionPortfolioPlan(candidates, {
        genre: "overall",
        preset: "balanced",
        requireSimultaneousSubmissions: true,
      })
    : null;

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
            Build a shortlist of reach, target, and anchor magazines from the Missa magazine index, filtered by genre, fees, pay, and response time.
          </p>
        </header>

        {/* Interactive Builder */}
        {initialPlan ? (
          <SmartShortlistBuilder
            initialPlan={initialPlan}
            initialGenre="overall"
          />
        ) : (
          <Empty variant="bordered" size="spacious" role="status">
            <EmptyHeader>
              <EmptyTitle>Submission plans are not available yet</EmptyTitle>
              <EmptyDescription>
                Plans are built from the published magazine index, which is not
                available right now. Browse magazines in the directory instead.
              </EmptyDescription>
            </EmptyHeader>
            <Link
              href="/directory"
              className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
            >
              Browse the directory
            </Link>
          </Empty>
        )}
      </main>
    </PublicSiteShell>
  );
}
