import { sql } from "drizzle-orm";
import {
  check,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow();

export const accounts = pgTable(
  "radar_accounts",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    data: jsonb("data").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("radar_accounts_email_idx").on(table.email)],
);

export const organizations = pgTable("radar_organizations", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
  createdAt,
  updatedAt,
});

export const memberships = pgTable(
  "radar_memberships",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    data: jsonb("data").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.organizationId] }),
    index("radar_memberships_org_idx").on(table.organizationId),
    check(
      "radar_memberships_role_check",
      sql`${table.role} in ('member', 'admin', 'owner', 'team-admin', 'program-manager', 'reviewer', 'finance', 'legal', 'viewer', 'guest')`,
    ),
  ],
);

export const entities = pgTable(
  "entities",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    label: text("label"),
    createdAt,
    updatedAt,
  },
  (table) => [index("entities_organization_idx").on(table.organizationId)],
);

export const programs = pgTable(
  "programs",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [index("programs_entity_idx").on(table.entityId)],
);

export const openCalls = pgTable(
  "open_calls",
  {
    id: text("id").primaryKey(),
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status").notNull().default("draft"),
    radarOpportunityId: text("radar_opportunity_id"),
    createdAt,
    updatedAt,
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    index("open_calls_program_status_idx").on(table.programId, table.status),
    check(
      "open_calls_status_check",
      sql`${table.status} in ('draft', 'published', 'closed')`,
    ),
  ],
);

export const submissionPaths = pgTable(
  "submission_paths",
  {
    id: text("id").primaryKey(),
    openCallId: text("open_call_id")
      .notNull()
      .references(() => openCalls.id, { onDelete: "cascade" }),
    categories: jsonb("categories").notNull().$type<string[]>(),
    fields: jsonb("fields")
      .notNull()
      .$type<
        Array<{
          id: string;
          type: string;
          label: string;
          required: boolean;
          order: number;
        }>
      >(),
    feeCents: integer("fee_cents"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("submission_paths_open_call_idx").on(table.openCallId),
    check(
      "submission_paths_fee_check",
      sql`${table.feeCents} is null or ${table.feeCents} >= 0`,
    ),
  ],
);

export const submissions = pgTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    submissionPathId: text("submission_path_id")
      .notNull()
      .references(() => submissionPaths.id, { onDelete: "restrict" }),
    submitterAccountId: text("submitter_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    answers: jsonb("answers").$type<Record<string, string | string[]>>(),
    category: text("category"),
    idempotencyKey: text("idempotency_key"),
    paymentSessionId: text("payment_session_id"),
    updatedAt,
  },
  (table) => [
    index("submissions_path_status_idx").on(
      table.submissionPathId,
      table.status,
    ),
    index("submissions_submitter_idx").on(table.submitterAccountId),
    uniqueIndex("submissions_submitter_path_idempotency_idx").on(table.submitterAccountId, table.submissionPathId, table.idempotencyKey),
    check(
      "submissions_status_check",
      sql`${table.status} in ('submitted', 'in-review', 'decided', 'withdrawn')`,
    ),
  ],
);

export const submissionDrafts = pgTable(
  "submission_drafts",
  {
    id: text("id").primaryKey(),
    submissionPathId: text("submission_path_id").notNull().references(() => submissionPaths.id, { onDelete: "cascade" }),
    submitterAccountId: text("submitter_account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    answers: jsonb("answers").notNull().$type<Record<string, string | string[]>>(),
    category: text("category"),
    workTitles: jsonb("work_titles").notNull().$type<string[]>(),
    idempotencyKey: text("idempotency_key"),
    paymentSessionId: text("payment_session_id"),
    updatedAt,
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("submission_drafts_submitter_path_idx").on(table.submitterAccountId, table.submissionPathId), index("submission_drafts_expires_idx").on(table.expiresAt)],
);

export const works = pgTable(
  "works",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    fileUrl: text("file_url"),
    fileUrls: jsonb("file_urls").$type<string[]>(),
    order: integer("order").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("works_submission_order_idx").on(
      table.submissionId,
      table.order,
    ),
    check("works_order_check", sql`${table.order} >= 0`),
  ],
);

