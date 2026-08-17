import type { OpportunityDetailProjection } from "@missa/radar-engine";
import { saveCanonicalOpportunityToTracker } from "@missa/radar-adapters";

import type { SessionAccount } from "./auth";
import { getEngine, persistRadar } from "./engine";

export type TrackerSaveResult = {
  status: "created" | "already-present";
};

export function opportunityCanBeSaved(
  opportunity: OpportunityDetailProjection,
): boolean {
  return !["closed", "archived"].includes(opportunity.status);
}

export async function saveOpportunityForAccount(
  session: SessionAccount,
  opportunity: OpportunityDetailProjection,
): Promise<TrackerSaveResult> {
  if (
    process.env.MISSA_OPPORTUNITY_REPOSITORY?.trim() === "postgres" &&
    process.env.DATABASE_URL
  ) {
    const result = await saveCanonicalOpportunityToTracker(
      process.env.DATABASE_URL,
      session.account.id,
      opportunity.id,
    );
    if (!result) throw new Error("Opportunity is not available to save");
    return { status: result.status };
  }

  if (!session.account.userId)
    throw new Error("Tracker account is not available");
  const engine = await getEngine();
  if (!engine.store.opportunities.has(opportunity.id)) {
    throw new Error("Opportunity is not available to save");
  }
  const existing = engine.store.tracked.find(
    (item) =>
      item.userId === session.account.userId &&
      item.opportunityId === opportunity.id,
  );
  engine.trackOpportunity(session.account.userId, opportunity.id);
  await persistRadar();
  return { status: existing ? "already-present" : "created" };
}
