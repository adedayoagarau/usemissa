import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { InstitutionDirectoryView } from "@/components/institution-directory-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grant Foundations & Fellowships — 720+ Verified Cultural Grantmakers",
  description: "Browse 725 verified art foundations, fellowships, and mobility funds offering project grants, travel stipends, and financial awards.",
};

const PAGE_SIZE = 48;

export default async function GrantsPage({
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
        kind: "grant_foundation",
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
    : { items: [], total: 0 };

  return (
    <PublicSiteShell current="Directory">
      <InstitutionDirectoryView
        eyebrow="Funding & Fellowships"
        title="Grant Foundations & Grantmakers"
        description="Explore 725 confirmed philanthropic foundations, cultural councils, and international mobility funds supporting artistic production."
        basePath="/grants"
        items={result.items}
        total={result.total}
        page={page}
        pageSize={PAGE_SIZE}
        query={query}
        activeKind="grant_foundation"
        showKindFilterTabs={true}
      />
    </PublicSiteShell>
  );
}
