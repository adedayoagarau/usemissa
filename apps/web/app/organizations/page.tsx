import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { InstitutionDirectoryView } from "@/components/institution-directory-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Visual Arts Organizations & Galleries — 5,400+ Cultural Institutions",
  description: "Explore 5,430 verified contemporary art galleries, museums, non-profits, and artist-run spaces across 90+ countries.",
};

const PAGE_SIZE = 48;

export default async function OrganizationsPage({
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
        kind: "visual_arts_organization",
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
    : { items: [], total: 0 };

  return (
    <PublicSiteShell current="Directory">
      <InstitutionDirectoryView
        eyebrow="Contemporary Visual Culture"
        title="Visual Arts Organizations & Galleries"
        description="Browse 5,430 confirmed art galleries, contemporary museums, artist-run centers, and exhibition spaces worldwide."
        basePath="/organizations"
        items={result.items}
        total={result.total}
        page={page}
        pageSize={PAGE_SIZE}
        query={query}
        activeKind="visual_arts_organization"
        showKindFilterTabs={true}
      />
    </PublicSiteShell>
  );
}
