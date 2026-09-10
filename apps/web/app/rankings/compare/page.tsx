import catalogueStyles from "@/components/design-system/opportunities-browse-v2-preview.module.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import { MagazineComparisonView } from "@/components/rankings/magazine-comparison-view";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";

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
  const [allPage, cookieStore] = await Promise.all([
    repo.listRankings({ genre: "overall", limit: 1000 }),
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
          <p className={catalogueStyles.eyebrow}>
            Rankings · Compare
          </p>
          <h1 className="mt-2">
            Compare magazines
          </h1>
          <p className={catalogueStyles.lede}>
            Compare scores, contributor pay, and response times for up to three magazines.
          </p>
        </header>

        {allPage.dataSource === "seed" && <p role="status" className="mb-6 text-sm text-muted-foreground">Rankings preview: these comparisons use seed data, not verified current submission terms.</p>}
        <MagazineComparisonView
          allMagazines={allPage.items}
          initialSelectedIds={requestedIds}
          signedIn={Boolean(session)}
        />
      </main>
    </PublicSiteShell>
  );
}
