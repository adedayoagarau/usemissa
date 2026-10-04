import { randomUUID } from "node:crypto";
import type {
  DecisionMode,
  DecisionOutcome,
  QuestionDefinition,
} from "./types.js";

/** Anything with a pg-style query method: a Pool, a PoolClient or a test fake. */
export interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

export type DeciderKind = "jev" | "llm" | "heuristic" | "human" | "source";

export interface DecisionRecord {
  subjectType: string;
  subjectId: string;
  fieldName?: string | null;
  questionKey: string;
  questionVersion: number;
  questionKind: string;
  options?: string[] | null;
  inputHash: string;
  evidenceUrl?: string | null;
  answer: string | null;
  probability: number | null;
  confidence: number | null;
  distribution: Record<string, number>;
  route: string;
  mode: DecisionMode;
  deciderKind: DeciderKind;
  decider: string;
  deciderVersion?: string | null;
  policyVersion?: string | null;
  reviewerAccountId?: string | null;
  supersedesId?: string | null;
  usage?: Record<string, unknown> | null;
}

export interface DecisionLedger {
  /** Returns the ids written; a decision already recorded for the same input is skipped. */
  record(records: DecisionRecord[]): Promise<string[]>;
}

export function questionOptions(
  definition: QuestionDefinition,
): string[] | null {
  const { question } = definition;
  if (question.type === "choice") return Object.keys(question.criteria);
  if (question.type === "score") return [...question.criteria];
  return ["true", "false"];
}

export function decisionRecordFromOutcome(input: {
  definition: QuestionDefinition;
  outcome: DecisionOutcome;
  subjectId: string;
  inputHash: string;
  mode: DecisionMode;
  model: string;
  evidenceUrl?: string | null;
  usage?: Record<string, unknown> | null;
}): DecisionRecord {
  const { definition, outcome } = input;
  return {
    subjectType: definition.subjectType,
    subjectId: input.subjectId,
    fieldName: definition.fieldName ?? null,
    questionKey: definition.key,
    questionVersion: definition.version,
    questionKind: definition.question.type,
    options: questionOptions(definition),
    inputHash: input.inputHash,
    evidenceUrl: input.evidenceUrl ?? null,
    answer: outcome.answer,
    probability: outcome.probability,
    confidence: outcome.confidence,
    distribution: outcome.distribution,
    route: outcome.route,
    mode: input.mode,
    deciderKind: "jev",
    decider: "jev",
    deciderVersion: input.model,
    policyVersion: `${definition.key}@${definition.version}`,
    usage: input.usage ?? null,
  };
}

const COLUMNS = [
  "id",
  "subject_type",
  "subject_id",
  "field_name",
  "question_key",
  "question_version",
  "question_kind",
  "options",
  "input_hash",
  "evidence_url",
  "answer",
  "probability",
  "confidence",
  "distribution",
  "route",
  "mode",
  "decider_kind",
  "decider",
  "decider_version",
  "policy_version",
  "reviewer_account_id",
  "supersedes_id",
  "usage",
] as const;

function round(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10_000) / 10_000;
}

/** Writes to data_decisions (migration 0088). */
export function createPostgresDecisionLedger(db: Queryable): DecisionLedger {
  return {
    async record(records) {
      if (records.length === 0) return [];
      const values: unknown[] = [];
      const rows = records.map((record) => {
        const row = [
          `dec_${randomUUID()}`,
          record.subjectType,
          record.subjectId,
          record.fieldName ?? null,
          record.questionKey,
          record.questionVersion,
          record.questionKind,
          record.options ?? null,
          record.inputHash,
          record.evidenceUrl ?? null,
          record.answer,
          round(record.probability),
          round(record.confidence),
          JSON.stringify(record.distribution ?? {}),
          record.route,
          record.mode,
          record.deciderKind,
          record.decider,
          record.deciderVersion ?? null,
          record.policyVersion ?? null,
          record.reviewerAccountId ?? null,
          record.supersedesId ?? null,
          record.usage ? JSON.stringify(record.usage) : null,
        ];
        const placeholders = row.map((value) => {
          values.push(value);
          return `$${values.length}`;
        });
        return `(${placeholders.join(", ")})`;
      });
      const result = await db.query(
        `INSERT INTO data_decisions (${COLUMNS.join(", ")})
         VALUES ${rows.join(",\n")}
         ON CONFLICT (subject_type, subject_id, question_key, question_version, decider, input_hash)
           WHERE decider_kind <> 'human'
           DO NOTHING
         RETURNING id`,
        values,
      );
      return result.rows.map((row) => String((row as { id: unknown }).id));
    },
  };
}

/** Keeps records in memory; for tests, dry runs and evaluation scripts. */
export function createMemoryDecisionLedger(): DecisionLedger & {
  records: DecisionRecord[];
} {
  const records: DecisionRecord[] = [];
  const seen = new Set<string>();
  return {
    records,
    async record(incoming) {
      const ids: string[] = [];
      for (const record of incoming) {
        const key = [
          record.subjectType,
          record.subjectId,
          record.questionKey,
          record.questionVersion,
          record.decider,
          record.inputHash,
        ].join("|");
        if (record.deciderKind !== "human" && seen.has(key)) continue;
        seen.add(key);
        records.push(record);
        ids.push(`mem_${records.length}`);
      }
      return ids;
    },
  };
}
