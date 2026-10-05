import { after, NextResponse } from "next/server";
import { getResidencyRankingRepository } from "@/lib/residencyRankingRepository";
import { getSessionAccount } from "@/lib/auth";
import { clientAddress } from "@/lib/auth-rate-limit";
import { submitResidencyReview } from "@/lib/residencyReviewSubmission";
import { creatorDecisionContext, moderateResidencyReview } from "@/lib/creator-decisions";

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
    const session = await getSessionAccount(request.headers.get("cookie"));
    const body = session ? await request.json().catch(() => null) : null;
    const result = await submitResidencyReview({
      residencyId: id,
      body,
      account: session?.account,
      ip: clientAddress(request),
      recordReview: (review) => getResidencyRankingRepository().recordReview(review),
      // Reviews have no hold store yet, so moderation is recorded after the
      // response and never delays or changes publishing. Once a hold store
      // exists, live mode should await this and pass holdReview.
      moderate: async (review) => {
        const decisions = creatorDecisionContext("moderation");
        if (decisions)
          after(() =>
            moderateResidencyReview(decisions, {
              reviewId: review.reviewId,
              title: review.reviewTitle ?? null,
              body: review.reviewBody,
              ratingScore: review.ratingScore,
            }).then(() => undefined, () => undefined),
          );
        return "publish";
      },
    });
    return NextResponse.json(result.body, {
      status: result.status,
      headers: result.retryAfter ? { "Retry-After": String(result.retryAfter) } : undefined,
    });
  } catch (error: unknown) {
    console.error("[POST residency review] Failed to save review:", error);
    return NextResponse.json(
      { error: "We could not save your review. Try again later." },
      { status: 500 },
    );
  }
}
