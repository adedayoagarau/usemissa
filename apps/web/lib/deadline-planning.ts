/**
 * The planning engine over the creator obligation ledger: default plans on
 * save, chain recalculation when a source deadline moves, and obligations
 * after acceptance. The decisions are pure (lib/planning-engine.ts); this
 * module loads what they need and writes through the radar-adapters ledger.
 */
import {
  applyTemplatesForTracked,
  creatorFeatures,
  creatorPlan,
  creatorPoolFor,
  getPlanningPreferences,
  obligationsAvailable,
  planningItemFor,
  plansIncluding,
  recalculateObligationChainsForAccount,
} from "@missa/radar-adapters";
import type { Pool } from "pg";
import { getCreatorNotificationRepository } from "./creatorRepositories";
import { calendarDateIn } from "./deadline-moment";
import { defaultPlanSkipReason, defaultPlanTemplates, exactDeadline } from "./planning-engine";

export type DefaultPlanResult = { created: number; skipped?: string };
export type ChainRecalculationResult = { processed: number; moved: number; notices?: number };

function planningPool(): Pool | undefined {
  return process.env.DATABASE_URL ? creatorPoolFor(process.env.DATABASE_URL) : undefined;
}

/** Today in the creator's own time zone, falling back to UTC. */
export async function creatorToday(accountId: string, now = new Date()): Promise<string> {
  try {
    const zone = (await getCreatorNotificationRepository()?.preferences(accountId))?.timezone || "UTC";
    return calendarDateIn(now, zone);
  } catch {
    return calendarDateIn(now, "UTC");
  }
}

/**
 * Called after a call is saved to the Tracker. On plans with start-by
 * planning, a call in preparation with a confirmed deadline still ahead gets
 * the preparation steps for its type, sized by the creator's own effort
 * estimates, plus a start-by step once weekly hours are known. It runs once
 * per call: a call that already has template steps keeps the plan the
 * creator shaped. Never throws for missing data.
 */
export async function applyDefaultPlan(accountId: string, opportunityId: string): Promise<DefaultPlanResult> {
  const pool = planningPool();
  if (!pool) return { created: 0, skipped: "no-database" };
  if (!(await obligationsAvailable(pool))) return { created: 0, skipped: "not-available" };
  const features = creatorFeatures(await creatorPlan(pool, accountId));
  const today = await creatorToday(accountId);
  const item = await planningItemFor(pool, accountId, { opportunityId });
  const skip = defaultPlanSkipReason(features, item, today);
  if (skip || !item) return { created: 0, skipped: skip ?? "not-tracked" };
  const preferences = await getPlanningPreferences(pool, accountId);
  const templates = defaultPlanTemplates(item.type, preferences, {
    deadline: exactDeadline(item)!,
    personalTargetOn: item.personalTargetOn,
    today,
  });
  const result = await applyTemplatesForTracked(
    pool,
    accountId,
    { trackedOpportunityId: item.trackedOpportunityId },
    templates,
    "deadline",
    { today, onlyWhenEmpty: true },
  );
  return { created: result.created.length, ...(result.skipped ? { skipped: result.skipped } : {}) };
}

/**
 * Move anchored obligations whose source deadline or stage date changed,
 * for accounts whose plan moves the chain automatically. Runs after the
 * official-deadline sweep, which already moves the chains of the deadlines
 * it refreshed; this pass catches every other drift and is idempotent.
 */
export async function recalculateObligationChains(accountId?: string): Promise<ChainRecalculationResult> {
  const pool = planningPool();
  if (!pool) return { processed: 0, moved: 0 };
  return recalculateObligationChainsForAccount(pool, {
    accountId,
    plans: plansIncluding("startByPlanning"),
  });
}
