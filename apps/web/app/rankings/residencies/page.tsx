import Link from "next/link";
import catalogueStyles from "@/components/design-system/opportunities-browse-v2-preview.module.css";
import type { Metadata } from "next";
import { PublicSiteShell } from "@/components/public-site-shell";
import { ResidencyRankingsInteractive } from "@/components/rankings/residency-rankings-interactive";
import { getResidencyRankingRepository } from "@/lib/residencyRankingRepository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Missa Residency Index (2026) | Artist Residencies & Fellowships",
  description:
    "Explore and filter top artist residencies evaluated by funding, resident community reviews, private studio facilities, and institutional prestige.",
};

export default async function ResidencyRankingsPage() {
  const repository = getResidencyRankingRepository();
  const page = await repository.listRankings({ limit: 1000 });

  return (
    <PublicSiteShell current="Residencies">
      <main id="main-content" className={catalogueStyles.main}>
        <header className={`${catalogueStyles.pageIntro} mb-8`}>
          <p className={catalogueStyles.eyebrow}>Residencies Index · 2026</p>
          <div className={catalogueStyles.introRow}>
            <div className={catalogueStyles.introCopy}>
              <h1>Residency rankings & reviews</h1>
              <p className={catalogueStyles.lede}>
                Residency programs ranked by funding, solitude, community feedback, and institutional prestige.
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

        <footer className="mt-8 border-t border-border pt-4 flex items-center justify-between text-sm text-muted-foreground">
          <Link
            href="/rankings/methodology"
            className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
          >
            Methodology & Index Scoring
          </Link>
          <Link
            href="/residencies"
            className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Standard Directory View
          </Link>
        </footer>
      </main>
    </PublicSiteShell>
  );
}
