import type { ProfileKind } from "@missa/radar-adapters";
import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "./public-site-shell";
import { DirectoryBrowseView } from "./directory-browse-view";

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
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const requested = Number(params.page ?? 1);
  let page =
    Number.isSafeInteger(requested) && requested > 0 && requested <= 100000
      ? requested
      : 1;
  const repository = getProfileRepository();
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
        limit: 48,
        offset: (page - 1) * 48,
      });
      if (page > 1 && !result.items.length) {
        page = 1;
        result = await repository.browse({
          query: query || undefined,
          kind,
          limit: 48,
          offset: 0,
        });
      }
    } catch {
      loadFailed = true;
    }
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
        loadFailed={loadFailed}
      />
    </PublicSiteShell>
  );
}