export const reviewRounds = pgTable(
  "review_rounds",
  {
    id: text("id").primaryKey(),
    openCallId: text("open_call_id")
      .notNull()
      .references(() => openCalls.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [index("review_rounds_open_call_idx").on(table.openCallId)],
);

export const reviewAssignments = pgTable(
  "review_assignments",
  {
    id: text("id").primaryKey(),
    reviewRoundId: text("review_round_id")
      .notNull()
      .references(() => reviewRounds.id, { onDelete: "cascade" }),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    reviewerAccountId: text("reviewer_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    createdAt,
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("review_assignments_unique_idx").on(
      table.reviewRoundId,
      table.submissionId,
      table.reviewerAccountId,
    ),
    index("review_assignments_reviewer_idx").on(
      table.reviewerAccountId,
      table.completedAt,
    ),
  ],
);

export const reviewRecommendations = pgTable(
  "review_recommendations",
  {
    reviewAssignmentId: text("review_assignment_id")
      .primaryKey()
      .references(() => reviewAssignments.id, { onDelete: "cascade" }),
    score: integer("score"),
    notes: text("notes"),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt,
  },
  (table) => [
    check(
      "review_recommendations_score_check",
      sql`${table.score} is null or ${table.score} between 0 and 100`,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt,
  },
  (table) => [
    index("audit_events_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("audit_events_target_idx").on(table.targetType, table.targetId),
  ],
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topic: text("topic").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt,
  },
  (table) => [
    index("outbox_events_pending_idx").on(table.status, table.availableAt),
    index("outbox_events_aggregate_idx").on(
      table.aggregateType,
      table.aggregateId,
    ),
    check(
      "outbox_events_status_check",
      sql`${table.status} in ('pending', 'processing', 'processed', 'failed')`,
    ),
    check("outbox_events_attempts_check", sql`${table.attempts} >= 0`),
  ],
);

/**
 * Authoritative Opportunities projection. These tables intentionally use
 * names distinct from the legacy `radar_*` JSON snapshot tables so the first
 * migration can be rehearsed as an additive expand/backfill/cutover.
 */
export const opportunitySources = pgTable(
  "opportunity_sources",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    kind: text("kind").notNull(),
    active: boolean("active").notNull().default(true),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastSuccessfulFetchAt: timestamp("last_successful_fetch_at", { withTimezone: true }),
    lastProcessedAt: timestamp("last_processed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("opportunity_sources_org_idx").on(table.organizationId),
    index("opportunity_sources_active_idx").on(table.active, table.lastCheckedAt),
  ],
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    sourceId: text("source_id")
      .notNull()
      .references(() => opportunitySources.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    publicationState: text("publication_state").notNull().default("published"),
    type: text("type").notNull(),
    discipline: text("discipline"),
    genres: text("genres").array().notNull().default(sql`ARRAY[]::text[]`),
    openDate: date("open_date"),
    deadlineDate: date("deadline_date"),
    deadlineTime: timestamp("deadline_time", { withTimezone: true }),
    deadlineTimezone: text("deadline_timezone"),
    deadlineKind: text("deadline_kind").notNull().default("unknown"),
    feeStatus: text("fee_status").notNull().default("unknown"),
    feeCents: integer("fee_cents"),
    feeCurrency: text("fee_currency"),
    prize: text("prize"),
    location: text("location"),
    simultaneousAllowed: boolean("simultaneous_allowed"),
    guidelinesUrl: text("guidelines_url"),
    submissionUrl: text("submission_url"),
    submissionHost: text("submission_host"),
    submissionVerifiedAt: timestamp("submission_verified_at", { withTimezone: true }),
    submissionState: text("submission_state").notNull().default("unknown"),
    searchDocument: text("search_document").notNull().default(""),
    sourceCheckedAt: timestamp("source_checked_at", { withTimezone: true }),
    processingSucceededAt: timestamp("processing_succeeded_at", { withTimezone: true }),
    lastChangedAt: timestamp("last_changed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("opportunities_slug_idx").on(table.slug),
    index("opportunities_public_deadline_idx").on(
      table.publicationState,
      table.status,
      table.deadlineDate,
    ),
    index("opportunities_type_deadline_idx").on(table.type, table.deadlineDate),
    index("opportunities_discipline_idx").on(table.discipline),
    index("opportunities_fee_idx").on(table.feeStatus, table.feeCents),
    index("opportunities_org_status_idx").on(table.organizationId, table.status),
    index("opportunities_verified_idx").on(
      table.publicationState,
      table.sourceCheckedAt,
      table.processingSucceededAt,
    ),
    index("opportunities_recent_idx").on(table.lastChangedAt, table.createdAt),
    check(
      "opportunities_fee_check",
      sql`${table.feeCents} is null or ${table.feeCents} >= 0`,
    ),
    check(
      "opportunities_publication_check",
      sql`${table.publicationState} in ('draft', 'reviewable', 'published', 'suppressed', 'withdrawn')`,
    ),
    check(
      "opportunities_submission_state_check",
      sql`${table.submissionState} in ('available', 'missing', 'changed', 'unsafe', 'closed', 'unknown')`,
    ),
    check(
      "opportunities_status_check",
      sql`${table.status} in ('opening-soon', 'open', 'closing-soon', 'deadline-extended', 'closed', 'archived')`,
    ),
  ],
);

export const opportunityVersions = pgTable(
  "opportunity_versions",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    sourceSnapshotId: text("source_snapshot_id"),
    fields: jsonb("fields").notNull().$type<Record<string, unknown>>(),
    createdAt,
  },
  (table) => [index("opportunity_versions_opp_idx").on(table.opportunityId, table.createdAt)],
);

export const opportunityChanges = pgTable(
  "opportunity_changes",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    field: text("field").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    sourceSnapshotId: text("source_snapshot_id"),
    createdAt,
  },
  (table) => [index("opportunity_changes_opp_idx").on(table.opportunityId, table.createdAt)],
);

export const opportunityEligibilityRules = pgTable(
  "opportunity_eligibility_rules",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    ruleKey: text("rule_key").notNull(),
    description: text("description").notNull(),
    value: text("value"),
    certainty: text("certainty").notNull().default("unknown"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt,
  },
  (table) => [
    index("opportunity_eligibility_opp_idx").on(table.opportunityId, table.sortOrder),
    check(
      "opportunity_eligibility_certainty_check",
      sql`${table.certainty} in ('confirmed', 'inferred', 'unknown')`,
    ),
  ],
);

export const opportunityRequiredMaterials = pgTable(
  "opportunity_required_materials",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description"),
    required: boolean("required").notNull().default(true),
    limit: text("limit"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt,
  },
  (table) => [index("opportunity_materials_opp_idx").on(table.opportunityId, table.sortOrder)],
);

export const opportunitySourceEvidence = pgTable(
  "opportunity_source_evidence",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => opportunitySources.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    processingSucceededAt: timestamp("processing_succeeded_at", { withTimezone: true }),
    organizationConfirmed: boolean("organization_confirmed").notNull().default(false),
    verifiedUntil: timestamp("verified_until", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("opportunity_evidence_opp_idx").on(table.opportunityId, table.checkedAt),
    index("opportunity_evidence_verified_idx").on(table.verifiedUntil),
  ],
);

export const opportunitySlugAliases = pgTable(
  "opportunity_slug_aliases",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex("opportunity_slug_aliases_slug_idx").on(table.slug),
    index("opportunity_slug_aliases_opp_idx").on(table.opportunityId),
  ],
);

export const opportunityIdentityAssets = pgTable(
  "opportunity_identity_assets",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    kind: text("kind").notNull().default("organization-mark"),
    rightsStatus: text("rights_status").notNull().default("unknown"),
    sourceUrl: text("source_url"),
    width: integer("width"),
    height: integer("height"),
    createdAt,
  },
  (table) => [index("opportunity_assets_opp_idx").on(table.opportunityId)],
);

/**
 * Durable evidence enrichment queue. Jobs are leased with SKIP LOCKED by the
 * Railway enrichment worker; evidence is append-only and remains provenance
 * tagged until a reviewer or canonical Radar pass promotes it.
 */
export const radarEnrichmentJobs = pgTable(
  "radar_enrichment_jobs",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    lastError: text("last_error"),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("radar_enrichment_jobs_opp_kind_idx").on(table.opportunityId, table.kind),
    index("radar_enrichment_jobs_ready_idx").on(table.status, table.nextAttemptAt, table.leaseUntil, table.priority),
    check("radar_enrichment_jobs_kind_check", sql`${table.kind} in ('media', 'winners', 'guidelines', 'call-profile')`),
    check("radar_enrichment_jobs_status_check", sql`${table.status} in ('queued', 'processing', 'completed', 'failed', 'blocked')`),
    check("radar_enrichment_jobs_attempts_check", sql`${table.attempts} >= 0`),
    check("radar_enrichment_jobs_priority_check", sql`${table.priority} between -100 and 100`),
  ],
);

