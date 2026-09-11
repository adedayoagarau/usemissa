import { NextResponse } from "next/server";
import { getResidencyRankingRepository } from "@/lib/residencyRankingRepository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const repo = getResidencyRankingRepository();
    const intelligence = await repo.getIntelligence(id);

    if (!intelligence) {
      return NextResponse.json(
        { error: "Residency intelligence profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(intelligence);
  } catch (error) {
    console.error("[GET /api/rankings/residencies/[id]/intelligence] Error:", error);
    return NextResponse.json(
      { error: "Failed to load residency intelligence profile" },
      { status: 500 },
    );
  }
}
