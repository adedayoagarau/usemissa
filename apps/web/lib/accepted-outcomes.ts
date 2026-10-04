import type { AcceptedOutcome } from "@missa/radar-adapters";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";

/**
 * Acceptances recorded for this account on Missa. Missing workspace tables or a
 * failed read mean nothing can be confirmed — never that everything is.
 */
export async function acceptedOutcomes(
  accountId: string,
): Promise<AcceptedOutcome[]> {
  try {
    return (
      (await getCreatorProfileRepository()?.acceptedOutcomes(accountId)) ?? []
    );
  } catch {
    return [];
  }
}

/** Outcome id → the wording a Confirmed entry must carry. */
export async function verifiedOutcomes(accountId: string) {
  return new Map(
    (await acceptedOutcomes(accountId)).map((item) => [
      item.outcomeId,
      { title: item.workTitle, venue: item.organizationName },
    ]),
  );
}
