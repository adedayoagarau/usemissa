import type { Metadata } from "next";
import { DirectoryCategoryPage } from "@/components/directory-category-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Independent presses",
  description: "Explore independent presses and the writing they publish.",
};
export default function Page({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  return (
    <DirectoryCategoryPage
      kind="small_press"
      basePath="/presses"
      title="Find your next publisher."
      description="Explore independent presses and the writing they publish."
      searchParams={searchParams}
    />
  );
}
