import { NextResponse } from "next/server";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import { buildSubmissionPortfolioPlan, type StrategyCriteria, type RankingGenre, type SubmissionStrategyPreset } from "@missa/radar-engine";
import { planningCandidate } from "@/lib/magazineFacts";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const genre: RankingGenre =
      body.genre === "fiction" || body.genre === "poetry" || body.genre === "nonfiction"
        ? body.genre
        : "overall";

    const preset: SubmissionStrategyPreset =
      body.preset === "aggressive_moonshot" || body.preset === "velocity_low_friction"
        ? body.preset
        : "balanced";

    const maxFeeCents = typeof body.maxFeeCents === "number" ? body.maxFeeCents : undefined;
    const requireSimultaneousSubmissions = Boolean(body.requireSimultaneousSubmissions);
    const maxTurnaroundDays = typeof body.maxTurnaroundDays === "number" ? body.maxTurnaroundDays : undefined;
    const payingOnly = Boolean(body.payingOnly);

    const repository = getMagazineRankingRepository();
    // Fetch all journals for this genre to run the strategy recommender
    const page = await repository.listRankings({ genre, year: 2026, limit: 1000 });
    if (page.dataSource !== "database") {
      // Never build a plan from seed rankings.
      return NextResponse.json(
        { error: "Submission plans are not available yet." },
        { status: 503 },
      );
    }

    const candidates = page.items.map(planningCandidate);

    const criteria: StrategyCriteria = {
      genre,
      preset,
      maxFeeCents,
      requireSimultaneousSubmissions,
      maxTurnaroundDays,
      payingOnly,
    };

    const plan = buildSubmissionPortfolioPlan(candidates, criteria);

    return NextResponse.json({ plan });
  } catch (err) {
    console.error("[POST /api/rankings/plan] Error generating strategy plan:", err);
    return NextResponse.json({ error: "Could not generate submission plan" }, { status: 500 });
  }
}
