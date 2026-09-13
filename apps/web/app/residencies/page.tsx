import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryCategoryPage } from "@/components/directory-category-page";
import { ResidencyRankingsInteractive } from "@/components/rankings/residency-rankings-interactive";
import { getResidencyRankingRepository } from "@/lib/residencyRankingRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import catalogueStyles from "@/components/design-system/opportunities-browse-v2-preview.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Artist residencies & retreats",
  description:
    "Explore artist residency centers, studios, fellowships, and retreat programs worldwide.",
};

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    view?: string;
    tier?: string;
    sort?: string;
    discipline?: string;
    filter?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};

  if (params.view === "rankings") {
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
                  530+ residency programs ranked by funding, solitude, community feedback, and institutional prestige.
                </p>
              </div>
            </div>
          </header>

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

  return (
    <DirectoryCategoryPage
      kind="residency_center"
      basePath="/residencies"
      title="Find space for your practice."
      description="Explore artist residency centers, studios and retreat programs worldwide."
      searchParams={searchParams}
    />
  );
}
