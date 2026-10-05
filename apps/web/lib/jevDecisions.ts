import pg from "pg";
import { after } from "next/server";
import { missaPostgresPoolConfig } from "@missa/radar-adapters";
import {
  createPostgresDecisionLedger,
  decisionModeFromEnv,
  describeImportColumns,
  jevClientFromEnv,
  sanitizeImportColumnMapping,
  suggestImportColumnMapping,
  importTargetsFor,
  WORKSPACE_DECISION_SCOPES,
  type ImportColumn,
  type ImportColumnMapping,
  type ImportKind,
  type WorkspaceDecisionContext,
} from "@missa/workspace-engine";

const { Pool } = pg;

declare global {
  var __missaDecisionLedgerPool: pg.Pool | undefined;
}

/**
 * The client, ledger and mode for one decision scope. Without JEV_API_KEY no
 * pool is opened and every check comes back unavailable, so routes behave as
 * they always have. Interactive routes use a short timeout and one retry.
 */
export function workspaceDecisionContext(
  scope: string,
  options: { interactive?: boolean } = {},
): WorkspaceDecisionContext {
  const client = jevClientFromEnv(
    process.env,
    options.interactive ? { timeoutMs: 5_000, maxRetries: 1 } : {},
  );
  const mode = decisionModeFromEnv(scope);
  const connectionString = process.env.DATABASE_URL;
  if (!client.available || !connectionString) return { client, mode };
  globalThis.__missaDecisionLedgerPool ??= new Pool({
    ...missaPostgresPoolConfig(connectionString, "short-lived"),
    max: 2,
  });
  return {
    client,
    ledger: createPostgresDecisionLedger(globalThis.__missaDecisionLedgerPool),
    mode,
  };
}

/**
 * Runs a record-only check after the response is sent. A failure is logged
 * and never reaches the person who made the request.
 */
export function recordDecisionsAfterResponse(
  label: string,
  task: () => Promise<{ errors: string[] }>,
): void {
  if (!process.env.JEV_API_KEY) return;
  try {
    after(async () => {
      try {
        const result = await task();
        if (result.errors.length)
          console.warn(`[decisions] ${label}: ${result.errors[0]}`);
      } catch (error) {
        console.warn(`[decisions] ${label}:`, error);
      }
    });
  } catch (error) {
    console.warn(`[decisions] ${label} could not be scheduled:`, error);
  }
}

export interface ResolvedImportMapping {
  /** Empty when neither the organization nor a live suggestion mapped anything. */
  columnMapping: ImportColumnMapping;
  columns?: ImportColumn[];
}

/**
 * The column mapping an organization import uses. The organization's own
 * mapping always wins. In live mode (DECISIONS_MODE_IMPORT_COLUMN_MAPPING)
 * Jev may fill columns the alias rules left unmapped, and the preview returns
 * every column so the organization can see and change it. In shadow mode the
 * suggestions are only recorded, after the response.
 */
export async function resolveImportColumnMapping(input: {
  kind: ImportKind;
  csv: string;
  organizationId: string;
  requestedMapping: unknown;
  /** Record shadow suggestions; only the preview does, so a commit does not ask twice. */
  recordInShadow: boolean;
}): Promise<ResolvedImportMapping> {
  const organizationMapping = sanitizeImportColumnMapping(
    input.requestedMapping,
    importTargetsFor(input.kind),
  );
  const scope = WORKSPACE_DECISION_SCOPES.importColumnMapping;
  const suggestionInput = {
    kind: input.kind,
    csv: input.csv,
    organizationId: input.organizationId,
    organizationMapping,
  };
  let suggested: ImportColumnMapping = {};
  if (decisionModeFromEnv(scope) === "live") {
    const result = await suggestImportColumnMapping(
      workspaceDecisionContext(scope, { interactive: true }),
      suggestionInput,
    );
    if (result.errors.length)
      console.warn(`[decisions] ${scope}: ${result.errors[0]}`);
    suggested = result.mapping;
  } else if (input.recordInShadow) {
    recordDecisionsAfterResponse(scope, () =>
      suggestImportColumnMapping(
        workspaceDecisionContext(scope),
        suggestionInput,
      ),
    );
  }
  const columnMapping = { ...suggested, ...organizationMapping };
  if (Object.keys(columnMapping).length === 0) return { columnMapping };
  return {
    columnMapping,
    columns: describeImportColumns(
      input.csv,
      input.kind,
      columnMapping,
      suggested,
    ),
  };
}
