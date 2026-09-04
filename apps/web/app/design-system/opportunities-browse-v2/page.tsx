import type { Metadata } from "next";
import type { OpportunityType } from "@missa/radar-engine";
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
  const sort = typeof raw.sort === "string" ? (raw.sort as any) : "soonest-deadline";

  let items: any[] = [];
  let total = 0;

  try {
    const repo = getOpportunityRepository();
    const res = await repo.browse({
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
    });
    items = res.items;
    total = res.total;
  } catch (err) {
    console.error("[opportunities-browse-v2] Failed to fetch live opportunities:", err);
  }

  return (
    <OpportunitiesBrowseV2Preview
      initialItems={items}
      totalCount={total}
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
