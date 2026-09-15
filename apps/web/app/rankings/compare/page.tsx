import Link from "next/link";
import { publicIndexLayoutStyles as catalogueStyles } from "@/components/missa/public-index-layout";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import { getResidencyRankingRepository } from "@/lib/residencyRankingRepository";
import { MagazineComparisonView } from "@/components/rankings/magazine-comparison-view";
import { ResidencyComparisonView } from "@/components/rankings/residency-comparison-view";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { Building, Compass } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Rankings & Opportunities · Missa Index",
  description:
    "Compare literary magazines and artist residencies side-by-side across funding, awards, turnaround, and community ratings.",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams?: Promise<{ ids?: string; kind?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const isResidency = params.kind === "residencies" || params.kind === "residency";

  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );

  if (isResidency) {
    const residencyRepo = getResidencyRankingRepository();
    const residencyPage = await residencyRepo.listRankings({ limit: 1000 });
    const defaultResidencyIds = ["macdowell", "yaddo", "headlands-center-for-the-arts"];
    const requestedIds = params.ids
      ? params.ids.split(",").map((s) => s.trim()).filter(Boolean)
      : defaultResidencyIds;

    return (
      <PublicSiteShell current="Residencies">
        <main id="main-content" className={catalogueStyles.main}>
          <header className={`${catalogueStyles.pageIntro} mb-8`}>
            <p className={catalogueStyles.eyebrow}>Rankings · Side-by-Side Comparison</p>
            <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Compare Artist Residencies
              </h1>
              {/* Segmented Switcher */}
              <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
                <Link
                  href="/rankings/compare?kind=magazines"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Magazines</span>
                </Link>
                <Link
                  href="/rankings/compare?kind=residencies"
                  aria-current="page"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-background text-foreground shadow-sm transition-colors"
                >
                  <Building className="h-3.5 w-3.5 text-primary" />
                  <span>Residencies</span>
                </Link>
              </div>
            </div>
            <p className={`${catalogueStyles.lede} mt-2`}>
              Compare fellowship funding, private studio solitude, meals, and community ratings for up to three residencies.
            </p>
          </header>

          <ResidencyComparisonView
            allResidencies={residencyPage.items}
            initialSelectedIds={requestedIds}
            signedIn={Boolean(session)}
          />
        </main>
      </PublicSiteShell>
    );
  }

  // Default: Compare Magazines
  const requestedIds = params.ids
    ? params.ids.split(",").map((s) => s.trim()).filter(Boolean)
    : ["org_a3ea7b6729757baf61e5a260", "org_the_paris_review", "profile_2515e373709613f41db6d410b79d93d1"];

  const repo = getMagazineRankingRepository();
  const allPage = await repo.listRankings({ genre: "overall", limit: 1000 });

  return (
    <PublicSiteShell current="Magazine rankings">
      <main id="main-content" className={catalogueStyles.main}>
        <header className={`${catalogueStyles.pageIntro} mb-8`}>
          <p className={catalogueStyles.eyebrow}>Rankings · Side-by-Side Comparison</p>
          <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Compare Magazines
            </h1>
            {/* Segmented Switcher */}
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
              <Link
                href="/rankings/compare?kind=magazines"
                aria-current="page"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-background text-foreground shadow-sm transition-colors"
              >
                <Compass className="h-3.5 w-3.5 text-primary" />
                <span>Magazines</span>
              </Link>
              <Link
                href="/rankings/compare?kind=residencies"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Building className="h-3.5 w-3.5" />
                <span>Residencies</span>
              </Link>
            </div>
          </div>
          <p className={`${catalogueStyles.lede} mt-2`}>
            Compare scores, contributor pay, and response times for up to three magazines.
          </p>
        </header>

        {allPage.dataSource === "seed" && (
          <p role="status" className="mb-6 text-sm text-muted-foreground">
            Rankings preview: these comparisons use seed data, not verified current submission terms.
          </p>
        )}
        <MagazineComparisonView
          allMagazines={allPage.items}
          initialSelectedIds={requestedIds}
          signedIn={Boolean(session)}
        />
      </main>
    </PublicSiteShell>
  );
}
