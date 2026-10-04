/**
 * Applies approved database decisions to the fields they answer. Only ledger
 * rows that are live, routed to apply and still proposed are written, only
 * for the question keys declared here, and only where the field still holds
 * nothing (or a value the target names as replaceable). A field a person or
 * source has filled is never overwritten. Each write cites its ledger row in
 * the table's metadata column where one exists, and the ledger row records
 * the value it replaced (data_decisions.applied_from, migration 0091).
 *
 * Prestige tiers and taxonomy disambiguation are deliberately absent: those
 * answers are for people to review, not for this script to apply.
 */
import type { Queryable } from "../ledger.js";
import {
  COUNTRY_QUESTION_KEY,
  COUNTRY_QUESTION_VERSION,
  COUNTRY_WORLDWIDE,
  ELIGIBILITY_RULE_KEYS,
  EDITORIAL_ARCHETYPES,
  MEDIA_CANDIDATE_KINDS,
  MEDIA_SURFACE_KINDS,
  PAYMENT_TYPES,
  PROFILE_KINDS,
  editorialArchetype,
  eligibilityRuleKey,
  isCanonicalEligibilityRuleKey,
  mediaCandidateKind,
  mediaSurfaceKind,
  paymentTypeNormalisation,
  profileKind,
} from "./databaseQuestions.js";

export interface ApplyTarget {
  questionKey: string;
  /** Question versions whose answers may be applied. */
  versions: readonly number[];
  subjectType: string;
  table: string;
  idColumn: string;
  column: string;
  /** SQL over the target row (alias t) that must hold for a write. */
  writableWhen: string;
  /** The stored value for an answer, or null when the answer fills nothing. */
  valueFor(answer: string): string | null;
  /** jsonb column that receives the decision id and the replaced value. */
  provenanceColumn?: string;
  /** Columns filled alongside, each only where it is still null. */
  companions?(value: string): Record<string, string | null>;
  touchesUpdatedAt: boolean;
}

export interface ApplyTargetOptions {
  /** Name for a country code, e.g. countryNameFromCode from @missa/contracts. */
  countryName?: (code: string) => string | null;
}

function sqlList(values: readonly string[]): string {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(", ");
}

