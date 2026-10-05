import type { DecisionLedger, DecisionMode, JevClient } from "@missa/decisions";

/** What a workspace check needs to ask Jev and record the answers. */
export interface WorkspaceDecisionContext {
  client: JevClient;
  /** Omit to decide without recording. */
  ledger?: DecisionLedger;
  /** From decisionModeFromEnv(scope); anything but live only records. */
  mode: DecisionMode;
}

/**
 * Decision scopes the workspace reads. Set DECISIONS_MODE_<SCOPE>=live to let
 * a scope act; every other scope only records.
 */
export const WORKSPACE_DECISION_SCOPES = {
  /** May stop a decision-letter batch before sending. */
  decisionEmailCheck: "decision_email_check",
  /** May fill CSV columns the alias rules left unmapped. */
  importColumnMapping: "import_column_mapping",
  /** Advisory only. */
  submissionTriage: "submission_triage",
  reviewerConflict: "reviewer_conflict",
  reviewConsistency: "review_consistency",
  guidelineClauses: "guideline_clauses",
  claimQueue: "claim_queue",
} as const;

/** Runs work over items with at most `limit` in flight, keeping order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  work: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      for (;;) {
        const index = next;
        next += 1;
        if (index >= items.length) return;
        results[index] = await work(items[index]!, index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}
