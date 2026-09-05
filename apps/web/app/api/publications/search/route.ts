import { NextResponse } from "next/server";
import { getProfileRepository } from "@/lib/profileRepository";
import { getSemanticUrlForProfile } from "@missa/radar-adapters";
export async function GET(request: Request) {
  const query =
    new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (query.length < 2) return NextResponse.json({ items: [] });
  const repository = getProfileRepository();
  if (!repository)
    return NextResponse.json(
      {
        items: [],
        error: "Directory search is unavailable. You can still enter the name.",
      },
      { status: 503 },
    );
  try {
    const result = await repository.browse({
      query,
      nameOnly: true,
      limit: 24,
      offset: 0,
    });
    return NextResponse.json(
      {
        items: result.items
          .filter(
            (item, index, items) =>
              items.findIndex(
                (other) => other.kind === item.kind && other.slug === item.slug,
              ) === index,
          )
          .slice(0, 8)
          .map((item) => ({
            id: item.id,
            name: item.name,
            kind: item.kind,
            href: getSemanticUrlForProfile(item.kind, item.slug),
          })),
      },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch {
    return NextResponse.json(
      {
        items: [],
        error: "Directory search is unavailable. You can still enter the name.",
      },
      { status: 503 },
    );
  }
}
