import Link from "next/link";
import { publicIndexLayoutStyles as catalogueStyles } from "@/components/missa/public-index-layout";
import type { Metadata } from "next";
import { listingMetadata } from "@/lib/seo";
import { cookies } from "next/headers";
import { PublicSiteShell } from "@/components/public-site-shell";
import { MagazineRankingsInteractive } from "@/components/rankings/magazine-rankings-interactive";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import type { RankingGenre } from "@missa/radar-engine";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

export function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  return listingMetadata(
    {
      title: "Missa Literary Magazine Index",
      description:
        "The independent literary magazine rankings evaluated across anthology accolades, contributor compensation, turnaround speed, and submission access.",
      path: "/rankings/magazines",
    },
    searchParams,
  );
}

const getCachedMagazineRankings = unstable_cache(
  async (genre: RankingGenre) =>
    getMagazineRankingRepository().listRankings({
      genre,
      limit: 100,
    }),
  ["public-magazine-rankings-v1"],
  { revalidate: 300, tags: ["magazine-rankings"] },
);

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

  const [page, cookieStore] = await Promise.all([
    getCachedMagazineRankings(genre),
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
          <p className={catalogueStyles.eyebrow}>Rankings · {page.year}</p>
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

        {page.dataSource === "empty" ? (
          <Empty variant="bordered" size="spacious" role="status">
            <EmptyHeader>
              <EmptyTitle>Magazine rankings are not available yet</EmptyTitle>
              <EmptyDescription>
                The index has not been published. Browse magazines in the
                directory in the meantime.
              </EmptyDescription>
            </EmptyHeader>
            <Link
              href="/directory"
              className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
            >
              Browse the directory
            </Link>
          </Empty>
        ) : (
          <MagazineRankingsInteractive
            key={genre}
            preview={page.dataSource === "seed"}
            initialItems={page.items}
            currentGenre={genre}
            total={page.total}
            signedIn={Boolean(session)}
          />
        )}
        <footer className="mt-8 border-t border-border pt-4">
          <Link href="/rankings/methodology" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">Methodology</Link>
        </footer>
      </main>
    </PublicSiteShell>
  );
}
