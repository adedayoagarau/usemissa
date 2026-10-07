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
      title: "Grant funders for artists and writers",
      description:
        "Foundations and organizations that fund artists and writers, with their open grants, fellowships and awards and a link to each funder's page.",
      path: "/grants",
    },
    searchParams,
  );
}
export default function Page({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  return (
    <DirectoryCategoryPage
      kind="grant_foundation"
      basePath="/grants"
      title="Meet the organizations funding creative work."
      description="Explore grant foundations and organizations supporting artists and writers."
      searchParams={searchParams}
    />
  );
}
