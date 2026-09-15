import { NextResponse } from "next/server";
import { getResidencyRankingRepository } from "@/lib/residencyRankingRepository";

function boundedInteger(
  value: string | null,
  fallback: number,
  maximum: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), maximum);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = Math.max(1, boundedInteger(params.get("limit"), 100, 250));
  const offset = boundedInteger(params.get("offset"), 0, 10_000);
  const page = await getResidencyRankingRepository().listRankings({
    limit,
    offset,
  });

  return NextResponse.json(
    { items: page.items, total: page.total, dataSource: page.dataSource },
    {
      headers: {
        "cache-control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    },
  );
}
