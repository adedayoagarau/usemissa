/**
 * Facts about an opportunity that a confident, live decision has confirmed
 * (see the data_decisions ledger). Search reads them through this port so the
 * engine never imports a database: a provider is injected by the caller, and
 * without one search keeps its keyword reading of the stored fields.
 *
 * Every field is optional. A missing field means "not confirmed", never
 * "false": the keyword reading still decides it.
 */
export interface ConfirmedOpportunityFacts {
  hasStipend?: boolean;
  studioProvided?: boolean;
  housingProvided?: boolean;
  feeStatus?: "no-fee" | "paid";
  emergingOnly?: boolean;
  internationalOk?: boolean;
}

export interface ConfirmedFactsProvider {
  /** Returns facts only for opportunities that have any confirmed; others are absent. */
  factsFor(
    opportunityIds: readonly string[],
  ): Promise<ReadonlyMap<string, ConfirmedOpportunityFacts>>;
}

const EMPTY: ReadonlyMap<string, ConfirmedOpportunityFacts> = new Map();

/** Never throws: a failing provider means search falls back to keyword reading. */
export async function loadConfirmedFacts(
  provider: ConfirmedFactsProvider | undefined,
  opportunityIds: readonly string[],
  onError?: (error: unknown) => void,
): Promise<ReadonlyMap<string, ConfirmedOpportunityFacts>> {
  if (!provider || opportunityIds.length === 0) return EMPTY;
  try {
    return await provider.factsFor(opportunityIds);
  } catch (error) {
    onError?.(error);
    return EMPTY;
  }
}
