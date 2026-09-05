import type { Metadata } from "next";
import { DirectoryCategoryPage } from "@/components/directory-category-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Artist residencies & retreats",
  description:
    "Explore artist residency centers, studios and retreat programs worldwide.",
};
export default function Page({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  return (
    <DirectoryCategoryPage
      kind="residency_center"
      basePath="/residencies"
      title="Find space for your practice."
      description="Explore artist residency centers, studios and retreat programs worldwide."
      searchParams={searchParams}
    />
  );
}
