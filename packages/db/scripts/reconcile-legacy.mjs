import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for legacy reconciliation");

const dryRun = process.argv.includes("--dry-run");
const targetSchema = process.env.MISSA_DB_SCHEMA ?? "public";
const migrationSchema = process.env.MISSA_MIGRATION_SCHEMA ?? (targetSchema === "public" ? "drizzle" : `${targetSchema}_drizzle`);

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(targetSchema) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(migrationSchema)) {
  throw new Error("MISSA_DB_SCHEMA and MISSA_MIGRATION_SCHEMA must be simple SQL identifiers");
}

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "../migrations");
const journal = JSON.parse(fs.readFileSync(path.join(migrationsDir, "meta/_journal.json"), "utf8"));

const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;
const table = (name) => `${quote(targetSchema)}.${quote(name)}`;
const migrationTable = `${quote(migrationSchema)}.${quote("__drizzle_migrations")}`;

const baselineTables = {
  radar_accounts: ["id", "email", "data", "created_at", "updated_at"],
  audit_events: ["id", "account_id", "organization_id", "action", "target_type", "target_id", "detail", "created_at"],
  entities: ["id", "organization_id", "name", "label", "created_at", "updated_at"],
  radar_memberships: ["account_id", "organization_id", "role", "data", "created_at", "updated_at"],
  open_calls: ["id", "program_id", "title", "status", "radar_opportunity_id", "created_at", "updated_at", "published_at"],
  radar_organizations: ["id", "data", "created_at", "updated_at"],
  outbox_events: ["id", "topic", "aggregate_type", "aggregate_id", "payload", "status", "attempts", "available_at", "locked_at", "processed_at", "last_error", "created_at"],
  programs: ["id", "entity_id", "name", "created_at", "updated_at"],
  review_assignments: ["id", "review_round_id", "submission_id", "reviewer_account_id", "created_at", "completed_at"],
  review_recommendations: ["review_assignment_id", "score", "notes", "recorded_at", "updated_at"],
  review_rounds: ["id", "open_call_id", "name", "created_at", "updated_at"],
  submission_paths: ["id", "open_call_id", "categories", "fields", "fee_cents", "created_at", "updated_at"],
  submissions: ["id", "submission_path_id", "submitter_account_id", "status", "submitted_at", "updated_at"],
  works: ["id", "submission_id", "title", "file_url", "order", "created_at", "updated_at"],
  opportunities: ["id", "slug", "title", "organization_id", "source_id", "status", "publication_state", "type", "discipline", "genres", "open_date", "deadline_date", "deadline_time", "deadline_timezone", "deadline_kind", "fee_status", "fee_cents", "fee_currency", "prize", "location", "simultaneous_allowed", "guidelines_url", "submission_url", "submission_host", "submission_verified_at", "submission_state", "search_document", "source_checked_at", "processing_succeeded_at", "last_changed_at", "created_at", "updated_at"],
  opportunity_sources: ["id", "organization_id", "name", "url", "kind", "active", "last_checked_at", "last_successful_fetch_at", "last_processed_at", "created_at", "updated_at"],
  opportunity_changes: ["id", "opportunity_id", "kind", "field", "old_value", "new_value", "source_snapshot_id", "created_at"],
  opportunity_eligibility_rules: ["id", "opportunity_id", "rule_key", "description", "value", "certainty", "sort_order", "created_at"],
  opportunity_identity_assets: ["id", "opportunity_id", "url", "alt", "kind", "rights_status", "source_url", "width", "height", "created_at"],
  opportunity_issue_reports: ["id", "account_id", "opportunity_id", "reason", "note", "status", "idempotency_key", "created_at", "updated_at"],
  opportunity_preferences: ["account_id", "types", "disciplines", "genres", "locations", "career_stages", "max_fee_cents", "no_fee_only", "deadline_within_days", "simultaneous_required", "created_at", "updated_at"],
  opportunity_required_materials: ["id", "opportunity_id", "label", "description", "required", "limit", "sort_order", "created_at"],
  opportunity_slug_aliases: ["id", "opportunity_id", "slug", "created_at"],
  opportunity_source_evidence: ["id", "opportunity_id", "source_id", "kind", "name", "url", "checked_at", "processing_succeeded_at", "organization_confirmed", "verified_until", "created_at"],
  opportunity_versions: ["id", "opportunity_id", "source_snapshot_id", "fields", "created_at"],
  organization_follows: ["account_id", "organization_id", "created_at"],
  saved_searches: ["id", "account_id", "name", "criteria", "include_in_digest", "last_matched_at", "created_at", "updated_at"],
  submission_outbound_events: ["id", "account_id", "opportunity_id", "destination_host", "destination_state", "created_at"],
  tracked_opportunities: ["id", "account_id", "opportunity_id", "status", "tracked_at", "updated_at"],
  tracked_status_events: ["id", "tracked_opportunity_id", "from_status", "to_status", "source", "idempotency_key", "created_at"],
  profiles: ["id", "account_id", "pronouns", "location", "bio", "disciplines", "genres", "career_stage", "languages", "eligibility", "created_at", "updated_at"],
  profile_preferences: ["profile_id", "locations", "languages", "no_fee_only", "max_fee_cents", "deadline_within_days", "simultaneous_required", "updated_at", "disciplines"],
  profile_privacy: ["profile_id", "public_profile", "show_location", "share_contact", "share_materials_by_default", "updated_at"],
  profile_materials: ["id", "account_id", "kind", "title", "description", "content", "url", "status", "visibility", "created_at", "updated_at", "storage_key", "mime_type", "size_bytes"],
  submission_drafts: ["id", "account_id", "opportunity_id", "status", "note", "created_at", "updated_at", "submitted_at"],
  submission_draft_materials: ["id", "draft_id", "material_id", "kind", "title", "content", "url", "material_updated_at", "created_at"],
};

