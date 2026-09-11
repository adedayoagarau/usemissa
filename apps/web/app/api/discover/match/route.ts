import { NextResponse } from "next/server";
import { getManuscriptMatchEngine } from "@/lib/manuscriptMatchEngine";
import type { ManuscriptMatchInput } from "@missa/radar-adapters";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ManuscriptMatchInput;
    const engine = getManuscriptMatchEngine();
    const result = await engine.matchManuscript(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/discover/match] Match error:", error);
    return NextResponse.json(
      { error: "Failed to compute manuscript match recommendations" },
      { status: 500 },
    );
  }
}
