import type { Metadata } from "next";
import { PublicSiteShell } from "@/components/public-site-shell";
import { MagazineRankingsInteractive } from "@/components/rankings/magazine-rankings-interactive";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import type { RankingGenre } from "@missa/radar-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Missa Literary Magazine Index (2026)",
  description:
    "The independent literary magazine rankings evaluated across anthology accolades, contributor compensation, turnaround speed, and submission access.",
};

export default async function MagazineRankingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ genre?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const requestedGenre = params.genre?.toLowerCase();
  const genre: RankingGenre =
    requestedGenre === "fiction" ||
    requestedGenre === "poetry" ||
    requestedGenre === "nonfiction"
      ? requestedGenre
      : "overall";

  const repository = getMagazineRankingRepository();
  const page = await repository.listRankings({ genre, year: 2026, limit: 1000 });

  return (
    <PublicSiteShell current="Directory">
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-5xl min-w-0 px-4 py-12 sm:px-6 sm:py-16"
      >
        <header className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
            Missa Index · 2026 Edition
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Literary Magazine Rankings
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Missa’s proprietary literary index. Evaluated across 10-year rolling
            anthology honors (Pushcart, Best American, O. Henry, Best of the
            Net), contributor compensation, real-world turnaround times, and
            ethical submission accessibility.
          </p>
        </header>

        <MagazineRankingsInteractive
          initialItems={page.items}
          currentGenre={genre}
          total={page.total}
        />
      </main>
    </PublicSiteShell>
  );
}
