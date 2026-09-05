import type { Metadata } from "next";
import { DirectoryCategoryPage } from "@/components/directory-category-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Literary journals & magazines",
  description:
    "Explore literary journals and magazines publishing poetry, fiction and essays.",
};
export default function Page({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
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