/** The allow-list of question key → table.column the apply script may write. */
export function databaseApplyTargets(
  options: ApplyTargetOptions = {},
): Record<string, ApplyTarget> {
  const canonicalRuleKeys = Object.keys(ELIGIBILITY_RULE_KEYS).filter(
    isCanonicalEligibilityRuleKey,
  );
  const targets: ApplyTarget[] = [
    {
      questionKey: COUNTRY_QUESTION_KEY,
      versions: [COUNTRY_QUESTION_VERSION],
      subjectType: "opportunity",
      table: "opportunities",
      idColumn: "id",
      column: "country_code",
      writableWhen: "t.country_code IS NULL",
      valueFor: (answer) =>
        /^[A-Z]{2}$/.test(answer) || answer === COUNTRY_WORLDWIDE
          ? answer
          : null,
      companions: (value) => ({
        country:
          value === COUNTRY_WORLDWIDE
            ? "Worldwide"
            : (options.countryName?.(value) ?? null),
      }),
      touchesUpdatedAt: true,
    },
    {
      questionKey: paymentTypeNormalisation.key,
      versions: [paymentTypeNormalisation.version],
      subjectType: paymentTypeNormalisation.subjectType,
      table: "opportunity_call_profiles",
      idColumn: "opportunity_id",
      column: "payment_type",
      // Only rows whose free text migration 0091 could not place: they hold
      // 'unknown' with the text in metadata.payment_type_previous. Other
      // unknown rows are read from the page by the reading set, not here.
      writableWhen: `t.payment_type = 'unknown' AND t.metadata ? 'payment_type_previous'`,
      valueFor: (answer) =>
        answer !== "unknown" &&
        (PAYMENT_TYPES as readonly string[]).includes(answer)
          ? answer
          : null,
      provenanceColumn: "metadata",
      touchesUpdatedAt: true,
    },
    {
      questionKey: eligibilityRuleKey.key,
      versions: [eligibilityRuleKey.version],
      subjectType: eligibilityRuleKey.subjectType,
      table: "opportunity_eligibility_rules",
      idColumn: "id",
      column: "rule_key",
      writableWhen: `t.rule_key NOT IN (${sqlList(canonicalRuleKeys)})`,
      valueFor: (answer) =>
        isCanonicalEligibilityRuleKey(answer) ? answer : null,
      touchesUpdatedAt: false,
    },
    {
      questionKey: mediaCandidateKind.key,
      versions: [mediaCandidateKind.version],
      subjectType: mediaCandidateKind.subjectType,
      table: "opportunity_media_candidates",
      idColumn: "id",
      column: "candidate_kind",
      writableWhen: "t.candidate_kind = 'unknown'",
      valueFor: (answer) =>
        answer !== "unknown" && Object.hasOwn(MEDIA_CANDIDATE_KINDS, answer)
          ? MEDIA_CANDIDATE_KINDS[answer]!
          : null,
      provenanceColumn: "metadata",
      touchesUpdatedAt: true,
    },
    {
      questionKey: mediaSurfaceKind.key,
      versions: [mediaSurfaceKind.version],
      subjectType: mediaSurfaceKind.subjectType,
      table: "opportunity_identity_assets",
      idColumn: "id",
      column: "kind",
      // Legacy kinds that name no surface; a surface kind is never replaced.
      writableWhen: "t.kind IN ('hero', 'opportunity-cover')",
      valueFor: (answer) =>
        answer !== "unclear" && Object.hasOwn(MEDIA_SURFACE_KINDS, answer)
          ? answer
          : null,
      provenanceColumn: "metadata",
      touchesUpdatedAt: false,
    },
    {
      questionKey: profileKind.key,
      versions: [profileKind.version],
      subjectType: profileKind.subjectType,
      table: "gary_profiles",
      idColumn: "id",
      column: "profile_kind",
      // "organization" is the catch-all; a specific kind is never replaced.
      writableWhen: "t.profile_kind = 'organization'",
      valueFor: (answer) =>
        answer !== "organization" &&
        answer !== "unclear" &&
        Object.hasOwn(PROFILE_KINDS, answer)
          ? answer
          : null,
      touchesUpdatedAt: true,
    },
    {
      questionKey: editorialArchetype.key,
      versions: [editorialArchetype.version],
      subjectType: editorialArchetype.subjectType,
      table: "gary_profile_intelligence",
      idColumn: "profile_id",
      column: "editorial_archetype",
      // Only the column default; written archetypes stay as they are.
      writableWhen: "t.editorial_archetype = 'Unspecified'",
      valueFor: (answer) =>
        answer !== "unspecified" && Object.hasOwn(EDITORIAL_ARCHETYPES, answer)
          ? answer
          : null,
      touchesUpdatedAt: true,
    },
  ];
  return Object.fromEntries(
    targets.map((target) => [target.questionKey, target]),
  );
}

/** A data_decisions row as the apply query returns it. */
export interface ApplyCandidateRow {
  id: string;
  subject_type: string;
  subject_id: string;
  question_key: string;
  question_version: number;
  answer: string | null;
  mode: string;
  route: string;
  status: string;
  /** Later live or human decisions about the same field. */
  newer_count: number | string;
}

export interface PlannedWrite {
  decisionId: string;
  subjectId: string;
  questionKey: string;
  value: string;
  target: ApplyTarget;
}

export interface SkippedDecision {
  decisionId: string;
  questionKey: string;
  reason: string;
}

/**
 * Decides which ledger rows may be applied, without touching the database.
 * The query already filters most of this; the plan re-checks every rule so a
 * looser query can never widen what gets written.
 */
