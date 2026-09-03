import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { InstitutionDirectoryView } from "@/components/institution-directory-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Small & Independent Presses — 290+ Verified Book Publishers",
  description: "Browse 296 verified independent literary book publishers, small presses, and university presses with full-length manuscript reading windows.",
};

const PAGE_SIZE = 48;

export default async function PressesPage({
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
        kind: "small_press",
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
    : { items: [], total: 0 };

  return (
    <PublicSiteShell current="Directory">
      <InstitutionDirectoryView
        eyebrow="Publishing & Books"
        title="Small & Independent Presses"
        description="Discover 296 confirmed independent presses publishing poetry collections, novels, creative non-fiction, and chapbooks."
        basePath="/presses"
        items={result.items}
        total={result.total}
        page={page}
        pageSize={PAGE_SIZE}
        query={query}
        activeKind="small_press"
        showKindFilterTabs={true}
      />
    </PublicSiteShell>
  );
}
