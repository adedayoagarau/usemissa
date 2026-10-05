/**
 * Column mapping for the workspace CSV importers. Alias rules map a header to
 * an importer field first. A mapping the organization sends always wins, and
 * Jev may only suggest a field for a column the alias rules left unmapped
 * (scope `import_column_mapping`). The organization sees every column with
 * where its mapping came from and can change any of them before committing.
 */
import {
  decide,
  importColumnState,
  openCallImportColumnTarget,
  submissionImportColumnTarget,
  type QuestionDefinition,
} from "@missa/decisions";
import {
  mapWithConcurrency,
  type WorkspaceDecisionContext,
} from "./decisionContext.js";

/** Importer field → header aliases, in priority order. */
export type ImportTargets = Record<string, readonly string[]>;

/** Normalized header → importer field, or "ignore". */
export type ImportColumnMapping = Record<string, string>;

export type ImportColumnSource = "alias" | "suggested" | "organization";

export interface ImportColumn {
  header: string;
  key: string;
  target: string | null;
  source: ImportColumnSource | null;
}

export type ImportKind = "submission" | "open_call";

export const SUBMISSION_IMPORT_TARGETS = {
  openCall: [
    "open call",
    "opportunity",
    "call",
    "title",
    "open call title",
    "program",
  ],
  submitterEmail: [
    "submitter email",
    "email",
    "applicant email",
    "applicant email address",
    "email address",
  ],
  workTitle: [
    "work title",
    "work",
    "submission title",
    "entry title",
    "entry name",
  ],
  submittedAt: [
    "submitted at",
    "submission date",
    "date",
    "created time",
    "timestamp",
  ],
  status: ["status", "decision"],
} as const satisfies ImportTargets;

export const OPEN_CALL_IMPORT_TARGETS = {
  title: ["title", "open call", "opportunity", "open call title", "name"],
  team: ["team", "entity", "department", "team / department"],
  program: ["program", "imprint", "category", "program / category"],
  status: ["status", "state"],
  radarOpportunityId: ["radar opportunity id", "opportunity id"],
} as const satisfies ImportTargets;

export const IMPORT_COLUMN_IGNORE = "ignore";

export function importHeaderKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("Unclosed quote in CSV row");
  cells.push(cell.trim());
  return cells;
}

/**
 * Header index for every target. With no overrides this is exactly the alias
 * rule the importers have always used: the first alias, in priority order,
 * that appears among the headers. A header the overrides name is taken out of
 * alias matching; a header the overrides map to a target fills that target.
 */
export function resolveTargetIndexes(
  headers: string[],
  targets: ImportTargets,
  overrides?: ImportColumnMapping,
): Record<string, number | undefined> {
  const indexes: Record<string, number | undefined> = {};
  for (const [target, aliases] of Object.entries(targets)) {
    const explicit = overrides
      ? headers.findIndex((header) => overrides[header] === target)
      : -1;
    if (explicit >= 0) {
      indexes[target] = explicit;
      continue;
    }
    indexes[target] = aliases
      .map(importHeaderKey)
      .map((alias) =>
        headers.findIndex(
          (header) =>
            header === alias &&
            !(overrides && Object.hasOwn(overrides, header)),
        ),
      )
      .find((candidate) => candidate >= 0);
  }
  return indexes;
}

/** Keeps only entries that name a known target or "ignore". */
export function sanitizeImportColumnMapping(
  value: unknown,
  targets: ImportTargets,
): ImportColumnMapping {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const mapping: ImportColumnMapping = {};
  for (const [header, target] of Object.entries(value)) {
    if (
      typeof target === "string" &&
      (target === IMPORT_COLUMN_IGNORE || Object.hasOwn(targets, target))
    ) {
      mapping[importHeaderKey(header)] = target;
    }
  }
  return mapping;
}

export function importTargetsFor(kind: ImportKind): ImportTargets {
  return kind === "submission"
    ? SUBMISSION_IMPORT_TARGETS
    : OPEN_CALL_IMPORT_TARGETS;
}

function importQuestionFor(kind: ImportKind): QuestionDefinition {
  return kind === "submission"
    ? submissionImportColumnTarget
    : openCallImportColumnTarget;
}

