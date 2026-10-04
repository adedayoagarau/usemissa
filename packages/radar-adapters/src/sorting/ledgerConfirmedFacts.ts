import type { Queryable } from "@missa/decisions";
import type {
  ConfirmedFactsProvider,
  ConfirmedOpportunityFacts,
} from "@missa/radar-engine";

/**
 * Reads confirmed opportunity facts for search from the data_decisions ledger
 * (migration 0088). The reading question set owns these questions; this only
 * consumes what it recorded.
 *
 * A fact counts only when the latest decision for that question is live or
 * applied, not rejected or superseded, and was routed apply or reject. For a
 * yes/no question, "reject" is the confident "no" (probability at or below
 * the reject threshold), which is exactly the case that corrects a keyword
 * false positive such as a reading fee read as a stipend. A newer decision
 * that went to review hides an older confident one: the fact is then
 * unconfirmed and keyword reading decides.
 */
export type ConfirmedFactField = keyof ConfirmedOpportunityFacts;

export const DEFAULT_CONFIRMED_FACT_KEYS: Readonly<
  Record<ConfirmedFactField, string>
> = {
  hasStipend: "opportunity.reading.stipend_paid_to_artist",
  studioProvided: "opportunity.reading.studio_provided",
  housingProvided: "opportunity.reading.housing_provided",
  feeStatus: "opportunity.reading.fee_status",
  emergingOnly: "opportunity.reading.emerging_only",
  internationalOk: "opportunity.reading.international_applicants_accepted",
};

export interface LedgerConfirmedFactsOptions {
  /** Question keys per fact; override when the reading set names them differently. */
  questionKeys?: Partial<Record<ConfirmedFactField, string>>;
  /** How long a lookup (including "nothing confirmed") is reused. Default 5 minutes. */
  ttlMs?: number;
  /** Cache bound; the oldest entries are dropped first. Default 5,000 opportunities. */
  maxEntries?: number;
  now?: () => number;
}

type DecisionRow = {
  subject_id: string;
  question_key: string;
  answer: string | null;
  route: string;
};

const NO_FACTS: ConfirmedOpportunityFacts = Object.freeze({});

function factValue(
  field: ConfirmedFactField,
  answer: string | null,
): ConfirmedOpportunityFacts[ConfirmedFactField] {
  if (field === "feeStatus") {
    // A fee with a waiver is still a fee; "unstated" is not a confirmed status.
    if (answer === "waiver-available") return "paid";
    return answer === "no-fee" || answer === "paid" ? answer : undefined;
  }
  if (answer === "true") return true;
  // The reading questions ask whether the page *states* a rule. A confident
  // "does not state" corrects a keyword false positive for what Missa offers
  // (stipend, studio, housing), but never means a creator is excluded: who may
  // apply is only confirmed when the page states it.
  if (field === "emergingOnly" || field === "internationalOk") return undefined;
  if (answer === "false") return false;
  return undefined;
}

export function createLedgerConfirmedFactsProvider(
  db: Queryable,
  options: LedgerConfirmedFactsOptions = {},
): ConfirmedFactsProvider & { clear(): void } {
  const keys = { ...DEFAULT_CONFIRMED_FACT_KEYS, ...options.questionKeys };
  const fieldFor = new Map<string, ConfirmedFactField>(
    (Object.entries(keys) as Array<[ConfirmedFactField, string]>).map(
      ([field, key]) => [key, field],
    ),
  );
  const ttlMs = options.ttlMs ?? 5 * 60_000;
  const maxEntries = options.maxEntries ?? 5_000;
  const now = options.now ?? Date.now;
  const cache = new Map<
    string,
    { facts: ConfirmedOpportunityFacts; expiresAt: number }
  >();

  function remember(id: string, facts: ConfirmedOpportunityFacts) {
    cache.delete(id);
    cache.set(id, { facts, expiresAt: now() + ttlMs });
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
  }

  return {
    clear: () => cache.clear(),
    async factsFor(opportunityIds) {
      const result = new Map<string, ConfirmedOpportunityFacts>();
      const missing: string[] = [];
      for (const id of new Set(opportunityIds)) {
        const hit = cache.get(id);
        if (hit && hit.expiresAt > now()) {
          if (hit.facts !== NO_FACTS) result.set(id, hit.facts);
        } else {
          missing.push(id);
        }
      }
      if (missing.length === 0) return result;

      const rows = await db.query(
        `select distinct on (subject_id, question_key) subject_id, question_key, answer, route
           from data_decisions
          where subject_type = 'opportunity'
            and subject_id = any($1::text[])
            and question_key = any($2::text[])
            and (mode = 'live' or status = 'applied')
            and status not in ('rejected', 'superseded')
          order by subject_id, question_key, created_at desc, id desc`,
        [missing, [...fieldFor.keys()]],
      );
      const found = new Map<string, ConfirmedOpportunityFacts>();
      for (const row of rows.rows as DecisionRow[]) {
        if (row.route !== "apply" && row.route !== "reject") continue;
        const field = fieldFor.get(row.question_key);
        if (!field) continue;
        const value = factValue(field, row.answer);
        if (value === undefined) continue;
        found.set(row.subject_id, {
          ...found.get(row.subject_id),
          [field]: value,
        });
      }
      for (const id of missing) {
        const facts = found.get(id);
        remember(id, facts ?? NO_FACTS);
        if (facts) result.set(id, facts);
      }
      return result;
    },
  };
}