export function planDecisionApplication(
  rows: ApplyCandidateRow[],
  targets: Record<string, ApplyTarget>,
): { writes: PlannedWrite[]; skipped: SkippedDecision[] } {
  const writes: PlannedWrite[] = [];
  const skipped: SkippedDecision[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const skip = (reason: string) =>
      skipped.push({
        decisionId: row.id,
        questionKey: row.question_key,
        reason,
      });
    const target = Object.hasOwn(targets, row.question_key)
      ? targets[row.question_key]
      : undefined;
    if (!target) {
      skip("Question is not on the apply allow-list");
      continue;
    }
    if (row.mode !== "live") {
      skip("Shadow decisions are never applied");
      continue;
    }
    if (row.route !== "apply") {
      skip(`Routed to ${row.route}`);
      continue;
    }
    if (row.status !== "proposed") {
      skip(`Already ${row.status}`);
      continue;
    }
    if (row.subject_type !== target.subjectType) {
      skip(
        `Subject type ${row.subject_type} does not match ${target.subjectType}`,
      );
      continue;
    }
    if (!target.versions.includes(Number(row.question_version))) {
      skip(`Question version ${row.question_version} is not applicable`);
      continue;
    }
    if (Number(row.newer_count) > 0) {
      skip("A later decision about this field exists");
      continue;
    }
    const fieldKey = `${row.question_key}|${row.subject_id}`;
    if (seen.has(fieldKey)) {
      skip("Another decision for this field is applied in this run");
      continue;
    }
    const value = row.answer === null ? null : target.valueFor(row.answer);
    if (value === null) {
      skip(`Answer ${row.answer ?? "(none)"} fills nothing`);
      continue;
    }
    seen.add(fieldKey);
    writes.push({
      decisionId: row.id,
      subjectId: row.subject_id,
      questionKey: row.question_key,
      value,
      target,
    });
  }
  return { writes, skipped };
}

export interface SqlStatement {
  text: string;
  values: unknown[];
}

/** Selects live, approved, still-proposed rows for the given keys. */
export function applyCandidatesQuery(
  questionKeys: string[],
  limit: number,
  subjectIds: string[] | null = null,
): SqlStatement {
  return {
    text: `SELECT d.id, d.subject_type, d.subject_id, d.question_key, d.question_version,
                  d.answer, d.mode, d.route, d.status,
                  (SELECT count(*) FROM data_decisions later
                    WHERE later.subject_type = d.subject_type
                      AND later.subject_id = d.subject_id
                      AND later.question_key = d.question_key
                      AND later.id <> d.id
                      AND later.created_at > d.created_at
                      AND (later.mode = 'live' OR later.decider_kind = 'human')
                  )::int AS newer_count
             FROM data_decisions d
            WHERE d.mode = 'live' AND d.route = 'apply' AND d.status = 'proposed'
              AND d.question_key = ANY($1::text[])
              AND ($3::text[] IS NULL OR d.subject_id = ANY($3::text[]))
            ORDER BY d.created_at, d.id
            LIMIT $2
            FOR UPDATE OF d SKIP LOCKED`,
    values: [questionKeys, limit, subjectIds],
  };
}

/** Checks, without writing, whether the field may still be filled. */
export function writableCheckStatement(write: PlannedWrite): SqlStatement {
  const { target } = write;
  return {
    text: `SELECT t.${target.column}::text AS previous FROM ${target.table} t
            WHERE t.${target.idColumn} = $1 AND (${target.writableWhen})`,
    values: [write.subjectId],
  };
}

/**
 * Writes one answer if the field is still writable, returning the replaced
 * value. Zero rows back means the field was filled meanwhile or the record is
 * gone, and nothing changed.
 */
export function applyWriteStatement(write: PlannedWrite): SqlStatement {
  const { target } = write;
  const values: unknown[] = [write.subjectId, write.value];
  const sets = [`${target.column} = $2`];
  for (const [column, value] of Object.entries(
    target.companions?.(write.value) ?? {},
  )) {
    if (value === null) continue;
    values.push(value);
    sets.push(`${column} = COALESCE(t.${column}, $${values.length})`);
  }
  if (target.provenanceColumn) {
    const column = target.provenanceColumn;
    values.push(`data_decisions:${write.decisionId}`);
    const citation = `$${values.length}::text`;
    // An earlier <column>_previous (for example the original text migration
    // 0091 kept) wins over the value replaced now.
    sets.push(
      `${column} = CASE WHEN previous.value IS NULL THEN '{}'::jsonb
                ELSE jsonb_build_object('${target.column}_previous', previous.value) END
        || COALESCE(t.${column}, '{}'::jsonb)
        || jsonb_build_object('decisions',
             COALESCE(t.${column}->'decisions', '{}'::jsonb)
               || jsonb_build_object('${target.column}', ${citation}))`,
    );
  }
  if (target.touchesUpdatedAt) sets.push("updated_at = now()");
  return {
    text: `WITH previous AS (
             SELECT t.${target.idColumn} AS id, t.${target.column}::text AS value
               FROM ${target.table} t
              WHERE t.${target.idColumn} = $1 AND (${target.writableWhen})
              FOR UPDATE
           )
           UPDATE ${target.table} AS t
              SET ${sets.join(",\n                  ")}
             FROM previous
            WHERE t.${target.idColumn} = previous.id
           RETURNING previous.value AS previous`,
    values,
  };
}

