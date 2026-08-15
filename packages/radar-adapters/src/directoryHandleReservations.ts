import { Pool, type PoolClient } from "pg";
import { normalizeHandle } from "@missa/radar-engine";

export const DIRECTORY_HANDLE_RECOMMENDATION_COLUMNS = [
  "profileId",
  "name",
  "websiteUrl",
  "candidateA",
  "candidateB",
  "decision",
  "reason",
  "officialSocialAccounts",
  "socialUsernames",
  "socialEvidenceUrls",
  "socialConfidence",
  "socialConflicts",
  "unverifiedSocialCandidates",
  "humanReview",
  "humanReviewReason",
  "socialCheckedAt",
  "socialResearchNotes",
  "suggestedHandle",
  "suggestionSource",
  "selectedCandidateField",
  "corroboratingSocialAccounts",
  "suggestionConfidence",
  "suggestionConflicts",
  "suggestionHumanReview",
  "suggestionReason",
] as const;

type RecommendationColumn =
  (typeof DIRECTORY_HANDLE_RECOMMENDATION_COLUMNS)[number];

export interface DirectoryHandleRecommendationRow {
  readonly profileId: string;
  readonly name: string;
  readonly websiteUrl: string;
  readonly candidateA: string;
  readonly candidateB: string;
  readonly decision: string;
  readonly reason: string;
  readonly officialSocialAccounts: string;
  readonly socialUsernames: string;
  readonly socialEvidenceUrls: string;
  readonly socialConfidence: string;
  readonly socialConflicts: string;
  readonly unverifiedSocialCandidates: string;
  readonly humanReview: string;
  readonly humanReviewReason: string;
  readonly socialCheckedAt: string;
  readonly socialResearchNotes: string;
  readonly suggestedHandle: string;
  readonly suggestionSource: string;
  readonly selectedCandidateField: string;
  readonly corroboratingSocialAccounts: string;
  readonly suggestionConfidence: string;
  readonly suggestionConflicts: string;
  readonly suggestionHumanReview: string;
  readonly suggestionReason: string;
}

export type DirectoryHandleReservationDerivation = "name" | "domain" | "both";

export interface DirectoryHandleReservationCandidate {
  readonly profileId: string;
  readonly displayHandle: string;
  readonly derivation: DirectoryHandleReservationDerivation;
}

export interface DirectoryHandleRecommendationExclusion {
  readonly profileId: string;
  readonly name: string;
  readonly suggestedHandle: string;
  readonly reason:
    | "low-confidence"
    | "human-review"
    | "fallback-source"
    | "conflict"
    | "candidate-membership"
    | "invalid-normalization"
    | "duplicate-profile";
}

export interface DirectoryHandleRecommendationSelection {
  readonly candidates: readonly DirectoryHandleReservationCandidate[];
  readonly exclusions: readonly DirectoryHandleRecommendationExclusion[];
}

export interface DirectoryHandleReservationApplyResult {
  readonly attempted: number;
  readonly inserted: number;
  readonly alreadyReserved: number;
  readonly dryRun: boolean;
}

export class DirectoryHandleRecommendationError extends Error {
  readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[] = []) {
    super(message);
    this.name = "DirectoryHandleRecommendationError";
    this.issues = issues;
  }
}

export class DirectoryHandleReservationConflictError extends Error {
  readonly conflicts: readonly string[];

  constructor(conflicts: readonly string[]) {
    super("Directory handle reservation preflight found conflicts.");
    this.name = "DirectoryHandleReservationConflictError";
    this.conflicts = conflicts;
  }
}

function parseCsv(text: string): {
  readonly headers: readonly string[];
  readonly rows: readonly string[][];
} {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (quoted)
    throw new DirectoryHandleRecommendationError("Unterminated CSV quote.");
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift() ?? [];
  return {
    headers,
    rows: rows.filter((currentRow) => currentRow.length > 0),
  };
}

function asRecommendationRow(
  headers: readonly string[],
  values: readonly string[],
  rowNumber: number,
): DirectoryHandleRecommendationRow {
  if (values.length !== headers.length) {
    throw new DirectoryHandleRecommendationError(
      `CSV row ${rowNumber} has ${values.length} columns; expected ${headers.length}.`,
    );
  }
  const record = Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? ""]),
  ) as Partial<Record<RecommendationColumn, string>>;
  return Object.fromEntries(
    DIRECTORY_HANDLE_RECOMMENDATION_COLUMNS.map((column) => [
      column,
      record[column] ?? "",
    ]),
  ) as unknown as DirectoryHandleRecommendationRow;
}

