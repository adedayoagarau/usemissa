import { NextResponse } from "next/server";
import type { RankingGenre } from "@missa/radar-engine";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";

function boundedInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), maximum);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requestedGenre = params.get("genre");
  const genre: RankingGenre =
    requestedGenre === "poetry" ||
    requestedGenre === "fiction" ||
    requestedGenre === "nonfiction"
      ? requestedGenre
      : "overall";
  const limit = Math.max(1, boundedInteger(params.get("limit"), 100, 250));
  const offset = boundedInteger(params.get("offset"), 0, 10_000);
  const page = await getMagazineRankingRepository().listRankings({
    genre,
    year: 2026,
    limit,
    offset,
  });

  return NextResponse.json(
    { items: page.items, total: page.total },
    {
      headers: {
        "cache-control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    },
  );
}
