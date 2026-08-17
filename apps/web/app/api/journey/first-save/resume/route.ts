import { NextResponse } from "next/server";

import { getSessionAccount } from "@/lib/auth";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import {
  bindFirstSaveIntent,
  compareFirstSaveMaterial,
  createFirstSaveCompletionToken,
  FIRST_SAVE_INTENT_COOKIE,
  firstSaveMaterialFingerprint,
  firstSaveMaterialSnapshot,
  firstSaveNextAction,
  firstSaveCookieOptions,
  signFirstSaveIntent,
  verifyFirstSaveIntent,
} from "@/lib/firstSaveIntent";
import { trackFirstSaveEvent } from "@/lib/firstSaveAnalytics";
import {
  opportunityCanBeSaved,
  saveOpportunityForAccount,
} from "@/lib/saveOpportunityToTracker";
import type { FirstSaveReceipt } from "@/lib/firstSaveTypes";

const noStore = { "Cache-Control": "no-store" };

function cookieValue(request: Request): string | undefined {
  const encoded = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${FIRST_SAVE_INTENT_COOKIE}=`))
    ?.slice(FIRST_SAVE_INTENT_COOKIE.length + 1);
  if (!encoded) return undefined;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) {
    return NextResponse.json(
      { error: "Log in to continue saving this Opportunity." },
      { status: 401, headers: noStore },
    );
  }
  const postgresTracker =
    process.env.MISSA_OPPORTUNITY_REPOSITORY?.trim() === "postgres" &&
    Boolean(process.env.DATABASE_URL);
  if (!session.account.userId && !postgresTracker) {
    return NextResponse.json(
      {
        error:
          "Your account is available, but Tracker is not ready. Your Save request is still available. Try again.",
      },
      { status: 409, headers: noStore },
    );
  }

  const intent = verifyFirstSaveIntent(cookieValue(request));
  if (!intent) {
    return NextResponse.json(
      { status: "expired", restartPath: "/opportunities" },
      { status: 410, headers: noStore },
    );
  }
  const body = await request.json().catch(() => ({}));
  const expectedJourneyId =
    body && typeof body.expectedJourneyId === "string"
      ? body.expectedJourneyId
      : undefined;
  const expectedOpportunityId =
    body && typeof body.expectedOpportunityId === "string"
      ? body.expectedOpportunityId
      : undefined;
  if (
    expectedJourneyId !== intent.journeyId ||
    expectedOpportunityId !== intent.context.opportunityId
  ) {
    return NextResponse.json(
      {
        error:
          "This Save request changed in another tab. Return to the Opportunity and choose Save again.",
      },
      { status: 409, headers: noStore },
    );
  }
  if (intent.boundAccountId && intent.boundAccountId !== session.account.id) {
    return NextResponse.json(
      {
        error:
          "This Save request belongs to a different signed-in account. Return to the Opportunity and choose Save again.",
      },
      { status: 409, headers: noStore },
    );
  }
  if (!intent.boundAccountId) {
    const response = NextResponse.json(
      { status: "binding" },
      { status: 202, headers: noStore },
    );
    response.cookies.set(
      FIRST_SAVE_INTENT_COOKIE,
      signFirstSaveIntent(bindFirstSaveIntent(intent, session.account.id)),
      firstSaveCookieOptions(),
    );
    return response;
  }
  const acknowledgedFingerprint =
    body && typeof body.acknowledgedFingerprint === "string"
      ? body.acknowledgedFingerprint
      : undefined;

  try {
    const opportunity = await getOpportunityRepository().getById(
      intent.context.opportunityId,
    );
    if (!opportunity) {
      return NextResponse.json(
        {
          status: "blocked",
          opportunityId: intent.context.opportunityId,
          title: intent.context.title,
          reason: "removed",
        },
        { status: 409, headers: noStore },
      );
    }

    const currentMaterial = firstSaveMaterialSnapshot(opportunity);
    const currentFingerprint = firstSaveMaterialFingerprint(currentMaterial);
    const changes = compareFirstSaveMaterial(intent.material, currentMaterial);
    await Promise.all([
      trackFirstSaveEvent({
        eventName: "auth.authentication_succeeded",
        journeyId: intent.journeyId,
        transition: "authentication-succeeded",
        opportunityId: opportunity.id,
        accountId: session.account.id,
      }),
      trackFirstSaveEvent({
        eventName: "journey.intent_revalidated",
        journeyId: intent.journeyId,
        transition: `intent-revalidated:${currentFingerprint.slice(0, 16)}`,
        opportunityId: opportunity.id,
        accountId: session.account.id,
        snapshotFingerprint: currentFingerprint,
        result: changes.length ? "changed" : "current",
      }),
    ]);

    if (!opportunityCanBeSaved(opportunity)) {
      return NextResponse.json(
        {
          status: "blocked",
          opportunityId: opportunity.id,
          title: opportunity.title,
          reason: "closed",
          currentPath: `/opportunities/${opportunity.slug}`,
        },
        { status: 409, headers: noStore },
      );
    }

    if (changes.length && acknowledgedFingerprint !== currentFingerprint) {
      await trackFirstSaveEvent({
        eventName: "journey.material_change_presented",
        journeyId: intent.journeyId,
        transition: `material-change-presented:${currentFingerprint.slice(0, 16)}`,
        opportunityId: opportunity.id,
        accountId: session.account.id,
        snapshotFingerprint: currentFingerprint,
        changeCodes: changes.map((change) => change.code),
      });
      return NextResponse.json(
        {
          status: "review-required",
          journeyId: intent.journeyId,
          opportunityId: opportunity.id,
          title: opportunity.title,
          organizationName: opportunity.organizationName,
          currentFingerprint,
          changes,
          currentPath: `/opportunities/${opportunity.slug}`,
        },
        { status: 409, headers: noStore },
      );
    }

    const saved = await saveOpportunityForAccount(session, opportunity);
    const nextAction = firstSaveNextAction(opportunity);
    const completion = createFirstSaveCompletionToken({
      journeyId: intent.journeyId,
      accountId: session.account.id,
      opportunityId: opportunity.id,
    });
    const receipt: FirstSaveReceipt = {
      journeyId: intent.journeyId,
      accountId: session.account.id,
      opportunityId: opportunity.id,
      title: opportunity.title,
      ...(opportunity.organizationName
        ? { organizationName: opportunity.organizationName }
        : {}),
      result: saved.status,
      privateState: true,
      expiresAt: completion.expiresAt,
      completionToken: completion.token,
      nextAction,
    };
    const saveEvents = [
      trackFirstSaveEvent({
        eventName:
          saved.status === "created"
            ? "tracker.opportunity_created"
            : "tracker.opportunity_already_saved",
        journeyId: intent.journeyId,
        transition: `tracker-${saved.status}`,
        opportunityId: opportunity.id,
        accountId: session.account.id,
        result: saved.status,
      }),
      ...(saved.status === "already-present"
        ? [
            trackFirstSaveEvent({
              eventName: "journey.state_recovered",
              journeyId: intent.journeyId,
              transition: "canonical-state-recovered",
              opportunityId: opportunity.id,
              accountId: session.account.id,
              result: saved.status,
            }),
          ]
        : []),
    ];
    if (saved.status === "created") {
      saveEvents.push(
        trackFirstSaveEvent({
          eventName: "discovery.opportunity_saved",
          journeyId: intent.journeyId,
          transition: "opportunity-saved-signal",
          opportunityId: opportunity.id,
          accountId: session.account.id,
          snapshotFingerprint: currentFingerprint,
          result: saved.status,
        }),
      );
    }
    await Promise.all(saveEvents);
    return NextResponse.json(
      { status: saved.status, receipt },
      { status: saved.status === "created" ? 201 : 200, headers: noStore },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "We could not finish saving this Opportunity. Your Save request is still available. Try again.",
      },
      { status: 503, headers: noStore },
    );
  }
}
