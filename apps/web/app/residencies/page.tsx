import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { InstitutionDirectoryView } from "@/components/institution-directory-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Artist Residencies & Retreats — 980+ Verified Global Residency Centers",
  description: "Explore 985 verified artist residency programs worldwide. Discover studios, housing, stipends, and retreat spaces across Europe, the Americas, Asia, and Africa.",
};

const PAGE_SIZE = 48;

export default async function ResidenciesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const repository = getProfileRepository();
  const query = params.q?.trim() ?? "";
  const page = Math.max(Number(params.page ?? "1") || 1, 1);

  const result = repository
    ? await repository.browse({
        query: query || undefined,
        kind: "residency_center",
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
    : { items: [], total: 0 };

  return (
    <PublicSiteShell current="Directory">
      <InstitutionDirectoryView
        eyebrow="Residencies & Retreats"
        title="Artist Residencies & Centers"
        description="Discover 985 confirmed residency centers offering dedicated studios, living accommodations, stipends, and uninterrupted space to create."
        basePath="/residencies"
        items={result.items}
        total={result.total}
        page={page}
        pageSize={PAGE_SIZE}
        query={query}
        activeKind="residency_center"
        showKindFilterTabs={true}
      />
    </PublicSiteShell>
  );
}
