import Link from "next/link";
import catalogueStyles from "@/components/design-system/opportunities-browse-v2-preview.module.css";
import type { Metadata } from "next";
import { PublicSiteShell } from "@/components/public-site-shell";
import { ResidencyRankingsInteractive } from "@/components/rankings/residency-rankings-interactive";
import { getResidencyRankingRepository } from "@/lib/residencyRankingRepository";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Missa Residency Index (2026) | Artist Residencies & Fellowships",
  description:
    "Explore and filter top artist residencies evaluated by funding, resident community reviews, private studio facilities, and institutional prestige.",
};

const getCachedResidencyRankings = unstable_cache(
  async () => getResidencyRankingRepository().listRankings({ limit: 100 }),
  ["public-residency-rankings-v1"],
  { revalidate: 300, tags: ["residency-rankings"] },
);

export default async function ResidencyRankingsPage() {
  const page = await getCachedResidencyRankings();

  return (
    <PublicSiteShell current="Rankings">
      <main id="main-content" className={catalogueStyles.main}>
        <header className={`${catalogueStyles.pageIntro} mb-8`}>
          <p className={catalogueStyles.eyebrow}>Rankings · 2026</p>
          <div className={catalogueStyles.introRow}>
            <div className={catalogueStyles.introCopy}>
              <h1>Residency rankings</h1>
              <p className={catalogueStyles.lede}>
                Artist residencies and fellowships. Ranked by Missa across funding, facilities, community reporting, and institutional evidence.
              </p>
            </div>
          </div>
        </header>

        {page.dataSource === "empty" && (
          <p
            role="status"
            className="mb-6 rounded-lg border border-border bg-muted p-6 text-sm leading-6"
          >
            <strong>Index syncing.</strong> Connecting to residency database.
          </p>
        )}

        <ResidencyRankingsInteractive
          initialItems={page.items}
          total={page.total}
        />

        <footer className="mt-8 border-t border-border pt-4">
          <Link
            href="/rankings/methodology"
            className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
          >
            Methodology
          </Link>
        </footer>
      </main>
    </PublicSiteShell>
  );
}
