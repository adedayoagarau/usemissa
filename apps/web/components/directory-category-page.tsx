import type { ProfileKind } from "@missa/radar-adapters";
import { getPublicProfileBrowse } from "@/lib/publicProfileReads";
import { PublicSiteShell } from "./public-site-shell";
import { DirectoryBrowseView } from "./directory-browse-view";
import {
  parseDirectoryScheduleState,
  parseDirectorySort,
} from "@/lib/directory-filters";

/** Shared category directory: the route owns its identity, this owns browse behavior. */
export async function DirectoryCategoryPage({
  kind,
  basePath,
  title,
  description,
  searchParams,
}: {
  kind: ProfileKind;
  basePath: string;
  title: string;
  description: string;
  searchParams?: Promise<{
    q?: string;
    page?: string;
    window?: string;
    country?: string;
    sort?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const requested = Number(params.page ?? 1);
  const activeWindow = parseDirectoryScheduleState(params.window?.trim());
  const activeCountry = params.country?.trim() || undefined;
  const activeSort = parseDirectorySort(params.sort?.trim());
  let page =
    Number.isSafeInteger(requested) && requested > 0 && requested <= 100000
      ? requested
      : 1;
  let loadFailed = false;
  let result: Awaited<ReturnType<typeof getPublicProfileBrowse>> = {
    items: [],
    total: 0,
  };
  try {
    result = await getPublicProfileBrowse({
      query: query || undefined,
      kind,
      scheduleState: activeWindow,
      country: activeCountry,
      sortBy: activeSort,
      limit: 48,
      offset: (page - 1) * 48,
    });
    if (page > 1 && !result.items.length) {
      page = 1;
      result = await getPublicProfileBrowse({
        query: query || undefined,
        kind,
        scheduleState: activeWindow,
        country: activeCountry,
        sortBy: activeSort,
        limit: 48,
        offset: 0,
      });
    }
  } catch {
    loadFailed = true;
  }
  return (
    <PublicSiteShell
      current={basePath === "/residencies" ? "Residencies" : "Directory"}
    >
      <DirectoryBrowseView
        {...result}
        basePath={basePath}
        title={title}
        description={description}
        page={page}
        pageSize={48}
        query={query}
        activeKind={kind}
        activeWindow={activeWindow}
        activeCountry={activeCountry}
        activeSort={activeSort}
        loadFailed={loadFailed}
      />
    </PublicSiteShell>
  );
}
