import Link from "next/link";
import { publicIndexLayoutStyles as catalogueStyles } from "@/components/missa/public-index-layout";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { currentYear, pageMetadata } from "@/lib/seo";
import { PublicSiteShell } from "@/components/public-site-shell";
import { ResidencyRankingsInteractive } from "@/components/rankings/residency-rankings-interactive";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getResidencyRankingRepository } from "@/lib/residencyRankingRepository";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: `Artist residency rankings ${currentYear()}`,
  description:
    "Artist residencies ranked by Missa on cost, stipends, meals, studios and what residents say, with the source for every fact.",
  path: "/rankings/residencies",
});

const getCachedResidencyRankings = unstable_cache(
  async () => getResidencyRankingRepository().listRankings({ limit: 1000 }),
  ["public-residency-rankings-v2"],
  { revalidate: 300, tags: ["residency-rankings"] },
);

function updatedLabel(date: string | null | undefined): string | null {
  if (!date) return null;
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default async function ResidencyRankingsPage() {
  const [page, cookieStore] = await Promise.all([
    getCachedResidencyRankings(),
    cookies(),
  ]);
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  const updated = updatedLabel(page.items[0]?.computedOn);

  return (
    <PublicSiteShell current="Rankings">
      <main id="main-content" className={catalogueStyles.main}>
        <header className={`${catalogueStyles.pageIntro} mb-8`}>
          <p className={catalogueStyles.eyebrow}>
            Rankings{updated ? ` · Updated ${updated}` : ""}
          </p>
          <div className={catalogueStyles.introRow}>
            <div className={catalogueStyles.introCopy}>
              <h1>Residency rankings</h1>
              <p className={catalogueStyles.lede}>
                Artist residencies ranked by Missa on cost, stipends, room to
                work and what residents say. Every fact links to the directory
                that records it.
              </p>
            </div>
          </div>
        </header>

        {page.dataSource === "empty" ? (
          <Empty variant="bordered" size="spacious" role="status">
            <EmptyHeader>
              <EmptyTitle>Residency rankings are not available yet</EmptyTitle>
              <EmptyDescription>
                The index has not been published. Browse residencies in the
                directory in the meantime.
              </EmptyDescription>
            </EmptyHeader>
            <Link
              href="/residencies"
              className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
            >
              Browse residencies
            </Link>
          </Empty>
        ) : (
          <ResidencyRankingsInteractive
            initialItems={page.items}
            signedIn={Boolean(session)}
          />
        )}

        <footer className="mt-8 border-t border-border pt-4">
          <Link
            href="/rankings/methodology"
            className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
          >
            How the rankings work
          </Link>
        </footer>
      </main>
    </PublicSiteShell>
  );
}