export function parseDirectoryHandleRecommendationsCsv(
  text: string,
): readonly DirectoryHandleRecommendationRow[] {
  const { headers, rows } = parseCsv(text.replace(/^\uFEFF/u, ""));
  const missingColumns = DIRECTORY_HANDLE_RECOMMENDATION_COLUMNS.filter(
    (column) => !headers.includes(column),
  );
  if (missingColumns.length) {
    throw new DirectoryHandleRecommendationError(
      "The final handle recommendation CSV is missing required columns.",
      missingColumns,
    );
  }
  return rows.map((values, index) =>
    asRecommendationRow(headers, values, index + 2),
  );
}

function jsonArray(
  value: string,
  column: string,
  profileId: string,
): readonly unknown[] {
  if (!value.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new DirectoryHandleRecommendationError(
      `Invalid JSON in ${column} for ${profileId}.`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new DirectoryHandleRecommendationError(
      `${column} must be a JSON array for ${profileId}.`,
    );
  }
  return parsed;
}

function candidateTokens(value: string): readonly string[] {
  return value
    .split("|")
    .map((candidate) => candidate.trim())
    .filter(Boolean);
}

function excluded(
  row: DirectoryHandleRecommendationRow,
  reason: DirectoryHandleRecommendationExclusion["reason"],
): DirectoryHandleRecommendationExclusion {
  return {
    profileId: row.profileId,
    name: row.name,
    suggestedHandle: row.suggestedHandle,
    reason,
  };
}

/**
 * Select only conflict-free, high/medium, exact candidate-backed rows.
 * Fallbacks and anything marked for human review are deliberately excluded.
 */
export function selectDirectoryHandleReservations(
  rows: readonly DirectoryHandleRecommendationRow[],
): DirectoryHandleRecommendationSelection {
  const profileCounts = new Map<string, number>();
  const handleCounts = new Map<string, number>();
  for (const row of rows) {
    profileCounts.set(
      row.profileId,
      (profileCounts.get(row.profileId) ?? 0) + 1,
    );
    handleCounts.set(
      row.suggestedHandle,
      (handleCounts.get(row.suggestedHandle) ?? 0) + 1,
    );
  }

  const candidates: DirectoryHandleReservationCandidate[] = [];
  const exclusions: DirectoryHandleRecommendationExclusion[] = [];
  for (const row of rows) {
    if (profileCounts.get(row.profileId) !== 1) {
      exclusions.push(excluded(row, "duplicate-profile"));
      continue;
    }
    if (!row.suggestedHandle) {
      exclusions.push(excluded(row, "candidate-membership"));
      continue;
    }
    if (
      row.suggestionConfidence !== "high" &&
      row.suggestionConfidence !== "medium"
    ) {
      exclusions.push(excluded(row, "low-confidence"));
      continue;
    }
    if (row.suggestionHumanReview !== "false") {
      exclusions.push(excluded(row, "human-review"));
      continue;
    }
    if (
      row.suggestionSource !== "existing-candidateA" &&
      row.suggestionSource !== "existing-candidateB"
    ) {
      exclusions.push(excluded(row, "fallback-source"));
      continue;
    }
    const conflicts = jsonArray(
      row.suggestionConflicts,
      "suggestionConflicts",
      row.profileId,
    );
    if (conflicts.length || handleCounts.get(row.suggestedHandle) !== 1) {
      exclusions.push(excluded(row, "conflict"));
      continue;
    }

    const nameCandidates = candidateTokens(row.candidateA);
    const domainCandidates = candidateTokens(row.candidateB);
    const matchesName = nameCandidates.includes(row.suggestedHandle);
    const matchesDomain = domainCandidates.includes(row.suggestedHandle);
    const selectedSourceMatches =
      (row.suggestionSource === "existing-candidateA" &&
        row.selectedCandidateField === "candidateA") ||
      (row.suggestionSource === "existing-candidateB" &&
        row.selectedCandidateField === "candidateB");
    const selectedFieldMatches =
      (row.selectedCandidateField === "candidateA" && matchesName) ||
      (row.selectedCandidateField === "candidateB" && matchesDomain);
    if (
      !selectedSourceMatches ||
      !selectedFieldMatches ||
      (!matchesName && !matchesDomain)
    ) {
      exclusions.push(excluded(row, "candidate-membership"));
      continue;
    }

    if (normalizeHandle(row.suggestedHandle) !== row.suggestedHandle) {
      exclusions.push(excluded(row, "invalid-normalization"));
      continue;
    }

    candidates.push({
      profileId: row.profileId,
      displayHandle: row.suggestedHandle,
      derivation:
        matchesName && matchesDomain ? "both" : matchesName ? "name" : "domain",
    });
  }

  return { candidates, exclusions };
}

interface ExistingHandleRow {
  readonly handle_key: string;
  readonly subject_type: string;
  readonly subject_id: string;
  readonly state: string;
  readonly reserved_from_profile_id: string | null;
}

interface ExistingAliasRow {
  readonly alias_key: string;
  readonly handle_key: string;
}

function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });
}