export function markAppliedStatement(
  decisionId: string,
  previous: string | null,
): SqlStatement {
  return {
    text: `UPDATE data_decisions
              SET status = 'applied', applied_at = now(), applied_from = $2, updated_at = now()
            WHERE id = $1 AND status = 'proposed' AND mode = 'live' AND route = 'apply'`,
    values: [decisionId, previous],
  };
}

export interface ApplyResult {
  decisionId: string;
  subjectId: string;
  questionKey: string;
  value: string;
  previous: string | null;
}

export interface ApplyReport {
  dryRun: boolean;
  considered: number;
  /** Written (or, in a dry run, writable). */
  applied: ApplyResult[];
  skipped: SkippedDecision[];
}

/**
 * Applies approved decisions for the given question keys in one transaction.
 * `db` must be a single connection (a PoolClient), not a Pool, so the
 * transaction holds. A dry run reads only and writes nothing.
 */
export async function applyDatabaseDecisions(
  db: Queryable,
  options: {
    targets: Record<string, ApplyTarget>;
    questionKeys: string[];
    dryRun: boolean;
    limit?: number;
    /** Restrict to these subjects (records); all subjects when omitted. */
    subjectIds?: string[];
  },
): Promise<ApplyReport> {
  const unknown = options.questionKeys.filter(
    (key) => !Object.hasOwn(options.targets, key),
  );
  if (unknown.length > 0)
    throw new Error(`Not on the apply allow-list: ${unknown.join(", ")}`);
  if (options.questionKeys.length === 0)
    throw new Error("Name at least one question key to apply");

  const report: ApplyReport = {
    dryRun: options.dryRun,
    considered: 0,
    applied: [],
    skipped: [],
  };
  await db.query("BEGIN");
  try {
    if (options.dryRun) await db.query("SET TRANSACTION READ ONLY");
    const query = applyCandidatesQuery(
      options.questionKeys,
      options.limit ?? 1000,
      options.subjectIds ?? null,
    );
    // FOR UPDATE is refused in a read-only transaction; a dry run only reads.
    const text = options.dryRun
      ? query.text.replace(/\s+FOR UPDATE OF d SKIP LOCKED$/, "")
      : query.text;
    const { rows } = await db.query(text, query.values);
    const candidates = rows as ApplyCandidateRow[];
    report.considered = candidates.length;
    const plan = planDecisionApplication(candidates, options.targets);
    report.skipped.push(...plan.skipped);

    for (const write of plan.writes) {
      const statement = options.dryRun
        ? writableCheckStatement(write)
        : applyWriteStatement(write);
      const result = await db.query(statement.text, statement.values);
      const row = result.rows[0] as { previous: string | null } | undefined;
      if (!row) {
        report.skipped.push({
          decisionId: write.decisionId,
          questionKey: write.questionKey,
          reason:
            "The field already holds a stated value, or the record is gone",
        });
        continue;
      }
      if (!options.dryRun) {
        const mark = markAppliedStatement(write.decisionId, row.previous);
        await db.query(mark.text, mark.values);
      }
      report.applied.push({
        decisionId: write.decisionId,
        subjectId: write.subjectId,
        questionKey: write.questionKey,
        value: write.value,
        previous: row.previous,
      });
    }
    await db.query(options.dryRun ? "ROLLBACK" : "COMMIT");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
  return report;
}
