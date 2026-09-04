import type { Metadata } from "next";
import type { OpportunityType, OpportunityBrowseProjection, OpportunityRepositoryQuery, OpportunityRepositorySort } from "@missa/radar-engine";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import { OpportunitiesBrowseV2Preview } from "@/components/design-system/opportunities-browse-v2-preview";

export const metadata: Metadata = {
  title: "Opportunities browse v2 · Missa design review",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function OpportunitiesBrowseV2Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const raw = searchParams ? await searchParams : {};
  const q = typeof raw.q === "string" ? raw.q.trim() : undefined;
  const type = typeof raw.type === "string" ? raw.type : undefined;
  const discipline = typeof raw.discipline === "string" ? raw.discipline : undefined;
  const location = typeof raw.location === "string" ? raw.location : undefined;
  const deadline = typeof raw.deadline === "string" ? Number(raw.deadline) : undefined;
  const fee = typeof raw.fee === "string" ? raw.fee : undefined;
  const allowedSorts: OpportunityRepositorySort[] = ["soonest-deadline", "recently-added", "no-fee-first", "alphabetical"];
  const sort = allowedSorts.includes(raw.sort as OpportunityRepositorySort) ? raw.sort as OpportunityRepositorySort : "soonest-deadline";
  const cursor = typeof raw.cursor === "string" ? raw.cursor : undefined;

  let items: OpportunityBrowseProjection[] = [];
  let nextCursor: string | null = null;
  let loadFailed = false;
  let total = 0;

  try {
    const repo = getOpportunityRepository();
    const query: OpportunityRepositoryQuery = {
      query: q,
      types: type ? ([type] as OpportunityType[]) : undefined,
      disciplines: discipline ? [discipline] : undefined,
      locations: location ? [location] : undefined,
      feeStatus:
        fee === "no-fee"
          ? "no-fee"
          : fee === "has-fee"
            ? "paid"
            : undefined,
      deadlineWithinDays: Number.isFinite(deadline) ? deadline : undefined,
      openNow: true,
      sort,
      limit: 48,
      cursor,
    };
    const [res, firstPage] = await Promise.all([
      repo.browse(query),
      cursor ? repo.browse({ ...query, cursor: undefined, limit: 1 }) : Promise.resolve(null),
    ]);
    items = res.items;
    total = firstPage?.total ?? res.total;
    nextCursor = res.nextCursor ?? null;
  } catch (err) {
    loadFailed = true;
    console.error("[opportunities-browse-v2] Failed to fetch live opportunities:", err);
  }

  return (
    <OpportunitiesBrowseV2Preview
      initialItems={items}
      totalCount={total}
      nextCursor={nextCursor}
      loadFailed={loadFailed}
      initialQuery={q ?? ""}
      activeFilters={{
        type: type ?? null,
        discipline: discipline ?? null,
        location: location ?? null,
        deadline: typeof raw.deadline === "string" ? raw.deadline : null,
        fee: fee ?? null,
      }}
    />
  );
}
