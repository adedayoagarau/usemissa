// Decision recording for scripts/dedupe-organizations.mjs.
//
// Every merge pair is recorded in data_decisions as an
// identity.same_organization decision, and every regex "junk" deletion as an
// identity.is_arts_organization decision, so a merge or purge can always be
// traced back. The name-key / regex rule is recorded as a `heuristic` row;
// when JEV_API_KEY is set, Jev is asked the same question and recorded too.
//
// Jev only gates an action with --require-decision: then a merge needs a
// confident live "same organization" answer and a purge a confident live
// "not an arts organization" answer (scope DECISIONS_MODE_ORGANIZATION_DEDUP).
// In shadow mode nothing is actionable, so --require-decision skips every
// merge and purge. Without the flag the script merges and purges as before.

export const DECISION_SCOPE = "organization_dedup";
export const MERGE_HEURISTIC = "dedupe-organizations:name-key";
export const JUNK_HEURISTIC = "dedupe-organizations:junk-regex";

/** Loads @missa/decisions when it is built; null otherwise. */
export async function loadDecisions() {
  try {
    return await import("@missa/decisions");
  } catch {
    return null;
  }
}

function organizationFacts(row) {
  return {
    name: row.name ?? null,
    website: row.website_url ?? null,
    kind: row.profile_kind ?? null,
  };
}

/**
 * @param {object} input
 * @param {typeof import("@missa/decisions")} input.decisions
 * @param {import("@missa/decisions").JevClient} input.client
 * @param {import("@missa/decisions").DecisionLedger | undefined} input.ledger  omit for dry runs
 * @param {"shadow" | "live"} input.mode
 * @param {boolean} input.requireDecision
 * @param {Pick<Console, "warn">} [input.logger]
 */
export function createOrganizationDedupeDecider({
  decisions,
  client,
  ledger,
  mode,
  requireDecision,
  logger = console,
}) {
  const {
    decide,
    inputHash,
    identityPairSubjectId,
    isArtsOrganization,
    organizationIdentityState,
    questionOptions,
    sameOrganization,
    sameOrganizationState,
  } = decisions;

  async function record(rows) {
    if (!ledger || rows.length === 0) return;
    try {
      await ledger.record(rows);
    } catch (error) {
      logger.warn(
        `   ⚠ Could not record decisions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async function ask(definition, subjectId, state) {
    // A dry run asks Jev only when the answer would change what is merged.
    if (!client.available || (!ledger && !requireDecision)) return null;
    const result = await decide({
      client,
      ledger,
      mode,
      subjectId,
      state,
      questions: [definition],
    });
    if (result.error) logger.warn(`   ⚠ Jev: ${result.error}`);
    return result.outcomes[definition.key] ?? null;
  }

  function heuristic(
    definition,
    subjectId,
    state,
    answer,
    route,
    acted,
    decider,
  ) {
    return {
      subjectType: definition.subjectType,
      subjectId,
      fieldName: null,
      questionKey: definition.key,
      questionVersion: definition.version,
      questionKind: definition.question.type,
      options: questionOptions(definition),
      inputHash: inputHash(state),
      answer,
      probability: null,
      confidence: null,
      distribution: {},
      route,
      // The heuristic row is live only when the script acted on it.
      mode: acted ? "live" : "shadow",
      deciderKind: "heuristic",
      decider,
      policyVersion: decider,
    };
  }

  return {
    /** Returns whether the duplicate may be merged into the canonical profile. */
    async mergePair(canonical, duplicate) {
      const subjectId = identityPairSubjectId(canonical.id, duplicate.id);
      const state = sameOrganizationState(
        organizationFacts(canonical),
        organizationFacts(duplicate),
      );
      const outcome = await ask(sameOrganization, subjectId, state);
      const merge =
        !requireDecision ||
        (outcome?.route === "apply" && outcome.actionable === true);
      await record([
        heuristic(
          sameOrganization,
          subjectId,
          state,
          "true",
          "apply",
          merge,
          MERGE_HEURISTIC,
        ),
      ]);
      return { merge, outcome };
    },

    /** Returns whether a regex-matched junk profile may be deleted. */
    async junkProfile(row) {
      const state = organizationIdentityState(organizationFacts(row));
      const outcome = await ask(isArtsOrganization, row.id, state);
      const purge =
        !requireDecision ||
        (outcome?.route === "reject" && outcome.actionable === true);
      await record([
        heuristic(
          isArtsOrganization,
          row.id,
          state,
          "false",
          "reject",
          purge,
          JUNK_HEURISTIC,
        ),
      ]);
      return { purge, outcome };
    },
  };
}
