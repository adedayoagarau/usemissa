import { NextResponse } from "next/server";
import { getHomepageStats } from "@/lib/homepageStats";

export async function GET() {
  return NextResponse.json(
    await getHomepageStats(),
    {
      headers: {
        "cache-control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    },
  );
}
