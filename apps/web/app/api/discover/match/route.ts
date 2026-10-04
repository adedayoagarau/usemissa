import { NextResponse } from "next/server";
import { getManuscriptMatchEngine } from "@/lib/manuscriptMatchEngine";
import type { ManuscriptMatchInput } from "@missa/radar-adapters";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ManuscriptMatchInput;
    const input: ManuscriptMatchInput = {
      ...body,
      // Bound free text: names and tags are short, and search is by name.
      query:
        typeof body.query === "string" ? body.query.slice(0, 80) : undefined,
      compAuthors: Array.isArray(body.compAuthors)
        ? body.compAuthors.slice(0, 20).map((name) => String(name).slice(0, 80))
        : undefined,
      writerCountry:
        typeof body.writerCountry === "string"
          ? body.writerCountry.slice(0, 60)
          : undefined,
      asOf: typeof body.asOf === "string" ? body.asOf.slice(0, 10) : undefined,
      aestheticTags: Array.isArray(body.aestheticTags)
        ? body.aestheticTags.slice(0, 30).map((tag) => String(tag).slice(0, 40))
        : undefined,
    };
    const engine = getManuscriptMatchEngine();
    const result = await engine.matchManuscript(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/discover/match] Match error:", error);
    return NextResponse.json(
      { error: "Failed to compute manuscript match recommendations" },
      { status: 500 },
    );
  }
}
