import type { DedupIdentityDecider } from "@missa/radar-engine";
import {
  createPostgresDecisionLedger,
  decide,
  identityPairSubjectId,
  jevClientFromEnv,
  sameOpportunity,
  sameOpportunityState,
  type DecisionLedger,
  type JevClient,
  type Queryable,
} from "@missa/decisions";

/**
 * Records a shadow Jev same_opportunity decision for each pair the radar
 * engine's dedup left unmerged (see findDedupNearMisses). It never changes a
 * match: the engine ignores the result. Subjects pair the candidate's source
 * id with the existing opportunity id, since a candidate has no id yet.
 */
export function createDedupIdentityDecider(deps: {
  client: JevClient;
  ledger?: DecisionLedger;
  logger?: Pick<Console, "warn">;
}): DedupIdentityDecider {
  const logger = deps.logger ?? console;
  return async (candidate, nearMisses) => {
    for (const nearMiss of nearMisses) {
      const existing = nearMiss.opportunity;
      const result = await decide({
        client: deps.client,
        ledger: deps.ledger,
        mode: "shadow",
        subjectId: identityPairSubjectId(
          `source:${candidate.sourceId}`,
          existing.id,
        ),
        state: sameOpportunityState(
          {
            title: candidate.title,
            organization: candidate.organizationName,
            urls: [
              candidate.url,
              candidate.officialUrl,
              candidate.submissionUrl,
            ],
            deadline: candidate.deadline.date ?? candidate.deadline.raw,
            type: candidate.type,
          },
          {
            title: existing.fields.title,
            organization: existing.fields.organizationName,
            urls: [existing.sourceUrl, existing.fields.submissionUrl],
            deadline:
              existing.fields.deadline.date ?? existing.fields.deadline.raw,
            type: existing.fields.type,
          },
        ),
        questions: [sameOpportunity],
        evidenceUrl: candidate.url,
      });
      if (result.error)
        logger.warn(`[radar-dedup] identity shadow decision: ${result.error}`);
    }
  };
}

/** Undefined unless JEV_API_KEY is set, so the engine skips near-miss work entirely. */
export function dedupIdentityDeciderFromEnv(
  db: Queryable,
  env: Record<string, string | undefined> = process.env,
): DedupIdentityDecider | undefined {
  const client = jevClientFromEnv(env);
  if (!client.available) return undefined;
  return createDedupIdentityDecider({
    client,
    ledger: createPostgresDecisionLedger(db),
  });
}
