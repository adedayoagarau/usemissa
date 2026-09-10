import { NextResponse } from "next/server";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import { buildSubmissionPortfolioPlan, type StrategyCriteria, type RankingGenre, type SubmissionStrategyPreset } from "@missa/radar-engine";

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

    const candidates = page.items.map((item) => ({
      profileId: item.profileId,
      name: item.name,
      slug: item.slug,
      websiteUrl: item.websiteUrl,
      rankPosition: item.rankPosition,
      totalScore: item.totalScore,
      prestigeTier: item.prestigeTier,
      medianResponseDays: item.medianResponseDays,
      regularFeeCents: item.regularFeeCents,
      contributorPayCents: item.contributorPayCents,
      simultaneousPolicy: item.simultaneousPolicy,
      formatEthicsScore: item.formatEthicsScore,
      activeOpportunity: item.activeOpportunity,
      schedule: item.schedule,
    }));

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
