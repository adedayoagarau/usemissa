import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { DirectoryBrowseView } from "@/components/directory-browse-view";
import type { ProfileKind } from "@missa/radar-adapters";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Directory — Arts Organizations, Residencies & Publishers",
  description:
    "Explore Missa's directory of artist residencies, grant foundations, literary journals, small presses, and contemporary galleries worldwide.",
};

const PAGE_SIZE = 48;

function parseKind(val?: string): ProfileKind | undefined {
  const allowed: ProfileKind[] = [
    "residency_center",
    "literary_magazine",
    "small_press",
    "grant_foundation",
    "visual_arts_organization",
  ];
  return allowed.includes(val as ProfileKind)
    ? (val as ProfileKind)
    : undefined;
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    kind?: string;
    page?: string;
    window?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const repository = getProfileRepository();
  const query = params.q?.trim() ?? "";
  const kind = parseKind(params.kind);
  const activeWindow = params.window?.trim() || undefined;
  const requestedPage = Number(params.page ?? "1");
  let page =
    Number.isSafeInteger(requestedPage) &&
    requestedPage > 0 &&
    requestedPage <= 100000
      ? requestedPage
      : 1;
  let loadFailed = !repository;

  let result: Awaited<ReturnType<NonNullable<typeof repository>["browse"]>> = {
    items: [],
    total: 0,
  };
  if (repository) {
    try {
      result = await repository.browse({
        query: query || undefined,
        kind,
        scheduleState: activeWindow as any,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
      if (page > lastPage) {
        page = lastPage;
        result = await repository.browse({
          query: query || undefined,
          kind,
          scheduleState: activeWindow as any,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        });
      }
    } catch {
      loadFailed = true;
    }
  }

  return (
    <PublicSiteShell current="Directory">
      <DirectoryBrowseView
        loadFailed={loadFailed}
        items={result.items}
        total={result.total}
        page={page}
        pageSize={PAGE_SIZE}
        query={query}
        activeKind={kind}
        activeWindow={activeWindow}
      />
    </PublicSiteShell>
  );
}