export const radarOpportunityEnrichmentEvidence = pgTable(
  "radar_opportunity_enrichment_evidence",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => radarEnrichmentJobs.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    url: text("url").notNull(),
    title: text("title"),
    excerpt: text("excerpt"),
    mediaUrl: text("media_url"),
    confidence: text("confidence").notNull().default("unknown"),
    rightsStatus: text("rights_status").notNull().default("unknown"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt,
  },
  (table) => [
    uniqueIndex("radar_enrichment_evidence_unique_idx").on(table.opportunityId, table.kind, table.url),
    index("radar_enrichment_evidence_opp_idx").on(table.opportunityId, table.kind, table.retrievedAt),
    index("radar_enrichment_evidence_media_idx").on(table.kind, table.mediaUrl),
    check("radar_enrichment_evidence_kind_check", sql`${table.kind} in ('media', 'winner', 'guideline', 'organization')`),
    check("radar_enrichment_evidence_confidence_check", sql`${table.confidence} in ('confirmed', 'probable', 'unknown')`),
    check("radar_enrichment_evidence_rights_check", sql`${table.rightsStatus} in ('unknown', 'review', 'permitted')`),
  ],
);

/** Durable coordination state for the Radar agent graph. Agent runs and
 * handoffs are append-only operational records; they are not user-facing
 * opportunity content. */