const client = new Client({ connectionString: databaseUrl });

async function query(sql, values) {
  return client.query(sql, values);
}

async function run(sql, values) {
  await query(sql, values);
}

async function createMissingBaselineRelations() {
  await run(`
    ALTER TABLE ${table("radar_accounts")}
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
  `);
  await run(`
    ALTER TABLE ${table("radar_organizations")}
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
  `);
  await run(`ALTER TABLE ${table("radar_memberships")} ADD COLUMN IF NOT EXISTS role text`);
  await run(`ALTER TABLE ${table("radar_memberships")} ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`);
  await run(`ALTER TABLE ${table("radar_memberships")} ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);
  await run(`UPDATE ${table("radar_memberships")} SET role = COALESCE(NULLIF(data->>'role', ''), 'member') WHERE role IS NULL`);
  await run(`ALTER TABLE ${table("radar_memberships")} ALTER COLUMN role SET DEFAULT 'member'`);
  await run(`ALTER TABLE ${table("radar_memberships")} ALTER COLUMN role SET NOT NULL`);

  await run(`
    CREATE TABLE IF NOT EXISTS ${table("audit_events")} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id text,
      organization_id text,
      action text NOT NULL,
      target_type text NOT NULL,
      target_id text NOT NULL,
      detail jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT audit_events_account_id_radar_accounts_id_fk FOREIGN KEY (account_id) REFERENCES ${table("radar_accounts")}(id) ON DELETE SET NULL,
      CONSTRAINT audit_events_organization_id_radar_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES ${table("radar_organizations")}(id) ON DELETE SET NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS ${table("entities")} (
      id text PRIMARY KEY,
      organization_id text NOT NULL,
      name text NOT NULL,
      label text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT entities_organization_id_radar_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES ${table("radar_organizations")}(id) ON DELETE CASCADE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS ${table("programs")} (
      id text PRIMARY KEY,
      entity_id text NOT NULL,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT programs_entity_id_entities_id_fk FOREIGN KEY (entity_id) REFERENCES ${table("entities")}(id) ON DELETE CASCADE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS ${table("open_calls")} (
      id text PRIMARY KEY,
      program_id text NOT NULL,
      title text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      radar_opportunity_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      published_at timestamptz,
      CONSTRAINT open_calls_status_check CHECK (status in ('draft', 'published', 'closed')),
      CONSTRAINT open_calls_program_id_programs_id_fk FOREIGN KEY (program_id) REFERENCES ${table("programs")}(id) ON DELETE CASCADE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS ${table("submission_paths")} (
      id text PRIMARY KEY,
      open_call_id text NOT NULL,
      categories jsonb NOT NULL,
      fields jsonb NOT NULL,
      fee_cents integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT submission_paths_fee_check CHECK (fee_cents is null or fee_cents >= 0),
      CONSTRAINT submission_paths_open_call_id_open_calls_id_fk FOREIGN KEY (open_call_id) REFERENCES ${table("open_calls")}(id) ON DELETE CASCADE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS ${table("submissions")} (
      id text PRIMARY KEY,
      submission_path_id text NOT NULL,
      submitter_account_id text NOT NULL,
      status text NOT NULL DEFAULT 'submitted',
      submitted_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT submissions_status_check CHECK (status in ('submitted', 'in-review', 'decided', 'withdrawn')),
      CONSTRAINT submissions_submission_path_id_submission_paths_id_fk FOREIGN KEY (submission_path_id) REFERENCES ${table("submission_paths")}(id) ON DELETE RESTRICT,
      CONSTRAINT submissions_submitter_account_id_radar_accounts_id_fk FOREIGN KEY (submitter_account_id) REFERENCES ${table("radar_accounts")}(id) ON DELETE RESTRICT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS ${table("works")} (
      id text PRIMARY KEY,
      submission_id text NOT NULL,
      title text NOT NULL,
      file_url text,
      "order" integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT works_order_check CHECK ("order" >= 0),
      CONSTRAINT works_submission_id_submissions_id_fk FOREIGN KEY (submission_id) REFERENCES ${table("submissions")}(id) ON DELETE CASCADE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS ${table("review_rounds")} (
      id text PRIMARY KEY,
      open_call_id text NOT NULL,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT review_rounds_open_call_id_open_calls_id_fk FOREIGN KEY (open_call_id) REFERENCES ${table("open_calls")}(id) ON DELETE CASCADE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS ${table("review_assignments")} (
      id text PRIMARY KEY,
      review_round_id text NOT NULL,
      submission_id text NOT NULL,
      reviewer_account_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      CONSTRAINT review_assignments_review_round_id_review_rounds_id_fk FOREIGN KEY (review_round_id) REFERENCES ${table("review_rounds")}(id) ON DELETE CASCADE,
      CONSTRAINT review_assignments_submission_id_submissions_id_fk FOREIGN KEY (submission_id) REFERENCES ${table("submissions")}(id) ON DELETE CASCADE,
      CONSTRAINT review_assignments_reviewer_account_id_radar_accounts_id_fk FOREIGN KEY (reviewer_account_id) REFERENCES ${table("radar_accounts")}(id) ON DELETE RESTRICT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS ${table("review_recommendations")} (
      review_assignment_id text PRIMARY KEY,
      score integer,
      notes text,
      recorded_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT review_recommendations_score_check CHECK (score is null or score between 0 and 100),
      CONSTRAINT review_recommendations_review_assignment_id_review_assignments_id_fk FOREIGN KEY (review_assignment_id) REFERENCES ${table("review_assignments")}(id) ON DELETE CASCADE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS ${table("outbox_events")} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      topic text NOT NULL,
      aggregate_type text NOT NULL,
      aggregate_id text NOT NULL,
      payload jsonb NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      attempts integer NOT NULL DEFAULT 0,
      available_at timestamptz NOT NULL DEFAULT now(),
      locked_at timestamptz,
      processed_at timestamptz,
      last_error text,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT outbox_events_status_check CHECK (status in ('pending', 'processing', 'processed', 'failed')),
      CONSTRAINT outbox_events_attempts_check CHECK (attempts >= 0)
    )
  `);
}

async function createMissingIndexesAndChecks() {
  const indexes = [
    `CREATE UNIQUE INDEX IF NOT EXISTS radar_accounts_email_idx ON ${table("radar_accounts")} USING btree (email)`,
    `CREATE INDEX IF NOT EXISTS audit_events_org_created_idx ON ${table("audit_events")} USING btree (organization_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS audit_events_target_idx ON ${table("audit_events")} USING btree (target_type, target_id)`,
    `CREATE INDEX IF NOT EXISTS entities_organization_idx ON ${table("entities")} USING btree (organization_id)`,
    `CREATE INDEX IF NOT EXISTS radar_memberships_org_idx ON ${table("radar_memberships")} USING btree (organization_id)`,
    `CREATE INDEX IF NOT EXISTS open_calls_program_status_idx ON ${table("open_calls")} USING btree (program_id, status)`,
    `CREATE INDEX IF NOT EXISTS outbox_events_pending_idx ON ${table("outbox_events")} USING btree (status, available_at)`,
    `CREATE INDEX IF NOT EXISTS outbox_events_aggregate_idx ON ${table("outbox_events")} USING btree (aggregate_type, aggregate_id)`,
    `CREATE INDEX IF NOT EXISTS programs_entity_idx ON ${table("programs")} USING btree (entity_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS review_assignments_unique_idx ON ${table("review_assignments")} USING btree (review_round_id, submission_id, reviewer_account_id)`,
    `CREATE INDEX IF NOT EXISTS review_assignments_reviewer_idx ON ${table("review_assignments")} USING btree (reviewer_account_id, completed_at)`,
    `CREATE INDEX IF NOT EXISTS review_rounds_open_call_idx ON ${table("review_rounds")} USING btree (open_call_id)`,
    `CREATE INDEX IF NOT EXISTS submission_paths_open_call_idx ON ${table("submission_paths")} USING btree (open_call_id)`,
    `CREATE INDEX IF NOT EXISTS submissions_path_status_idx ON ${table("submissions")} USING btree (submission_path_id, status)`,
    `CREATE INDEX IF NOT EXISTS submissions_submitter_idx ON ${table("submissions")} USING btree (submitter_account_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS works_submission_order_idx ON ${table("works")} USING btree (submission_id, "order")`,
  ];
  for (const statement of indexes) await run(statement);
  await run(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'radar_memberships_role_check') THEN ALTER TABLE ${table("radar_memberships")} ADD CONSTRAINT radar_memberships_role_check CHECK (role in ('member', 'admin')); END IF; END $$`);
}

async function createMissingForeignKeys() {
  const foreignKeys = [
    ["audit_events", "account_id", "radar_accounts", "id", "set null", "audit_events_account_id_radar_accounts_id_fk"],
    ["audit_events", "organization_id", "radar_organizations", "id", "set null", "audit_events_organization_id_radar_organizations_id_fk"],
    ["entities", "organization_id", "radar_organizations", "id", "cascade", "entities_organization_id_radar_organizations_id_fk"],
    ["radar_memberships", "account_id", "radar_accounts", "id", "cascade", "radar_memberships_account_id_radar_accounts_id_fk"],
    ["radar_memberships", "organization_id", "radar_organizations", "id", "cascade", "radar_memberships_organization_id_radar_organizations_id_fk"],
    ["open_calls", "program_id", "programs", "id", "cascade", "open_calls_program_id_programs_id_fk"],
    ["programs", "entity_id", "entities", "id", "cascade", "programs_entity_id_entities_id_fk"],
    ["review_assignments", "review_round_id", "review_rounds", "id", "cascade", "review_assignments_review_round_id_review_rounds_id_fk"],
    ["review_assignments", "submission_id", "submissions", "id", "cascade", "review_assignments_submission_id_submissions_id_fk"],
    ["review_assignments", "reviewer_account_id", "radar_accounts", "id", "restrict", "review_assignments_reviewer_account_id_radar_accounts_id_fk"],
    ["review_recommendations", "review_assignment_id", "review_assignments", "id", "cascade", "review_recommendations_review_assignment_id_review_assignments_id_fk"],
    ["review_rounds", "open_call_id", "open_calls", "id", "cascade", "review_rounds_open_call_id_open_calls_id_fk"],
    ["submission_paths", "open_call_id", "open_calls", "id", "cascade", "submission_paths_open_call_id_open_calls_id_fk"],
    ["submissions", "submission_path_id", "submission_paths", "id", "restrict", "submissions_submission_path_id_submission_paths_id_fk"],
    ["submissions", "submitter_account_id", "radar_accounts", "id", "restrict", "submissions_submitter_account_id_radar_accounts_id_fk"],
    ["works", "submission_id", "submissions", "id", "cascade", "works_submission_id_submissions_id_fk"],
    ["opportunities", "organization_id", "radar_organizations", "id", "set null", "opportunities_organization_id_radar_organizations_id_fk"],
    ["opportunities", "source_id", "opportunity_sources", "id", "restrict", "opportunities_source_id_opportunity_sources_id_fk"],
    ["opportunity_changes", "opportunity_id", "opportunities", "id", "cascade", "opportunity_changes_opportunity_id_opportunities_id_fk"],
    ["opportunity_eligibility_rules", "opportunity_id", "opportunities", "id", "cascade", "opportunity_eligibility_rules_opportunity_id_opportunities_id_fk"],
    ["opportunity_identity_assets", "opportunity_id", "opportunities", "id", "cascade", "opportunity_identity_assets_opportunity_id_opportunities_id_fk"],
    ["opportunity_issue_reports", "account_id", "radar_accounts", "id", "cascade", "opportunity_issue_reports_account_id_radar_accounts_id_fk"],
    ["opportunity_issue_reports", "opportunity_id", "opportunities", "id", "restrict", "opportunity_issue_reports_opportunity_id_opportunities_id_fk"],
    ["opportunity_preferences", "account_id", "radar_accounts", "id", "cascade", "opportunity_preferences_account_id_radar_accounts_id_fk"],
    ["opportunity_required_materials", "opportunity_id", "opportunities", "id", "cascade", "opportunity_required_materials_opportunity_id_opportunities_id_fk"],
    ["opportunity_slug_aliases", "opportunity_id", "opportunities", "id", "cascade", "opportunity_slug_aliases_opportunity_id_opportunities_id_fk"],
    ["opportunity_source_evidence", "opportunity_id", "opportunities", "id", "cascade", "opportunity_source_evidence_opportunity_id_opportunities_id_fk"],
    ["opportunity_source_evidence", "source_id", "opportunity_sources", "id", "restrict", "opportunity_source_evidence_source_id_opportunity_sources_id_fk"],
    ["opportunity_sources", "organization_id", "radar_organizations", "id", "set null", "opportunity_sources_organization_id_radar_organizations_id_fk"],
    ["opportunity_versions", "opportunity_id", "opportunities", "id", "cascade", "opportunity_versions_opportunity_id_opportunities_id_fk"],
    ["organization_follows", "account_id", "radar_accounts", "id", "cascade", "organization_follows_account_id_radar_accounts_id_fk"],
    ["organization_follows", "organization_id", "radar_organizations", "id", "cascade", "organization_follows_organization_id_radar_organizations_id_fk"],
    ["saved_searches", "account_id", "radar_accounts", "id", "cascade", "saved_searches_account_id_radar_accounts_id_fk"],
    ["submission_outbound_events", "account_id", "radar_accounts", "id", "set null", "submission_outbound_events_account_id_radar_accounts_id_fk"],
    ["submission_outbound_events", "opportunity_id", "opportunities", "id", "restrict", "submission_outbound_events_opportunity_id_opportunities_id_fk"],
    ["tracked_opportunities", "account_id", "radar_accounts", "id", "cascade", "tracked_opportunities_account_id_radar_accounts_id_fk"],
    ["tracked_opportunities", "opportunity_id", "opportunities", "id", "restrict", "tracked_opportunities_opportunity_id_opportunities_id_fk"],
    ["tracked_status_events", "tracked_opportunity_id", "tracked_opportunities", "id", "cascade", "tracked_status_events_tracked_opportunity_id_tracked_opportunities_id_fk"],
    ["profile_materials", "account_id", "radar_accounts", "id", "cascade", "profile_materials_account_id_radar_accounts_id_fk"],
    ["profile_preferences", "profile_id", "profiles", "id", "cascade", "profile_preferences_profile_id_profiles_id_fk"],
    ["profile_privacy", "profile_id", "profiles", "id", "cascade", "profile_privacy_profile_id_profiles_id_fk"],
    ["profiles", "account_id", "radar_accounts", "id", "cascade", "profiles_account_id_radar_accounts_id_fk"],
    ["submission_draft_materials", "draft_id", "submission_drafts", "id", "cascade", "submission_draft_materials_draft_id_submission_drafts_id_fk"],
    ["submission_drafts", "account_id", "radar_accounts", "id", "cascade", "submission_drafts_account_id_radar_accounts_id_fk"],
    ["submission_drafts", "opportunity_id", "opportunities", "id", "restrict", "submission_drafts_opportunity_id_opportunities_id_fk"],
  ];

  for (const [fromTable, fromColumn, toTable, toColumn, onDelete, name] of foreignKeys) {
    const existing = await query(
      `SELECT 1 FROM pg_constraint WHERE connamespace = $1::regnamespace AND conrelid = $2::regclass AND confrelid = $3::regclass AND left(conname, 63) = left($4, 63) LIMIT 1`,
      [targetSchema, `${targetSchema}.${fromTable}`, `${targetSchema}.${toTable}`, name],
    );
    if (existing.rowCount) continue;
    await run(`ALTER TABLE ${table(fromTable)} ADD CONSTRAINT ${quote(name)} FOREIGN KEY (${quote(fromColumn)}) REFERENCES ${table(toTable)}(${quote(toColumn)}) ON DELETE ${onDelete}`);
  }
}

async function validateSchema() {
  const names = Object.keys(baselineTables);
  const tables = await query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = ANY($2::text[])`,
    [targetSchema, names],
  );
  const present = new Set(tables.rows.map((row) => row.table_name));
  const missingTables = names.filter((name) => !present.has(name));
  if (missingTables.length) throw new Error(`Reconciliation did not create required tables: ${missingTables.join(", ")}`);

  const columns = await query(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = ANY($2::text[])`,
    [targetSchema, names],
  );
  const found = new Map();
  for (const row of columns.rows) {
    if (!found.has(row.table_name)) found.set(row.table_name, new Set());
    found.get(row.table_name).add(row.column_name);
  }
  const missingColumns = [];
  for (const [name, required] of Object.entries(baselineTables)) {
    for (const column of required) if (!found.get(name)?.has(column)) missingColumns.push(`${name}.${column}`);
  }
  if (missingColumns.length) throw new Error(`Reconciliation found missing columns: ${missingColumns.join(", ")}`);

  const invalidRoles = await query(`SELECT count(*)::int AS count FROM ${table("radar_memberships")} WHERE role NOT IN ('member', 'admin')`);
  if (invalidRoles.rows[0].count !== 0) throw new Error(`Unsupported membership roles remain: ${invalidRoles.rows[0].count}`);

  const fkNames = [
    "audit_events_account_id_radar_accounts_id_fk",
    "audit_events_organization_id_radar_organizations_id_fk",
    "entities_organization_id_radar_organizations_id_fk",
    "radar_memberships_account_id_radar_accounts_id_fk",
    "radar_memberships_organization_id_radar_organizations_id_fk",
    "open_calls_program_id_programs_id_fk",
    "programs_entity_id_entities_id_fk",
    "review_assignments_review_round_id_review_rounds_id_fk",
    "review_assignments_submission_id_submissions_id_fk",
    "review_assignments_reviewer_account_id_radar_accounts_id_fk",
    "review_recommendations_review_assignment_id_review_assignments_id_fk",
    "review_rounds_open_call_id_open_calls_id_fk",
    "submission_paths_open_call_id_open_calls_id_fk",
    "submissions_submission_path_id_submission_paths_id_fk",
    "submissions_submitter_account_id_radar_accounts_id_fk",
    "works_submission_id_submissions_id_fk",
    "opportunities_organization_id_radar_organizations_id_fk",
    "opportunities_source_id_opportunity_sources_id_fk",
    "opportunity_changes_opportunity_id_opportunities_id_fk",
    "opportunity_eligibility_rules_opportunity_id_opportunities_id_fk",
    "opportunity_identity_assets_opportunity_id_opportunities_id_fk",
    "opportunity_issue_reports_account_id_radar_accounts_id_fk",
    "opportunity_issue_reports_opportunity_id_opportunities_id_fk",
    "opportunity_preferences_account_id_radar_accounts_id_fk",
    "opportunity_required_materials_opportunity_id_opportunities_id_fk",
    "opportunity_slug_aliases_opportunity_id_opportunities_id_fk",
    "opportunity_source_evidence_opportunity_id_opportunities_id_fk",
    "opportunity_source_evidence_source_id_opportunity_sources_id_fk",
    "opportunity_sources_organization_id_radar_organizations_id_fk",
    "opportunity_versions_opportunity_id_opportunities_id_fk",
    "organization_follows_account_id_radar_accounts_id_fk",
    "organization_follows_organization_id_radar_organizations_id_fk",
    "saved_searches_account_id_radar_accounts_id_fk",
    "submission_outbound_events_account_id_radar_accounts_id_fk",
    "submission_outbound_events_opportunity_id_opportunities_id_fk",
    "tracked_opportunities_account_id_radar_accounts_id_fk",
    "tracked_opportunities_opportunity_id_opportunities_id_fk",
    "tracked_status_events_tracked_opportunity_id_tracked_opportunities_id_fk",
    "profile_materials_account_id_radar_accounts_id_fk",
    "profile_preferences_profile_id_profiles_id_fk",
    "profile_privacy_profile_id_profiles_id_fk",
    "profiles_account_id_radar_accounts_id_fk",
    "submission_draft_materials_draft_id_submission_drafts_id_fk",
    "submission_drafts_account_id_radar_accounts_id_fk",
    "submission_drafts_opportunity_id_opportunities_id_fk",
  ];
  const constraints = await query(
    `SELECT conname FROM pg_constraint WHERE connamespace = $1::regnamespace`,
    [targetSchema],
  );
  const foundConstraints = new Set(constraints.rows.map((row) => row.conname));
  const missingConstraints = fkNames.filter((name) => !foundConstraints.has(name.slice(0, 63)));
  if (missingConstraints.length) throw new Error(`Reconciliation found missing foreign keys: ${missingConstraints.join(", ")}`);
}

async function recordMigrationBaseline() {
  await run(`CREATE SCHEMA IF NOT EXISTS ${quote(migrationSchema)}`);
  await run(`CREATE TABLE IF NOT EXISTS ${migrationTable} (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)`);
  const existing = await query(`SELECT created_at FROM ${migrationTable} ORDER BY created_at DESC`, []);
  const expected = journal.entries.map((entry) => ({
    when: entry.when,
    file: path.join(migrationsDir, `${entry.tag}.sql`),
  }));
  if (existing.rows.length > 0) {
    const latest = Number(existing.rows[0].created_at);
    const target = expected.at(-1).when;
    if (latest >= target) return;
    throw new Error("Drizzle migration journal is partially populated; reconcile it manually before continuing");
  }
  for (const migration of expected) {
    const hash = crypto.createHash("sha256").update(fs.readFileSync(migration.file)).digest("hex");
    await run(`INSERT INTO ${migrationTable} (hash, created_at) VALUES ($1, $2)`, [hash, migration.when]);
  }
}

async function main() {
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO ${quote(targetSchema)}`);
    await createMissingBaselineRelations();
    await createMissingIndexesAndChecks();
    await createMissingForeignKeys();
    await validateSchema();
    await recordMigrationBaseline();
    if (dryRun) {
      await client.query("ROLLBACK");
      console.log(`Legacy reconciliation dry-run passed for ${targetSchema}; no changes committed.`);
    } else {
      await client.query("COMMIT");
      console.log(`Legacy reconciliation committed for ${targetSchema}; Drizzle baseline is now recorded.`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
