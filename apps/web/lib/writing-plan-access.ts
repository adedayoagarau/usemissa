import "server-only";
import type { ReadAloudPlan } from "@/lib/writing-read-aloud";
import {
  creatorFeatures,
  creatorPlan,
  creatorPoolFor,
} from "@missa/radar-adapters";

/**
 * Whether the account's plan includes the writing room's planner: cards,
 * plotlines and the corkboard, later the story bible and timeline. Plus and
 * Pro include it; Free does not. Without a database, nothing is included.
 */
export async function plannerIncluded(accountId: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const plan = await creatorPlan(
      creatorPoolFor(process.env.DATABASE_URL),
      accountId,
    );
    return creatorFeatures(plan).writingPlanner;
  } catch {
    return false;
  }
}

/** Read-aloud resolves the authoritative plan; an outage never becomes Free. */
export async function readAloudPlan(accountId: string): Promise<ReadAloudPlan | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const plan = await creatorPlan(creatorPoolFor(process.env.DATABASE_URL), accountId);
    return plan;
  } catch {
    return null;
  }
}