async function lockHandleKeys(
  client: PoolClient,
  keys: readonly string[],
): Promise<void> {
  for (const key of [...new Set(keys)].sort()) {
    await client.query(
      "select pg_advisory_xact_lock(hashtextextended($1, 0))",
      [key],
    );
  }
}

/**
 * Apply reservations atomically and idempotently. A conflicting namespace
 * row aborts the whole transaction; this command never silently overwrites a
 * claimed handle or an existing reservation.
 */
export async function reserveDirectoryHandleCandidates(input: {
  readonly connectionString: string;
  readonly candidates: readonly DirectoryHandleReservationCandidate[];
  readonly now?: Date;
  readonly dryRun?: boolean;
}): Promise<DirectoryHandleReservationApplyResult> {
  const pool = createPool(input.connectionString);
  const client = await pool.connect();
  const now = input.now ?? new Date();
  const keys = input.candidates.map((candidate) => candidate.displayHandle);
  const profileIds = input.candidates.map((candidate) => candidate.profileId);

  try {
    await client.query("begin");
    const tableResult = await client.query<{
      handles: string | null;
      aliases: string | null;
    }>(
      `select to_regclass('public.handles') as handles,
              to_regclass('public.handle_aliases') as aliases`,
    );
    if (!tableResult.rows[0]?.handles || !tableResult.rows[0]?.aliases) {
      throw new DirectoryHandleRecommendationError(
        "The handle namespace tables are not available.",
      );
    }

    await lockHandleKeys(client, keys);

    const profiles = await client.query<{ id: string }>(
      `select id from gary_profiles where id = any($1::text[])`,
      [profileIds],
    );
    const existingProfiles = new Set(profiles.rows.map((row) => row.id));
    const missingProfiles = profileIds.filter(
      (profileId) => !existingProfiles.has(profileId),
    );
    if (missingProfiles.length) {
      throw new DirectoryHandleRecommendationError(
        "One or more directory profiles do not exist.",
        missingProfiles,
      );
    }

    const existingHandles = await client.query<ExistingHandleRow>(
      `select handle_key, subject_type, subject_id, state,
              reserved_from_profile_id
         from handles
        where handle_key = any($1::text[])
           or (subject_type = 'directory_profile'
               and subject_id = any($2::text[])
               and state <> 'blocked')`,
      [keys, profileIds],
    );
    const existingAliases = await client.query<ExistingAliasRow>(
      `select alias_key, handle_key
         from handle_aliases
        where alias_key = any($1::text[])`,
      [keys],
    );

    const handlesByKey = new Map<string, ExistingHandleRow>();
    const handlesByProfile = new Map<string, ExistingHandleRow>();
    for (const row of existingHandles.rows) {
      handlesByKey.set(row.handle_key, row);
      if (row.subject_type === "directory_profile" && row.state !== "blocked") {
        handlesByProfile.set(row.subject_id, row);
      }
    }
    const aliasesByKey = new Map(
      existingAliases.rows.map((row) => [row.alias_key, row]),
    );

    const conflicts: string[] = [];
    const alreadyReserved = new Set<string>();
    for (const candidate of input.candidates) {
      const existing = handlesByKey.get(candidate.displayHandle);
      if (existing) {
        if (
          existing.state === "reserved" &&
          existing.subject_type === "directory_profile" &&
          existing.subject_id === candidate.profileId
        ) {
          alreadyReserved.add(candidate.displayHandle);
        } else {
          conflicts.push(
            `${candidate.displayHandle}: occupied by ${existing.subject_type}/${existing.subject_id} (${existing.state})`,
          );
        }
      }
      const alias = aliasesByKey.get(candidate.displayHandle);
      if (alias) {
        conflicts.push(
          `${candidate.displayHandle}: already an alias for ${alias.handle_key}`,
        );
      }
      const profileHandle = handlesByProfile.get(candidate.profileId);
      if (
        profileHandle &&
        profileHandle.handle_key !== candidate.displayHandle
      ) {
        conflicts.push(
          `${candidate.profileId}: already has active handle ${profileHandle.handle_key}`,
        );
      }
    }
    if (conflicts.length)
      throw new DirectoryHandleReservationConflictError(conflicts);

    const toInsert = input.candidates.filter(
      (candidate) => !alreadyReserved.has(candidate.displayHandle),
    );
    if (!input.dryRun) {
      for (const candidate of toInsert) {
        await client.query(
          `insert into handles
             (handle_key, display_handle, subject_type, subject_id, state,
              derivation, reserved_from_profile_id, created_at, updated_at)
           values ($1, $1, 'directory_profile', $2, 'reserved', $3, $2, $4, $4)`,
          [
            candidate.displayHandle,
            candidate.profileId,
            candidate.derivation,
            now,
          ],
        );
      }
    }
    await client.query(input.dryRun ? "rollback" : "commit");
    return {
      attempted: input.candidates.length,
      inserted: toInsert.length,
      alreadyReserved: alreadyReserved.size,
      dryRun: input.dryRun === true,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
