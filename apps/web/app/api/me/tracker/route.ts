import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  creatorRelationalAuthorityEnabled,
  CreatorIdempotencyConflictError,
} from "@missa/radar-adapters";

import { getSessionAccount } from "@/lib/auth";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import {
  firstSaveMaterialFingerprint,
  firstSaveMaterialSnapshot,
  firstSaveNextAction,
  createFirstSaveCompletionToken,
} from "@/lib/firstSaveIntent";
import { trackFirstSaveEvent } from "@/lib/firstSaveAnalytics";
import {
  opportunityCanBeSaved,
  saveOpportunityForAccount,
} from "@/lib/saveOpportunityToTracker";
import type { FirstSaveReceipt } from "@/lib/firstSaveTypes";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers: noStore },
    );
  }
  const postgresTracker =
    creatorRelationalAuthorityEnabled(process.env) &&
    Boolean(process.env.DATABASE_URL);
  if (!session.account.userId && !postgresTracker) {
    return NextResponse.json(
      {
        error:
          "Your account is available, but Tracker is not ready. Try again.",
      },
      { status: 409, headers: noStore },
    );
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.opportunityId !== "string" ||
    !/^[A-Za-z0-9_-]{1,200}$/u.test(body.opportunityId)
  ) {
    return NextResponse.json(
      { error: "Choose an Opportunity to save." },
      { status: 400, headers: noStore },
    );
  }

  const requestedJourneyId =
    typeof body.journeyId === "string" &&
    /^[0-9a-f-]{36}$/iu.test(body.journeyId)
      ? body.journeyId
      : undefined;
  const journeyId = requestedJourneyId ?? randomUUID();
  try {
    const opportunity = await getOpportunityRepository().getById(
      body.opportunityId,
    );
    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404, headers: noStore },
      );
    }
    if (!opportunityCanBeSaved(opportunity)) {
      return NextResponse.json(
        {
          error:
            "This Opportunity is closed. It was not added to your Tracker.",
        },
        { status: 409, headers: noStore },
      );
    }

    const snapshotFingerprint = firstSaveMaterialFingerprint(
      firstSaveMaterialSnapshot(opportunity),
    );
    await Promise.all([
      trackFirstSaveEvent({
        eventName: "discovery.opportunity_save_intent_created",
        journeyId,
        transition: "authenticated-save-intent-created",
        opportunityId: opportunity.id,
        accountId: session.account.id,
        snapshotFingerprint,
      }),
      trackFirstSaveEvent({
        eventName: "journey.intent_revalidated",
        journeyId,
        transition: "authenticated-intent-revalidated",
        opportunityId: opportunity.id,
        accountId: session.account.id,
        snapshotFingerprint,
        result: "current",
      }),
    ]);

    const saved = await saveOpportunityForAccount(session, opportunity, journeyId);
    const nextAction = firstSaveNextAction(opportunity);
    const completion = createFirstSaveCompletionToken({
      journeyId,
      accountId: session.account.id,
      opportunityId: opportunity.id,
    });
    const receipt: FirstSaveReceipt = {
      journeyId,
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
        journeyId,
        transition: `tracker-${saved.status}`,
        opportunityId: opportunity.id,
        accountId: session.account.id,
        result: saved.status,
      }),
    ];
    if (saved.status === "created") {
      saveEvents.push(
        trackFirstSaveEvent({
          eventName: "discovery.opportunity_saved",
          journeyId,
          transition: "opportunity-saved-signal",
          opportunityId: opportunity.id,
          accountId: session.account.id,
          snapshotFingerprint,
          result: saved.status,
        }),
      );
    }
    await Promise.all(saveEvents);

    return NextResponse.json(
      {
        status: saved.status,
        tracked: { opportunityId: opportunity.id, ...(saved.revision ? { revision: saved.revision } : {}) },
        replayed: saved.replayed ?? false,
        ...(saved.receiptId ? { receiptId: saved.receiptId } : {}),
        receipt,
      },
      {
        status: saved.status === "created" && !saved.replayed ? 201 : 200,
        headers: noStore,
      },
    );
  } catch (error) {
    if (error instanceof CreatorIdempotencyConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: noStore },
      );
    }
    return NextResponse.json(
      {
        error:
          "We could not save this Opportunity. Your Tracker is unchanged. Try again.",
      },
      { status: 503, headers: noStore },
    );
  }
}