function readCsvSample(csv: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = csv
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const rows: string[][] = [];
  for (const line of lines.slice(1, 4)) {
    try {
      rows.push(parseCsvLine(line));
    } catch {
      /* a broken row is reported by the plan, not here */
    }
  }
  return { headers: parseCsvLine(lines[0]!), rows };
}

/**
 * Every column with the field it fills and where that mapping came from:
 * "organization" for the organization's own choice, "suggested" for a Jev
 * suggestion the caller accepted, "alias" for the alias rules.
 */
export function describeImportColumns(
  csv: string,
  kind: ImportKind,
  mapping: ImportColumnMapping = {},
  suggested: ImportColumnMapping = {},
): ImportColumn[] {
  const { headers } = readCsvSample(csv);
  const keys = headers.map(importHeaderKey);
  const indexes = resolveTargetIndexes(keys, importTargetsFor(kind), mapping);
  return headers.map((header, index) => {
    const key = keys[index]!;
    const target =
      Object.entries(indexes).find(([, value]) => value === index)?.[0] ?? null;
    const chosen = Object.hasOwn(mapping, key);
    const source: ImportColumnSource | null = chosen
      ? suggested[key] === mapping[key]
        ? "suggested"
        : "organization"
      : target
        ? "alias"
        : null;
    return {
      header,
      key,
      target: target ?? (chosen ? mapping[key]! : null),
      source,
    };
  });
}

export interface ImportColumnSuggestions {
  /** Live, confident suggestions for unmapped columns only. Empty in shadow. */
  mapping: ImportColumnMapping;
  /** Columns asked about, for logging. */
  asked: number;
  errors: string[];
}

/**
 * Asks Jev which field each column the alias rules left unmapped holds, from
 * its header and three sample values. Returns only live, confident answers
 * for fields nothing else fills; two columns claiming one field are both left
 * unmapped. Never throws.
 */
export async function suggestImportColumnMapping(
  context: WorkspaceDecisionContext,
  input: {
    kind: ImportKind;
    csv: string;
    organizationId: string;
    /** The organization's own mapping; those columns are never asked about. */
    organizationMapping?: ImportColumnMapping;
    maxColumns?: number;
  },
): Promise<ImportColumnSuggestions> {
  const result: ImportColumnSuggestions = { mapping: {}, asked: 0, errors: [] };
  try {
    const targets = importTargetsFor(input.kind);
    const { headers, rows } = readCsvSample(input.csv);
    const keys = headers.map(importHeaderKey);
    const organizationMapping = input.organizationMapping ?? {};
    const indexes = resolveTargetIndexes(keys, targets, organizationMapping);
    const used = new Set(
      Object.values(indexes).filter(
        (value): value is number => value !== undefined,
      ),
    );
    const openTargets = new Set(
      Object.keys(targets).filter((target) => indexes[target] === undefined),
    );
    if (openTargets.size === 0) return result;
    const unmapped = keys
      .map((key, index) => ({ key, index }))
      .filter(
        ({ key, index }) =>
          key &&
          !used.has(index) &&
          !Object.hasOwn(organizationMapping, key) &&
          keys.indexOf(key) === index,
      )
      .slice(0, input.maxColumns ?? 30);
    if (unmapped.length === 0) return result;

    const question = importQuestionFor(input.kind);
    const claims = new Map<string, string[]>();
    await mapWithConcurrency(unmapped, 4, async ({ key, index }) => {
      result.asked += 1;
      const decision = await decide({
        client: context.client,
        ledger: context.ledger,
        mode: context.mode,
        subjectId: `${input.organizationId}:${input.kind}:${key}`,
        state: importColumnState(
          headers[index]!,
          rows.map((row) => row[index] ?? ""),
        ),
        questions: [question],
      });
      if (decision.error) result.errors.push(decision.error);
      const outcome = decision.outcomes[question.key];
      if (
        outcome?.actionable &&
        outcome.route === "apply" &&
        outcome.answer &&
        openTargets.has(outcome.answer)
      ) {
        claims.set(outcome.answer, [
          ...(claims.get(outcome.answer) ?? []),
          key,
        ]);
      }
    });
    for (const [target, columns] of claims) {
      if (columns.length === 1) result.mapping[columns[0]!] = target;
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }
  return result;
}
