import { NextResponse } from "next/server";
import { z } from "zod";
import {
  creatorCommandEnvelope,
  CreatorConflictError,
  CreatorCommandValidationError,
  CreatorIdempotencyConflictError,
} from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import {
  CreatorRecommendationRepository,
  RecommendationValidationError,
} from "@/lib/creator-recommendations";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return json({ error: "Sign in to see your recommendations." }, 401);
  try {
    const p = new URL(request.url).searchParams,
      repo = new CreatorRecommendationRepository();
    if (p.has("choices")) return json(await repo.choices(session.account.id));
    const feed = await repo.feed(session.account.id, {
      goalId: p.get("goal") || undefined,
      workId: p.get("work") || undefined,
      mode: p.get("mode") === "plan" ? "plan" : "now",
      page: Math.max(0, Math.min(500, Math.floor(Number(p.get("page")) || 0))),
      dismissed: p.get("dismissed") === "1",
    });
    const projections = feed.items.length
      ? (
          await getOpportunityRepository().browse(
            {
              ids: feed.items.map((i) => i.id),
              limit: 24,
              sort: "soonest-deadline",
            },
            { accountId: session.account.id },
          )
        ).items
      : [];
    return json({
      ...feed,
      items: feed.items.flatMap((match) => {
        const opportunity = projections.find(
          (p) => p.id === match.id || p.id === `opp_${match.id}`,
        );
        return opportunity ? [{ ...match, opportunity }] : [];
      }),
    });
  } catch (e) {
    return json(
      {
        error:
          e instanceof RecommendationValidationError
            ? e.message
            : "Recommendations could not load. Try again.",
      },
      e instanceof RecommendationValidationError ? 404 : 503,
    );
  }
}
const feedback = z.object({
  opportunityId: z.string().min(1).max(200),
  goalId: z.string().min(1).max(200).optional(),
  workId: z.string().min(1).max(200).optional(),
  revision: z.number().int().min(0),
  hidden: z.boolean(),
  reason: z.enum([
    "not-relevant",
    "wrong-discipline",
    "not-eligible",
    "fee",
    "timing",
    "already-applied",
    "other",
  ]),
});
export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return json({ error: "Sign in to manage recommendations." }, 401);
  const input = feedback.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return json({ error: "Choose an opportunity and feedback reason." }, 400);
  try {
    const receipt = await new CreatorRecommendationRepository().feedback(
      creatorCommandEnvelope(
        session.account.id,
        "recommendation.feedback",
        request.headers.get("Idempotency-Key") ?? "",
        input.data,
        Math.max(1, input.data.revision),
      ),
      input.data,
    );
    return json({ receipt });
  } catch (e) {
    const conflict =
      e instanceof CreatorConflictError ||
      e instanceof CreatorIdempotencyConflictError;
    return json(
      {
        error: conflict
          ? "This suggestion changed. Refresh before trying again."
          : e instanceof RecommendationValidationError
            ? e.message
            : "Feedback could not be saved. Try again.",
      },
      conflict ? 409 : e instanceof CreatorCommandValidationError ? 400 : 503,
    );
  }
}
