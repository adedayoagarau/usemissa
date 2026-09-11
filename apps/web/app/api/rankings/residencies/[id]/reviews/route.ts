import { NextResponse } from "next/server";
import { getResidencyRankingRepository } from "@/lib/residencyRankingRepository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Residency identifier is required." },
        { status: 400 },
      );
    }

    const repo = getResidencyRankingRepository();
    const reviews = await repo.getReviews(id);

    return NextResponse.json({
      reviews,
      total: reviews.length,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Residency identifier is required." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid review submission payload." },
        { status: 400 },
      );
    }

    const ratingScore = Number(body.ratingScore);
    if (isNaN(ratingScore) || ratingScore < 1 || ratingScore > 5) {
      return NextResponse.json(
        { error: "Please provide a rating score between 1.0 and 5.0." },
        { status: 400 },
      );
    }

    const reviewBody = typeof body.reviewBody === "string" ? body.reviewBody.trim() : "";
    if (reviewBody.length < 10) {
      return NextResponse.json(
        { error: "Please provide a review with at least 10 characters sharing your residency experience." },
        { status: 400 },
      );
    }

    const authorName =
      body.isAnonymous || !body.authorName || !body.authorName.trim()
        ? "Anonymous Resident"
        : body.authorName.trim();

    const reviewTitle =
      typeof body.reviewTitle === "string" && body.reviewTitle.trim()
        ? body.reviewTitle.trim()
        : null;

    const repo = getResidencyRankingRepository();
    const result = await repo.recordReview({
      profileId: id,
      authorName,
      reviewTitle,
      reviewBody,
      ratingScore,
      source: "Missa Community Resident Report",
    });

    return NextResponse.json({
      success: true,
      message: "Your resident review has been submitted and incorporated into the Missa Residency Index!",
      reviewId: result.reviewId,
      newRating: result.newRating,
      newTotalScore: result.newTotalScore,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit review" },
      { status: 500 },
    );
  }
}
