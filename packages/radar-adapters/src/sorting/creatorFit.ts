import {
  createPostgresDecisionLedger,
  creatorFitProfileState,
  creatorFitQuestion,
  creatorFitState,
  creatorOpportunitySubjectId,
  decide,
  decisionModeFromEnv,
  digestWorthSendingQuestion,
  digestWorthSendingState,
  jevClientFromEnv,
  type CreatorFitOpportunity,
  type CreatorFitProfile,
  type DecisionLedger,
  type DecisionMode,
  type DigestSummaryItem,
  type JevClient,
  type Queryable,
} from "@missa/decisions";
import { isCreatorFitLevel, type CreatorFitLevel } from "@missa/radar-engine";

/**
 * Creator fit (scope `creator_fit`) and digest worth (scope
 * `digest_worth_sending`) are sorting decisions about one creator. Both send
 * the creator's declared practice, so they are creator-private: until
 * JEV_ALLOW_CREATOR_PRIVATE_DATA=1 every call is refused locally, nothing is
 * sent and nothing is recorded.
 *
 * Fit only reorders items already chosen by rules. It is used only when
 * DECISIONS_MODE_CREATOR_FIT=live and the answer is a confident level; in
 * shadow mode it is recorded and the order is untouched. Reasons shown to
 * creators never come from it.
 */
export const CREATOR_FIT_SCOPE = "creator_fit";
export const DIGEST_WORTH_SENDING_SCOPE = "digest_worth_sending";

export interface CreatorFitRanking {
  client: JevClient;
  ledger?: DecisionLedger;
  mode: DecisionMode;
  /** Jev calls in flight at once for one creator. Default 4. */
  concurrency?: number;
  onError?: (error: unknown) => void;
}

/**
 * The digest's ranking, or undefined when Jev is not configured or may not
 * see creator data, so callers skip every extra query and keep today's
 * behaviour exactly.
 */
export function creatorFitRankingFromEnv(
  db: Queryable,
  env: Record<string, string | undefined> = process.env,
): CreatorFitRanking | undefined {
  const client = jevClientFromEnv(env);
  // Both questions are creator-private: without the agreement nothing could be sent.
  if (!client.available || !client.canSend(creatorFitQuestion.dataClass))
    return undefined;
  return {
    client,
    ledger: createPostgresDecisionLedger(db),
    mode: decisionModeFromEnv(CREATOR_FIT_SCOPE, env),
    onError: (error) => console.warn("[creator-fit] decision skipped", error),
  };
}

async function inBatches<T>(
  items: readonly T[],
  size: number,
  run: (item: T) => Promise<void>,
) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(run));
  }
}

/**
 * One decision per creator × opportunity. Returns only confident, actionable
 * levels (live mode, route apply); everything else is left out so callers
 * keep their order. Never throws.
 */
export async function assessCreatorFit(
  ranking: CreatorFitRanking,
  accountId: string,
  profile: CreatorFitProfile,
  opportunities: ReadonlyArray<
    CreatorFitOpportunity & { opportunityId: string }
  >,
): Promise<Map<string, CreatorFitLevel>> {
  const levels = new Map<string, CreatorFitLevel>();
  if (!ranking.client.available) return levels;
  await inBatches(
    opportunities,
    Math.max(1, ranking.concurrency ?? 4),
    async (opportunity) => {
      try {
        const result = await decide({
          client: ranking.client,
          ledger: ranking.ledger,
          mode: ranking.mode,
          subjectId: creatorOpportunitySubjectId(
            accountId,
            opportunity.opportunityId,
          ),
          state: creatorFitState(profile, opportunity),
          questions: [creatorFitQuestion],
        });
        if (result.error) ranking.onError?.(new Error(result.error));
        const outcome = result.outcomes[creatorFitQuestion.key];
        if (
          outcome?.actionable &&
          outcome.route === "apply" &&
          isCreatorFitLevel(outcome.answer)
        ) {
          levels.set(opportunity.opportunityId, outcome.answer);
        }
      } catch (error) {
        ranking.onError?.(error);
      }
    },
  );
  return levels;
}

/**
 * Records whether a digest looks worth sending. Shadow only for now: holding
 * a creator's email back is a product decision that has not been made, so the
 * result is never used to skip delivery. Never throws.
 */
export async function recordDigestWorthSending(
  ranking: CreatorFitRanking,
  subjectId: string,
  profile: CreatorFitProfile,
  digest: {
    newForYou: readonly DigestSummaryItem[];
    closingSoon: readonly DigestSummaryItem[];
    yourDeadlines: readonly DigestSummaryItem[];
  },
): Promise<void> {
  if (!ranking.client.available) return;
  try {
    const result = await decide({
      client: ranking.client,
      ledger: ranking.ledger,
      mode: "shadow",
      subjectId,
      state: digestWorthSendingState(profile, digest),
      questions: [digestWorthSendingQuestion],
    });
    if (result.error) ranking.onError?.(new Error(result.error));
  } catch (error) {
    ranking.onError?.(error);
  }
}

type ProfileRow = {
  disciplines: string[] | null;
  genres: string[] | null;
  types: string[] | null;
  career_stages: string[] | null;
  locations: string[] | null;
  no_fee_only: boolean | null;
  travel_willingness: string | null;
  country_code: string | null;
  city: string | null;
};

/** The creator's declared practice, stage and location; empty when none is saved. */
export async function loadCreatorFitProfile(
  db: Queryable,
  accountId: string,
): Promise<CreatorFitProfile> {
  const result = await db.query(
    `select p.disciplines,p.genres,p.types,p.career_stages,p.locations,p.no_fee_only,p.travel_willingness,
            c.country_code,c.city
       from radar_accounts a
       left join opportunity_preferences p on p.account_id=a.id
       left join creator_profiles c on c.account_id=a.id
      where a.id=$1`,
    [accountId],
  );
  const row = result.rows[0] as ProfileRow | undefined;
  if (!row) return {};
  return {
    disciplines: row.disciplines ?? [],
    genres: row.genres ?? [],
    types: row.types ?? [],
    careerStages: row.career_stages ?? [],
    locations: row.locations ?? [],
    noFeeOnly: row.no_fee_only ?? false,
    travel: row.travel_willingness,
    countryCode: row.country_code,
    city: row.city,
  };
}

/** Is there anything declared to judge fit against? */
export function hasDeclaredPractice(profile: CreatorFitProfile): boolean {
  return Object.keys(creatorFitProfileState(profile)).length > 0;
}