export const radarAgentRuns = pgTable(
  "radar_agent_runs",
  {
    id: text("id").primaryKey(),
    agentKind: text("agent_kind").notNull(),
    status: text("status").notNull().default("running"),
    correlationId: text("correlation_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    inputCount: integer("input_count").notNull().default(0),
    outputCount: integer("output_count").notNull().default(0),
    error: text("error"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
  },
  (table) => [
    index("radar_agent_runs_kind_started_idx").on(table.agentKind, table.startedAt),
    check("radar_agent_runs_status_check", sql`${table.status} in ('running', 'completed', 'failed', 'cancelled')`),
  ],
);

export const radarAgentHandoffs = pgTable(
  "radar_agent_handoffs",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull().references(() => radarAgentRuns.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id").references(() => opportunities.id, { onDelete: "cascade" }),
    fromAgent: text("from_agent").notNull(),
    toAgent: text("to_agent").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("queued"),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
    createdAt,
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("radar_agent_handoffs_unique_idx").on(table.runId, table.opportunityId, table.toAgent, table.kind),
    index("radar_agent_handoffs_queue_idx").on(table.toAgent, table.status, table.createdAt),
    check("radar_agent_handoffs_status_check", sql`${table.status} in ('queued', 'processing', 'completed', 'failed', 'blocked')`),
  ],
);

export const radarReviewJobs = pgTable(
  "radar_review_jobs",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id").notNull().unique().references(() => opportunities.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    inputVersion: text("input_version").notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("radar_review_jobs_ready_idx").on(table.status, table.nextAttemptAt, table.leaseUntil, table.priority),
    check("radar_review_jobs_status_check", sql`${table.status} in ('queued', 'processing', 'completed', 'failed', 'needs-human', 'blocked')`),
    check("radar_review_jobs_attempts_check", sql`${table.attempts} >= 0`),
    check("radar_review_jobs_priority_check", sql`${table.priority} between -100 and 100`),
  ],
);

export const radarReviewDecisions = pgTable(
  "radar_review_decisions",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => radarReviewJobs.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    runId: text("run_id").notNull().references(() => radarAgentRuns.id, { onDelete: "cascade" }),
    decision: text("decision").notNull(),
    score: integer("score").notNull().default(0),
    reasons: jsonb("reasons").notNull().default(sql`'[]'::jsonb`).$type<string[]>(),
    checks: jsonb("checks").notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
    createdAt,
  },
  (table) => [
    index("radar_review_decisions_opp_created_idx").on(table.opportunityId, table.createdAt),
    index("radar_review_decisions_run_idx").on(table.runId),
    check("radar_review_decisions_decision_check", sql`${table.decision} in ('publish', 'needs-human', 'suppress', 'error')`),
    check("radar_review_decisions_score_check", sql`${table.score} between 0 and 100`),
  ],
);

