import { NextResponse } from "next/server";

import { getOpportunityRepository } from "@/lib/opportunityRepository";
import { safeAuthRedirect } from "@/lib/authRedirect";
import {
  createFirstSaveIntent,
  FIRST_SAVE_INTENT_COOKIE,
  firstSaveCookieOptions,
  firstSaveContext,
  signFirstSaveIntent,
  verifyFirstSaveIntent,
} from "@/lib/firstSaveIntent";
import { trackFirstSaveEvent } from "@/lib/firstSaveAnalytics";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const opportunityId =
    body && typeof body.opportunityId === "string" ? body.opportunityId : "";
  if (!/^[A-Za-z0-9_-]{1,200}$/u.test(opportunityId)) {
    return NextResponse.json(
      { error: "Choose an Opportunity to save." },
      { status: 400, headers: noStore },
    );
  }

  try {
    const opportunity = await getOpportunityRepository().getById(opportunityId);
    if (!opportunity || ["closed", "archived"].includes(opportunity.status)) {
      return NextResponse.json(
        {
          status: "blocked",
          error: "This Opportunity is no longer available to save.",
        },
        { status: 409, headers: noStore },
      );
    }
    const canonicalPath = `/opportunities/${opportunity.slug}`;
    const requestedReturn =
      body && typeof body.returnTo === "string"
        ? safeAuthRedirect(body.returnTo)
        : canonicalPath;
    const returnTo = requestedReturn.startsWith("/opportunities/")
      ? requestedReturn
      : canonicalPath;
    const intent = createFirstSaveIntent(opportunity, returnTo);
    const response = NextResponse.json(
      {
        status: "created",
        authPath: `/signup?next=${encodeURIComponent(returnTo)}`,
        context: firstSaveContext(intent),
      },
      { status: 201, headers: noStore },
    );
    response.cookies.set(
      FIRST_SAVE_INTENT_COOKIE,
      signFirstSaveIntent(intent),
      firstSaveCookieOptions(),
    );
    await Promise.all([
      trackFirstSaveEvent({
        eventName: "discovery.opportunity_save_intent_created",
        journeyId: intent.journeyId,
        transition: "save-intent-created",
        opportunityId: opportunity.id,
        snapshotFingerprint: intent.materialFingerprint,
      }),
      trackFirstSaveEvent({
        eventName: "auth.authentication_required",
        journeyId: intent.journeyId,
        transition: "authentication-required",
        opportunityId: opportunity.id,
      }),
    ]);
    return response;
  } catch {
    return NextResponse.json(
      {
        error:
          "We could not hold this Save request. The Opportunity is unchanged. Try again.",
      },
      { status: 503, headers: noStore },
    );
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const outcome = url.searchParams.get("outcome");
  const journeyId = url.searchParams.get("journeyId");
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${FIRST_SAVE_INTENT_COOKIE}=`))
    ?.slice(FIRST_SAVE_INTENT_COOKIE.length + 1);
  let decodedToken: string | undefined;
  try {
    decodedToken = token ? decodeURIComponent(token) : undefined;
  } catch {
    decodedToken = undefined;
  }
  const intent = verifyFirstSaveIntent(decodedToken);
  if (journeyId && intent && intent.journeyId !== journeyId) {
    return NextResponse.json(
      { cleared: false, reason: "journey-mismatch" },
      { status: 409, headers: noStore },
    );
  }
  const response = NextResponse.json({ cleared: true }, { headers: noStore });
  response.cookies.set(FIRST_SAVE_INTENT_COOKIE, "", firstSaveCookieOptions(0));
  if (intent && outcome !== "completed") {
    await trackFirstSaveEvent({
      eventName: "journey.abandoned",
      journeyId: intent.journeyId,
      transition: "intent-cleared",
      opportunityId: intent.context.opportunityId,
      reason: outcome === "declined" ? "customer-declined" : "intent-cleared",
    });
  }
  return response;
}
