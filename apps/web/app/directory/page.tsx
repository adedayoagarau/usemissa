import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { InstitutionDirectoryView } from "@/components/institution-directory-view";
import type { ProfileKind } from "@missa/radar-adapters";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Institutional Directory — 9,000+ Arts Organizations, Residencies & Publishers",
  description: "Explore Missa's comprehensive verified directory of artist residencies, grant foundations, literary journals, small presses, and contemporary galleries worldwide.",
};

const PAGE_SIZE = 48;

function parseKind(val?: string): ProfileKind | undefined {
  const allowed: ProfileKind[] = ["residency_center", "literary_magazine", "small_press", "grant_foundation", "visual_arts_organization"];
  return allowed.includes(val as ProfileKind) ? (val as ProfileKind) : undefined;
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; kind?: string; page?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const repository = getProfileRepository();
  const query = params.q?.trim() ?? "";
  const kind = parseKind(params.kind);
  const page = Math.max(Number(params.page ?? "1") || 1, 1);

  const result = repository
    ? await repository.browse({
        query: query || undefined,
        kind,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
    : { items: [], total: 0 };

  return (
    <PublicSiteShell current="Directory">
      <InstitutionDirectoryView
        eyebrow="Global Cultural Radar"
        title="Institutional Directory"
        description="Browse 9,120+ confirmed artist residency centers, grant foundations, literary magazines, small presses, and galleries worldwide."
        basePath="/directory"
        items={result.items}
        total={result.total}
        page={page}
        pageSize={PAGE_SIZE}
        query={query}
        activeKind={kind}
        showKindFilterTabs={true}
      />
    </PublicSiteShell>
  );
}
