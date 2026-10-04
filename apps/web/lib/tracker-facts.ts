import type { Pool, PoolClient } from "pg";
import { loadDeadlineFacts } from "@missa/radar-adapters";
import type { OpportunityDeadlineFacts } from "@missa/radar-engine";

/**
 * Deadline facts (stages, fee tiers, provenance, forecast) for a call in the
 * creator's own Tracker. Returns undefined when the call is not tracked by
 * this account, and null when it is tracked but Missa has no facts yet (for
 * example before migration 0088 is applied).
 */
export async function trackedDeadlineFacts(
  db: Pool | PoolClient,
  accountId: string,
  opportunityId: string,
): Promise<OpportunityDeadlineFacts | null | undefined> {
  const tracked = await db.query(
    "select 1 from tracked_opportunities where account_id = $1 and opportunity_id = $2 limit 1",
    [accountId, opportunityId],
  );
  if (!tracked.rowCount) return undefined;
  const facts = await loadDeadlineFacts(db, [opportunityId]);
  return facts.get(opportunityId) ?? null;
}
