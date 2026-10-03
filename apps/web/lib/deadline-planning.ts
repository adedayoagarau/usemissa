/**
 * The planning engine over the creator obligation ledger: default plans on
 * save, chain recalculation when a source deadline moves, and obligations
 * after acceptance.
 *
 * Slice C owns this module. The Foundation commit wires it into the save hook
 * and the creator tick with these signatures.
 */

export type DefaultPlanResult = { created: number; skipped?: string };
export type ChainRecalculationResult = { processed: number; moved: number };

/** Called after a call is saved to the Tracker. Never throws for missing data. */
export async function applyDefaultPlan(_accountId: string, _opportunityId: string): Promise<DefaultPlanResult> {
  return { created: 0, skipped: "not-implemented" };
}

/** Move anchored obligations whose source deadline changed. Runs after the official-deadline sweep. */
export async function recalculateObligationChains(_accountId?: string): Promise<ChainRecalculationResult> {
  return { processed: 0, moved: 0 };
}
