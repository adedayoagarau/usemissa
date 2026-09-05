import type { Metadata } from "next";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import { MagazineComparisonView } from "@/components/rankings/magazine-comparison-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Literary Magazines · Missa Literary Magazine Index",
  description:
    "Compare up to 3 literary magazines side-by-side on accolades, contributor pay, turnaround speed, and submission fees.",
};

export default async function CompareMagazinesPage({
  searchParams,
}: {
  searchParams?: Promise<{ ids?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const requestedIds = params.ids
    ? params.ids.split(",").map((s) => s.trim()).filter(Boolean)
    : ["org_a3ea7b6729757baf61e5a260", "org_the_paris_review", "profile_2515e373709613f41db6d410b79d93d1"];

  const repo = getMagazineRankingRepository();
  const allPage = await repo.listRankings({ genre: "overall", limit: 1000 });

  return (
    <PublicSiteShell current="Directory">
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-6xl min-w-0 px-4 py-12 sm:px-6 sm:py-16"
      >
        <header className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
            Missa Index · Decision Tool
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Compare Literary Magazines
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Select up to three publications to inspect side-by-side honors,
            compensation rates, response times, and submission guidelines before submitting your work.
          </p>
        </header>

        <MagazineComparisonView
          allMagazines={allPage.items}
          initialSelectedIds={requestedIds}
        />
      </main>
    </PublicSiteShell>
  );
}