export const opportunityCallProfiles = pgTable(
  "opportunity_call_profiles",
  {
    opportunityId: text("opportunity_id")
      .primaryKey()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    callKind: text("call_kind").notNull().default("unknown"),
    marketKind: text("market_kind").notNull().default("unknown"),
    publicationFormats: text("publication_formats").array().notNull().default(sql`ARRAY[]::text[]`),
    acceptedFormats: text("accepted_formats").array().notNull().default(sql`ARRAY[]::text[]`),
    subgenres: text("subgenres").array().notNull().default(sql`ARRAY[]::text[]`),
    readingPeriodKind: text("reading_period_kind").notNull().default("unknown"),
    readingPeriodLabel: text("reading_period_label"),
    issueTheme: text("issue_theme"),
    paymentType: text("payment_type"),
    paymentAmountCents: integer("payment_amount_cents"),
    paymentCurrency: text("payment_currency"),
    reprintsAllowed: boolean("reprints_allowed"),
    previouslyUnpublishedRequired: boolean("previously_unpublished_required"),
    multipleSubmissionsAllowed: boolean("multiple_submissions_allowed"),
    wordLimitMin: integer("word_limit_min"),
    wordLimitMax: integer("word_limit_max"),
    pageLimitMin: integer("page_limit_min"),
    pageLimitMax: integer("page_limit_max"),
    responseTimeDays: integer("response_time_days"),
    acceptanceRate: integer("acceptance_rate"),
    statsSampleSize: integer("stats_sample_size"),
    judgeName: text("judge_name"),
    prizeSummary: text("prize_summary"),
    eligibilitySummary: text("eligibility_summary"),
    rightsSummary: text("rights_summary"),
    confidence: text("confidence").notNull().default("unknown"),
    sourceUrl: text("source_url").notNull(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("opportunity_call_profiles_market_idx").on(table.marketKind, table.callKind),
    index("opportunity_call_profiles_period_idx").on(table.readingPeriodKind, table.lastVerifiedAt),
    check("opportunity_call_profiles_call_kind_check", sql`${table.callKind} in ('general-submission', 'themed-call', 'contest', 'prize', 'fellowship', 'grant', 'residency', 'open-call', 'unknown')`),
    check("opportunity_call_profiles_market_kind_check", sql`${table.marketKind} in ('magazine', 'journal', 'press', 'anthology', 'contest', 'award', 'organization', 'unknown')`),
    check("opportunity_call_profiles_period_check", sql`${table.readingPeriodKind} in ('exact', 'rolling', 'year-round', 'seasonal', 'unknown')`),
    check("opportunity_call_profiles_confidence_check", sql`${table.confidence} in ('confirmed', 'probable', 'unknown')`),
    check("opportunity_call_profiles_numbers_check", sql`${table.acceptanceRate} is null or (${table.acceptanceRate} >= 0 and ${table.acceptanceRate} <= 100)`),
  ],
);

export const opportunityCallPrizes = pgTable(
  "opportunity_call_prizes",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    rank: integer("rank"),
    title: text("title"),
    amountCents: integer("amount_cents"),
    currency: text("currency"),
    description: text("description"),
    judgeName: text("judge_name"),
    sourceUrl: text("source_url").notNull(),
    confidence: text("confidence").notNull().default("unknown"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("opportunity_call_prizes_opp_idx").on(table.opportunityId, table.rank),
    check("opportunity_call_prizes_confidence_check", sql`${table.confidence} in ('confirmed', 'probable', 'unknown')`),
    check("opportunity_call_prizes_amount_check", sql`${table.amountCents} is null or ${table.amountCents} >= 0`),
  ],
);

export const opportunityCallWindows = pgTable(
  "opportunity_call_windows",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    label: text("label"),
    opensAt: date("opens_at"),
    closesAt: date("closes_at"),
    kind: text("kind").notNull().default("unknown"),
    timezone: text("timezone"),
    current: boolean("current").notNull().default(false),
    sourceUrl: text("source_url").notNull(),
    confidence: text("confidence").notNull().default("unknown"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("opportunity_call_windows_opp_idx").on(table.opportunityId, table.current, table.closesAt),
    check("opportunity_call_windows_kind_check", sql`${table.kind} in ('exact', 'rolling', 'year-round', 'seasonal', 'unknown')`),
    check("opportunity_call_windows_confidence_check", sql`${table.confidence} in ('confirmed', 'probable', 'unknown')`),
  ],
);

export const opportunityPreferences = pgTable(
  "opportunity_preferences",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    types: text("types").array().notNull().default(sql`ARRAY[]::text[]`),
    disciplines: text("disciplines").array().notNull().default(sql`ARRAY[]::text[]`),
    genres: text("genres").array().notNull().default(sql`ARRAY[]::text[]`),
    locations: text("locations").array().notNull().default(sql`ARRAY[]::text[]`),
    careerStages: text("career_stages").array().notNull().default(sql`ARRAY[]::text[]`),
    maxFeeCents: integer("max_fee_cents"),
    noFeeOnly: boolean("no_fee_only").notNull().default(false),
    deadlineWithinDays: integer("deadline_within_days"),
    simultaneousRequired: boolean("simultaneous_required").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => [
    check(
      "opportunity_preferences_fee_check",
      sql`${table.maxFeeCents} is null or ${table.maxFeeCents} >= 0`,
    ),
    check(
      "opportunity_preferences_deadline_check",
      sql`${table.deadlineWithinDays} is null or ${table.deadlineWithinDays} between 0 and 366`,
    ),
  ],
);

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    criteria: jsonb("criteria").notNull().$type<Record<string, unknown>>(),
    includeInDigest: boolean("include_in_digest").notNull().default(false),
    lastMatchedAt: timestamp("last_matched_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [index("saved_searches_account_idx").on(table.accountId, table.updatedAt)],
);

export const trackedOpportunities = pgTable(
  "tracked_opportunities",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("interested"),
    trackedAt: timestamp("tracked_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt,
  },
  (table) => [
    uniqueIndex("tracked_opportunities_account_opp_idx").on(table.accountId, table.opportunityId),
    index("tracked_opportunities_deadline_idx").on(table.accountId, table.status, table.updatedAt),
    check(
      "tracked_opportunities_status_check",
      sql`${table.status} in ('interested', 'preparing', 'submitted', 'withdrawn', 'accepted', 'declined', 'archived')`,
    ),
  ],
);

export const trackedStatusEvents = pgTable(
  "tracked_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trackedOpportunityId: text("tracked_opportunity_id")
      .notNull()
      .references(() => trackedOpportunities.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    source: text("source").notNull(),
    idempotencyKey: uuid("idempotency_key"),
    createdAt,
  },
  (table) => [
    uniqueIndex("tracked_status_events_idempotency_idx").on(table.idempotencyKey),
    index("tracked_status_events_tracked_idx").on(table.trackedOpportunityId, table.createdAt),
    check(
      "tracked_status_events_to_status_check",
      sql`${table.toStatus} in ('interested', 'preparing', 'submitted', 'withdrawn', 'accepted', 'declined', 'archived')`,
    ),
  ],
);

export const organizationFollows = pgTable(
  "organization_follows",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.organizationId] }),
    index("organization_follows_org_idx").on(table.organizationId),
  ],
);

export const submissionOutboundEvents = pgTable(
  "submission_outbound_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "restrict" }),
    destinationHost: text("destination_host"),
    destinationState: text("destination_state").notNull(),
    createdAt,
  },
  (table) => [
    index("submission_outbound_opp_idx").on(table.opportunityId, table.createdAt),
    index("submission_outbound_account_idx").on(table.accountId, table.createdAt),
  ],
);

export const opportunityIssueReports = pgTable(
  "opportunity_issue_reports",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    note: text("note"),
    status: text("status").notNull().default("open"),
    idempotencyKey: uuid("idempotency_key"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("opportunity_issue_reports_idempotency_idx").on(table.idempotencyKey),
    index("opportunity_issue_reports_status_idx").on(table.status, table.createdAt),
  ],
);
