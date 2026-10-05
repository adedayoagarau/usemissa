import type { Metadata } from "next";
import { listingMetadata } from "@/lib/seo";
import { DirectoryCategoryPage } from "@/components/directory-category-page";
export const dynamic = "force-dynamic";
export function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  return listingMetadata(
    {
      title: "Literary journals & magazines | Missa",
      description:
        "Explore literary journals and magazines publishing poetry, fiction and essays.",
      path: "/journals",
    },
    searchParams,
  );
}
export default function Page({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string; window?: string; sort?: string }>;
}) {
  return (
    <DirectoryCategoryPage
      kind="literary_magazine"
      basePath="/journals"
      title="Find a home for your writing."
      description="Explore literary journals and magazines publishing poetry, fiction and essays."
      searchParams={searchParams}
    />
  );
}
