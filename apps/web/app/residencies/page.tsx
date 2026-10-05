import type { Metadata } from "next";
import { listingMetadata } from "@/lib/seo";
import Link from "next/link";
import { DirectoryCategoryPage } from "@/components/directory-category-page";
import { ResidencyRankingsInteractive } from "@/components/rankings/residency-rankings-interactive";
import { getResidencyRankingRepository } from "@/lib/residencyRankingRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { publicIndexLayoutStyles as catalogueStyles } from "@/components/missa/public-index-layout";

export const dynamic = "force-dynamic";

export function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  return listingMetadata(
    {
      title: "Artist residencies & retreats | Missa",
      description:
        "Explore artist residency centers, studios, fellowships, and retreat programs worldwide.",
      path: "/residencies",
    },
    searchParams,
  );
}

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
            <p className={catalogueStyles.eyebrow}>Residency rankings</p>
            <div className={catalogueStyles.introRow}>
              <div className={catalogueStyles.introCopy}>
                <h1>Residency rankings</h1>
                <p className={catalogueStyles.lede}>
                  {page.total.toLocaleString("en-US")} residencies ranked on
                  cost, stipends, room to work and what residents say, each fact
                  linked to its source.
                </p>
              </div>
            </div>
          </header>

          <ResidencyRankingsInteractive initialItems={page.items} />

          <footer className="mt-8 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
            <Link
              href="/rankings/methodology"
              className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
            >
              How the rankings work
            </Link>
            <Link
              href="/residencies"
              className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Directory view
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
