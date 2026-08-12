import { NextResponse } from "next/server";
import { getProfileRepository } from "@/lib/profileRepository";

export async function GET(request: Request) {
  const repository = getProfileRepository();
  if (!repository)
    return NextResponse.json(
      { items: [], total: 0, unavailable: true },
      { status: 503 },
    );
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const result = await repository.browse({
    kind:
      kind === "small_press" || kind === "literary_magazine" ? kind : undefined,
    query: url.searchParams.get("q") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 24),
    offset: Number(url.searchParams.get("offset") ?? 0),
  });
  return NextResponse.json(result, {
    headers: {
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
