import Link from "next/link";
import catalogueStyles from "@/components/design-system/opportunities-browse-v2-preview.module.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PublicSiteShell } from "@/components/public-site-shell";
import { MagazineRankingsInteractive } from "@/components/rankings/magazine-rankings-interactive";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
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
  const [page, cookieStore] = await Promise.all([
    repository.listRankings({ genre, year: 2026, limit: 1000 }),
    cookies(),
  ]);
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );

  return (
    <PublicSiteShell current="Magazine rankings">
      <main
        id="main-content"
        className={catalogueStyles.main}
      >
        <header className={`${catalogueStyles.pageIntro} mb-8`}>
          <p className={catalogueStyles.eyebrow}>Rankings · 2026</p>
          <div className={catalogueStyles.introRow}>
            <div className={catalogueStyles.introCopy}>
              <h1>Magazine rankings</h1>
              <p className={catalogueStyles.lede}>Poetry, fiction, and nonfiction. Ranked by Missa.</p>
            </div>
          </div>
        </header>
        {page.dataSource === "seed" && (
          <p
            role="status"
            className="mb-6 rounded-lg border border-border bg-muted p-6 text-sm leading-6"
          >
            <strong>Rankings preview.</strong> This view uses seed data while
            the live index is unavailable. Scores are illustrative; submission
            fees, schedules, and response reporting are not shown.
          </p>
        )}

        <MagazineRankingsInteractive
          key={genre}
          preview={page.dataSource === "seed"}
          initialItems={page.items}
          currentGenre={genre}
          total={page.total}
          signedIn={Boolean(session)}
        />
        <footer className="mt-8 border-t border-border pt-4">
          <Link href="/rankings/methodology" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">Methodology</Link>
        </footer>
      </main>
    </PublicSiteShell>
  );
}
