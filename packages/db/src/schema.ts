import { sql } from "drizzle-orm";
import {
  customType,
  check,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
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
const revision = () => integer("revision").notNull().default(1);

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
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("entities_organization_idx").on(table.organizationId),
    check("entities_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const programs = pgTable(
  "programs",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("programs_entity_idx").on(table.entityId),
    check("programs_revision_check", sql`${table.revision} >= 1`),
  ],
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
    revision: revision(),
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
    check("open_calls_revision_check", sql`${table.revision} >= 1`),
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
    fields: jsonb("fields").notNull().$type<
      Array<{
        id: string;
        type: string;
        label: string;
        required: boolean;
        order: number;
      }>
    >(),
    feeCents: integer("fee_cents"),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("submission_paths_open_call_idx").on(table.openCallId),
    check(
      "submission_paths_fee_check",
      sql`${table.feeCents} is null or ${table.feeCents} >= 0`,
    ),
    check("submission_paths_revision_check", sql`${table.revision} >= 1`),
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
    paymentStatus: text("payment_status").notNull().default("not-required"),
    paymentSessionId: text("payment_session_id"),
    feeCents: integer("fee_cents"),
    revision: revision(),
    updatedAt,
  },
  (table) => [
    index("submissions_path_status_idx").on(
      table.submissionPathId,
      table.status,
    ),
    index("submissions_submitter_idx").on(table.submitterAccountId),
    uniqueIndex("submissions_submitter_path_idempotency_idx").on(
      table.submitterAccountId,
      table.submissionPathId,
      table.idempotencyKey,
    ),
    uniqueIndex("submissions_payment_session_idx")
      .on(table.paymentSessionId)
      .where(sql`${table.paymentSessionId} is not null`),
    check(
      "submissions_status_check",
      sql`${table.status} in ('submitted', 'in-review', 'decided', 'accepted', 'declined', 'waitlisted', 'partially-accepted', 'mixed', 'withdrawn')`,
    ),
    check("submissions_revision_check", sql`${table.revision} >= 1`),
    check(
      "submissions_payment_status_check",
      sql`${table.paymentStatus} in ('not-required', 'paid', 'failed', 'refunded', 'disputed')`,
    ),
    check(
      "submissions_fee_check",
      sql`${table.feeCents} is null or ${table.feeCents} >= 0`,
    ),
  ],
);

export const submissionDrafts = pgTable(
  "submission_drafts",
  {
    id: text("id").primaryKey(),
    submissionPathId: text("submission_path_id")
      .notNull()
      .references(() => submissionPaths.id, { onDelete: "cascade" }),
    submitterAccountId: text("submitter_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    answers: jsonb("answers")
      .notNull()
      .$type<Record<string, string | string[]>>(),
    category: text("category"),
    workTitles: jsonb("work_titles").notNull().$type<string[]>(),
    idempotencyKey: text("idempotency_key"),
    paymentSessionId: text("payment_session_id"),
    updatedAt,
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("submission_drafts_submitter_path_idx").on(
      table.submitterAccountId,
      table.submissionPathId,
    ),
    index("submission_drafts_expires_idx").on(table.expiresAt),
  ],
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
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("works_submission_order_idx").on(
      table.submissionId,
      table.order,
    ),
    check("works_order_check", sql`${table.order} >= 0`),
    check("works_revision_check", sql`${table.revision} >= 1`),
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
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("review_rounds_open_call_idx").on(table.openCallId),
    check("review_rounds_revision_check", sql`${table.revision} >= 1`),
  ],
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
    revision: revision(),
    updatedAt,
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
    check("review_assignments_revision_check", sql`${table.revision} >= 1`),
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

export const decisions = pgTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    workId: text("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    outcome: text("outcome").notNull(),
    decidedByAccountId: text("decided_by_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    decidedAt: timestamp("decided_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revision: revision(),
    updatedAt,
  },
  (table) => [
    uniqueIndex("decisions_work_idx").on(table.workId),
    check(
      "decisions_outcome_check",
      sql`${table.outcome} in ('accepted', 'declined', 'waitlisted')`,
    ),
    check("decisions_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const deliveryTasks = pgTable(
  "delivery_tasks",
  {
    id: text("id").primaryKey(),
    workId: text("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("delivery_tasks_work_idx").on(table.workId),
    check(
      "delivery_tasks_status_check",
      sql`${table.status} in ('pending', 'complete')`,
    ),
    check("delivery_tasks_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const workspaceCommandReceipts = pgTable(
  "workspace_command_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeType: text("scope_type").notNull(),
    scopeId: text("scope_id").notNull(),
    actorAccountId: text("actor_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    commandType: text("command_type").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    result: jsonb("result")
      .notNull()
      .$type<{
        resourceType: string;
        resourceId: string;
        revision: number;
        receiptId: string;
        replayed: boolean;
      }>(),
    correlationId: text("correlation_id").notNull(),
    causationId: text("causation_id"),
    createdAt,
  },
  (table) => [
    uniqueIndex("workspace_command_receipts_identity_idx").on(
      table.scopeType,
      table.scopeId,
      table.actorAccountId,
      table.commandType,
      table.idempotencyKey,
    ),
    index("workspace_command_receipts_correlation_idx").on(table.correlationId),
    check(
      "workspace_command_receipts_scope_check",
      sql`${table.scopeType} in ('organization', 'owner')`,
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
    correlationId: text("correlation_id"),
    causationId: text("causation_id"),
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
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    eventKey: text("event_key"),
    correlationId: text("correlation_id"),
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
    uniqueIndex("outbox_events_event_key_idx").on(table.eventKey),
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
    canonicalUrl: text("canonical_url"),
    normalizedUrl: text("normalized_url"),
    trustStatus: text("trust_status").notNull().default("needs-review"),
    trustScore: integer("trust_score").notNull().default(0),
    authorityKind: text("authority_kind").notNull().default("other"),
    trustEvidenceUrl: text("trust_evidence_url"),
    trustReviewedAt: timestamp("trust_reviewed_at", { withTimezone: true }),
    trustReviewNote: text("trust_review_note"),
    sourceTier: integer("source_tier").notNull().default(0),
    kind: text("kind").notNull(),
    active: boolean("active").notNull().default(true),
    followsOutboundLinks: boolean("follows_outbound_links")
      .notNull()
      .default(false),
    checkIntervalHours: integer("check_interval_hours").notNull().default(24),
    geographyCodes: text("geography_codes")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    languageCodes: text("language_codes")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    firstVerifiedAt: timestamp("first_verified_at", { withTimezone: true }),
    lastSuccessfulFetchAt: timestamp("last_successful_fetch_at", {
      withTimezone: true,
    }),
    lastProcessedAt: timestamp("last_processed_at", { withTimezone: true }),
    lastDiscoveryAt: timestamp("last_discovery_at", { withTimezone: true }),
    nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
    lastHttpStatus: integer("last_http_status"),
    lastFetchedContentHash: text("last_fetched_content_hash"),
    lastProcessedContentHash: text("last_processed_content_hash"),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    consecutiveProcessingFailures: integer("consecutive_processing_failures")
      .notNull()
      .default(0),
    robotsStatus: text("robots_status").notNull().default("unknown"),
    termsStatus: text("terms_status").notNull().default("unknown"),
    healthStatus: text("health_status").notNull().default("unknown"),
    disabledReason: text("disabled_reason"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("opportunity_sources_org_idx").on(table.organizationId),
    index("opportunity_sources_active_idx").on(
      table.active,
      table.lastCheckedAt,
    ),
    index("opportunity_sources_due_idx").on(
      table.active,
      table.healthStatus,
      table.lastCheckedAt,
    ),
    index("opportunity_sources_normalized_url_idx").on(table.normalizedUrl),
    index("opportunity_sources_trust_idx").on(
      table.trustStatus,
      table.trustScore,
    ),
    check(
      "opportunity_sources_trust_status_check",
      sql`${table.trustStatus} in ('curated', 'verified', 'needs-review', 'blocked')`,
    ),
    check(
      "opportunity_sources_trust_score_check",
      sql`${table.trustScore} between 0 and 100`,
    ),
    check(
      "opportunity_sources_authority_check",
      sql`${table.authorityKind} in ('official-source', 'professional-body', 'publisher', 'platform', 'directory', 'feed', 'funder', 'academic', 'community', 'other')`,
    ),
    check(
      "opportunity_sources_tier_check",
      sql`${table.sourceTier} between 0 and 3`,
    ),
    check(
      "opportunity_sources_interval_check",
      sql`${table.checkIntervalHours} between 1 and 8760`,
    ),
    check(
      "opportunity_sources_failures_check",
      sql`${table.consecutiveFailures} >= 0 and ${table.consecutiveProcessingFailures} >= 0`,
    ),
    check(
      "opportunity_sources_http_status_check",
      sql`${table.lastHttpStatus} is null or ${table.lastHttpStatus} between 100 and 599`,
    ),
    check(
      "opportunity_sources_robots_check",
      sql`${table.robotsStatus} in ('unknown', 'allowed', 'restricted', 'blocked', 'review')`,
    ),
    check(
      "opportunity_sources_terms_check",
      sql`${table.termsStatus} in ('unknown', 'allowed', 'restricted', 'blocked', 'review')`,
    ),
    check(
      "opportunity_sources_health_check",
      sql`${table.healthStatus} in ('unknown', 'healthy', 'degraded', 'stale', 'gone', 'blocked', 'paused')`,
    ),
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
    // New ingestion is never public by default. Publication is an explicit,
    // gated transition performed by the review worker.
    publicationState: text("publication_state").notNull().default("reviewable"),
    type: text("type").notNull(),
    discipline: text("discipline"),
    genres: text("genres")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
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
    submissionVerifiedAt: timestamp("submission_verified_at", {
      withTimezone: true,
    }),
    submissionState: text("submission_state").notNull().default("unknown"),
    searchDocument: text("search_document").notNull().default(""),
    sourceCheckedAt: timestamp("source_checked_at", { withTimezone: true }),
    processingSucceededAt: timestamp("processing_succeeded_at", {
      withTimezone: true,
    }),
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
    index("opportunities_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
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
  (table) => [
    index("opportunity_versions_opp_idx").on(
      table.opportunityId,
      table.createdAt,
    ),
  ],
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
  (table) => [
    index("opportunity_changes_opp_idx").on(
      table.opportunityId,
      table.createdAt,
    ),
  ],
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
    index("opportunity_eligibility_opp_idx").on(
      table.opportunityId,
      table.sortOrder,
    ),
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
  (table) => [
    index("opportunity_materials_opp_idx").on(
      table.opportunityId,
      table.sortOrder,
    ),
  ],
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
    processingSucceededAt: timestamp("processing_succeeded_at", {
      withTimezone: true,
    }),
    organizationConfirmed: boolean("organization_confirmed")
      .notNull()
      .default(false),
    destinationReconciled: boolean("destination_reconciled")
      .notNull()
      .default(false),
    destinationReconciliation: jsonb("destination_reconciliation")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    verifiedUntil: timestamp("verified_until", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("opportunity_evidence_opp_idx").on(
      table.opportunityId,
      table.checkedAt,
    ),
    index("opportunity_evidence_verified_idx").on(table.verifiedUntil),
  ],
);

/**
 * Shared publication identities originally hydrated by Gary. These core rows
 * live in the relational schema so Radar can attach canonical Opportunities
 * without copying profile data or weakening Gary's provenance tables.
 */
export const garySources = pgTable(
  "gary_sources",
  {
    id: text("id").primaryKey(),
    adapter: text("adapter").notNull(),
    name: text("name").notNull(),
    seedUrl: text("seed_url").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    freshnessHours: integer("freshness_hours").notNull().default(24),
    backfillStatus: text("backfill_status").notNull().default("pending"),
    nextRefreshAt: timestamp("next_refresh_at", { withTimezone: true }),
    lastStartedAt: timestamp("last_started_at", { withTimezone: true }),
    lastSuccessfulAt: timestamp("last_successful_at", { withTimezone: true }),
    leaseOwner: text("lease_owner"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastError: text("last_error"),
    config: jsonb("config_json")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt,
    updatedAt,
  },
  (table) => [
    check(
      "gary_sources_freshness_check",
      sql`${table.freshnessHours} between 1 and 8760`,
    ),
    check(
      "gary_sources_backfill_status_check",
      sql`${table.backfillStatus} in ('pending', 'running', 'complete', 'blocked')`,
    ),
    check(
      "gary_sources_failures_check",
      sql`${table.consecutiveFailures} >= 0`,
    ),
  ],
);

export const garyProfiles = pgTable(
  "gary_profiles",
  {
    id: text("id").primaryKey(),
    identityKey: text("identity_key").notNull(),
    canonicalKey: text("canonical_key").notNull(),
    profileKind: text("profile_kind").notNull(),
    nameKey: text("name_key").notNull(),
    name: text("name").notNull(),
    websiteUrl: text("website_url"),
    normalizedWebsiteUrl: text("normalized_website_url"),
    identityStatus: text("identity_status").notNull().default("confirmed"),
    identityConfidence: numeric("identity_confidence", {
      precision: 4,
      scale: 3,
    })
      .notNull()
      .default("0.5"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("gary_profiles_canonical_key_idx").on(table.canonicalKey),
    index("gary_profiles_kind_name_idx").on(table.profileKind, table.nameKey),
    index("gary_profiles_website_idx").on(table.normalizedWebsiteUrl),
    check(
      "gary_profiles_kind_check",
      sql`${table.profileKind} in ('literary_magazine', 'small_press', 'visual_arts_organization', 'gallery', 'residency_center', 'grant_foundation', 'organization')`,
    ),
    check(
      "gary_profiles_identity_status_check",
      sql`${table.identityStatus} in ('confirmed', 'needs-review')`,
    ),
    check(
      "gary_profiles_identity_confidence_check",
      sql`${table.identityConfidence} between 0 and 1`,
    ),
  ],
);

export const garyProfileVisuals = pgTable(
  "gary_profile_visuals",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => garyProfiles.id, { onDelete: "cascade" }),
    assetType: text("asset_type").notNull(),
    imageUrl: text("image_url").notNull(),
    label: text("label"),
    issueYear: integer("issue_year"),
    season: text("season"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt,
  },
  (table) => [
    index("gary_profile_visuals_profile_idx").on(table.profileId, table.assetType),
    check(
      "gary_profile_visuals_asset_type_check",
      sql`${table.assetType} in ('logo', 'banner', 'issue_cover')`,
    ),
  ],
);

export const garyPrizeProvenance = pgTable(
  "gary_prize_provenance",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => garyProfiles.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id"),
    contestName: text("contest_name").notNull(),
    awardYear: integer("award_year").notNull(),
    winnerName: text("winner_name").notNull(),
    winningTitle: text("winning_title"),
    winningWorkUrl: text("winning_work_url"),
    judgeName: text("judge_name"),
    sourceUrl: text("source_url"),
    createdAt,
  },
  (table) => [
    index("gary_prize_provenance_profile_idx").on(table.profileId, table.awardYear),
  ],
);

export const garyProfileIntelligence = pgTable(
  "gary_profile_intelligence",
  {
    profileId: text("profile_id")
      .primaryKey()
      .references(() => garyProfiles.id, { onDelete: "cascade" }),
    prestigeTier: text("prestige_tier").notNull().default("Tier 3 (Emerging)"),
    foundingYear: integer("founding_year"),
    honors: jsonb("honors").notNull().default([]),
    editorialArchetype: text("editorial_archetype").notNull().default("Unspecified"),
    sentimentTags: jsonb("sentiment_tags").notNull().default([]),
    responseDaysMin: integer("response_days_min"),
    responseDaysMax: integer("response_days_max"),
    responseLabel: text("response_label"),
    queryPolicy: text("query_policy"),
    socialLinks: jsonb("social_links").notNull().default({}),
    popularityMetrics: jsonb("popularity_metrics").notNull().default({}),
    updatedAt,
  },
);


export const handles = pgTable(
  "handles",
  {
    handleKey: text("handle_key").primaryKey(),
    displayHandle: text("display_handle").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    state: text("state").notNull(),
    derivation: text("derivation").notNull(),
    reservedFromProfileId: text("reserved_from_profile_id").references(
      () => garyProfiles.id,
      { onDelete: "set null" },
    ),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("handles_subject_active_idx")
      .on(table.subjectType, table.subjectId)
      .where(sql`${table.state} <> 'blocked'`),
    index("handles_subject_idx").on(table.subjectType, table.subjectId),
    index("handles_reserved_profile_idx").on(table.reservedFromProfileId),
    check(
      "handles_subject_type_check",
      sql`${table.subjectType} in ('user', 'organization', 'directory_profile')`,
    ),
    check(
      "handles_state_check",
      sql`${table.state} in ('claimed', 'reserved', 'blocked')`,
    ),
    check(
      "handles_derivation_check",
      sql`${table.derivation} in ('user-chosen', 'name', 'domain', 'both', 'manual')`,
    ),
  ],
);

export const handleAliases = pgTable(
  "handle_aliases",
  {
    aliasKey: text("alias_key").primaryKey(),
    handleKey: text("handle_key")
      .notNull()
      .references(() => handles.handleKey, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt,
  },
  (table) => [
    index("handle_aliases_handle_idx").on(table.handleKey),
    check(
      "handle_aliases_reason_check",
      sql`${table.reason} in ('article-variant', 'rename', 'domain-variant', 'manual')`,
    ),
  ],
);

export const garyProfileAliases = pgTable(
  "gary_profile_aliases",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => garyProfiles.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => garySources.id, { onDelete: "restrict" }),
    aliasKind: text("alias_kind").notNull(),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex("gary_profile_aliases_profile_url_idx").on(
      table.profileId,
      table.normalizedUrl,
    ),
    index("gary_profile_aliases_profile_idx").on(table.profileId),
    index("gary_profile_aliases_url_idx").on(table.normalizedUrl),
    check(
      "gary_profile_aliases_kind_check",
      sql`${table.aliasKind} in ('detail', 'official', 'submission', 'alternate')`,
    ),
  ],
);

export const opportunityProfileLinks = pgTable(
  "opportunity_profile_links",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => garyProfiles.id, { onDelete: "cascade" }),
    relation: text("relation").notNull(),
    status: text("status").notNull().default("pending"),
    confidence: numeric("confidence", { precision: 4, scale: 3 })
      .notNull()
      .default("0"),
    matchedHost: text("matched_host").notNull(),
    opportunityUrl: text("opportunity_url").notNull(),
    profileUrl: text("profile_url").notNull(),
    nameScore: numeric("name_score", { precision: 4, scale: 3 })
      .notNull()
      .default("0"),
    matchedNameTokens: text("matched_name_tokens")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    evidence: jsonb("evidence_json")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    profileCheckedAt: timestamp("profile_checked_at", { withTimezone: true }),
    opportunityCheckedAt: timestamp("opportunity_checked_at", {
      withTimezone: true,
    }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedUntil: timestamp("verified_until", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("opportunity_profile_links_identity_idx").on(
      table.profileId,
      table.opportunityId,
      table.relation,
    ),
    index("opportunity_profile_links_opportunity_idx").on(
      table.opportunityId,
      table.status,
    ),
    index("opportunity_profile_links_profile_idx").on(
      table.profileId,
      table.status,
    ),
    index("opportunity_profile_links_freshness_idx").on(
      table.status,
      table.verifiedUntil,
    ),
    check(
      "opportunity_profile_links_relation_check",
      sql`${table.relation} in ('organizer', 'host', 'submission')`,
    ),
    check(
      "opportunity_profile_links_status_check",
      sql`${table.status} in ('pending', 'confirmed', 'rejected')`,
    ),
    check(
      "opportunity_profile_links_confidence_check",
      sql`${table.confidence} between 0 and 1`,
    ),
    check(
      "opportunity_profile_links_name_score_check",
      sql`${table.nameScore} between 0 and 1`,
    ),
  ],
);

export const opportunityProfileIdentityChecks = pgTable(
  "opportunity_profile_identity_checks",
  {
    opportunityId: text("opportunity_id")
      .primaryKey()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    matcherVersion: text("matcher_version").notNull(),
    status: text("status").notNull(),
    candidateCount: integer("candidate_count").notNull().default(0),
    confirmedCount: integer("confirmed_count").notNull().default(0),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    nextCheckAt: timestamp("next_check_at", { withTimezone: true }).notNull(),
    evidence: jsonb("evidence_json")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("opportunity_profile_identity_checks_due_idx").on(
      table.nextCheckAt,
      table.status,
    ),
    check(
      "opportunity_profile_identity_checks_status_check",
      sql`${table.status} in ('no-match', 'pending', 'confirmed')`,
    ),
    check(
      "opportunity_profile_identity_checks_counts_check",
      sql`${table.candidateCount} >= 0 and ${table.confirmedCount} >= 0 and ${table.confirmedCount} <= ${table.candidateCount}`,
    ),
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
    reviewer: text("reviewer"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    evidencePassage: text("evidence_passage"),
    attributionRequirement: text("attribution_requirement"),
    approvedCrop: jsonb("approved_crop").$type<{
      x: number;
      y: number;
      width: number;
      height: number;
      focalPoint?: { x: number; y: number };
    }>(),
    permittedScope: text("permitted_scope"),
    contentHash: text("content_hash"),
    inheritanceLevel: text("inheritance_level").notNull().default("opportunity"),
    linkedOrganizationId: text("linked_organization_id").references(
      () => organizations.id,
      { onDelete: "set null" },
    ),
    linkedProgramId: text("linked_program_id").references(
      () => programs.id,
      { onDelete: "set null" },
    ),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt,
  },
  (table) => [
    index("opportunity_assets_opp_idx").on(table.opportunityId),
    check(
      "opportunity_identity_assets_rights_check",
      sql`${table.rightsStatus} in ('unknown', 'cleared', 'permitted', 'rejected', 'needs-attribution')`,
    ),
    check(
      "opportunity_identity_assets_inheritance_check",
      sql`${table.inheritanceLevel} in ('opportunity', 'program', 'organization')`,
    ),
  ],
);

export const opportunityMediaCandidates = pgTable(
  "opportunity_media_candidates",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    jobId: text("job_id").references(() => radarEnrichmentJobs.id, {
      onDelete: "set null",
    }),
    originalUrl: text("original_url").notNull(),
    resolvedUrl: text("resolved_url").notNull(),
    pageUrl: text("page_url").notNull(),
    sourceRole: text("source_role").notNull(),
    candidateKind: text("candidate_kind").notNull(),
    alt: text("alt"),
    caption: text("caption"),
    title: text("title"),
    width: integer("width"),
    height: integer("height"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    httpStatus: integer("http_status"),
    redirectChain: jsonb("redirect_chain")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<string[]>(),
    contentHash: text("content_hash"),
    attributionText: text("attribution_text"),
    inheritanceLevel: text("inheritance_level")
      .notNull()
      .default("opportunity"),
    linkedOrganizationId: text("linked_organization_id").references(
      () => organizations.id,
      { onDelete: "set null" },
    ),
    linkedProgramId: text("linked_program_id").references(
      () => programs.id,
      { onDelete: "set null" },
    ),
    extractionMethod: text("extraction_method").notNull(),
    parserVersion: text("parser_version").notNull(),
    confidence: text("confidence").notNull().default("unknown"),
    rejectionReasons: text("rejection_reasons")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    status: text("status").notNull().default("reviewable"),
    rightsStatus: text("rights_status").notNull().default("unknown"),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("opportunity_media_candidates_opp_idx").on(
      table.opportunityId,
      table.status,
    ),
    index("opportunity_media_candidates_hash_idx").on(table.contentHash),
    uniqueIndex("opportunity_media_candidates_dedup_idx").on(
      table.opportunityId,
      table.resolvedUrl,
    ),
    check(
      "opportunity_media_candidates_kind_check",
      sql`${table.candidateKind} in ('opportunity-artwork', 'program-artwork', 'organization-logo', 'organization-cover', 'venue/place', 'editorial-image', 'unknown')`,
    ),
    check(
      "opportunity_media_candidates_source_role_check",
      sql`${table.sourceRole} in ('official-opportunity-page', 'organization-page', 'program-page', 'application-portal', 'discovery-directory', 'attachment')`,
    ),
    check(
      "opportunity_media_candidates_inheritance_check",
      sql`${table.inheritanceLevel} in ('opportunity', 'program', 'organization')`,
    ),
    check(
      "opportunity_media_candidates_status_check",
      sql`${table.status} in ('found', 'rejected', 'reviewable', 'cleared', 'permitted', 'needs-attribution', 'blocked')`,
    ),
    check(
      "opportunity_media_candidates_rights_check",
      sql`${table.rightsStatus} in ('unknown', 'cleared', 'permitted', 'rejected', 'needs-attribution')`,
    ),
    check(
      "opportunity_media_candidates_confidence_check",
      sql`${table.confidence} in ('confirmed', 'probable', 'unknown')`,
    ),
  ],
);

export const opportunityMediaReviews = pgTable(
  "opportunity_media_reviews",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => opportunityMediaCandidates.id, {
        onDelete: "cascade",
      }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    reviewer: text("reviewer").notNull(),
    decision: text("decision").notNull(),
    evidencePassage: text("evidence_passage"),
    attributionRequirement: text("attribution_requirement"),
    approvedCrop: jsonb("approved_crop").$type<{
      x: number;
      y: number;
      width: number;
      height: number;
      focalPoint?: { x: number; y: number };
    }>(),
    permittedScope: text("permitted_scope"),
    reviewedAlt: text("reviewed_alt"),
    notes: text("notes"),
    decidedAt: timestamp("decided_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt,
  },
  (table) => [
    index("opportunity_media_reviews_opp_idx").on(
      table.opportunityId,
      table.decidedAt,
    ),
    index("opportunity_media_reviews_candidate_idx").on(table.candidateId),
    check(
      "opportunity_media_reviews_decision_check",
      sql`${table.decision} in ('cleared', 'permitted', 'rejected', 'needs-attribution')`,
    ),
  ],
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
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    lastError: text("last_error"),
    payload: jsonb("payload")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("radar_enrichment_jobs_opp_kind_idx").on(
      table.opportunityId,
      table.kind,
    ),
    index("radar_enrichment_jobs_ready_idx").on(
      table.status,
      table.nextAttemptAt,
      table.leaseUntil,
      table.priority,
    ),
    check(
      "radar_enrichment_jobs_kind_check",
      sql`${table.kind} in ('media', 'winners', 'guidelines', 'call-profile')`,
    ),
    check(
      "radar_enrichment_jobs_status_check",
      sql`${table.status} in ('queued', 'processing', 'completed', 'failed', 'blocked')`,
    ),
    check("radar_enrichment_jobs_attempts_check", sql`${table.attempts} >= 0`),
    check(
      "radar_enrichment_jobs_priority_check",
      sql`${table.priority} between -100 and 100`,
    ),
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
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt,
  },
  (table) => [
    uniqueIndex("radar_enrichment_evidence_unique_idx").on(
      table.opportunityId,
      table.kind,
      table.url,
    ),
    index("radar_enrichment_evidence_opp_idx").on(
      table.opportunityId,
      table.kind,
      table.retrievedAt,
    ),
    index("radar_enrichment_evidence_media_idx").on(table.kind, table.mediaUrl),
    check(
      "radar_enrichment_evidence_kind_check",
      sql`${table.kind} in ('media', 'winner', 'guideline', 'organization')`,
    ),
    check(
      "radar_enrichment_evidence_confidence_check",
      sql`${table.confidence} in ('confirmed', 'probable', 'unknown')`,
    ),
    check(
      "radar_enrichment_evidence_rights_check",
      sql`${table.rightsStatus} in ('unknown', 'review', 'permitted')`,
    ),
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
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    inputCount: integer("input_count").notNull().default(0),
    outputCount: integer("output_count").notNull().default(0),
    error: text("error"),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
  },
  (table) => [
    index("radar_agent_runs_kind_started_idx").on(
      table.agentKind,
      table.startedAt,
    ),
    check(
      "radar_agent_runs_status_check",
      sql`${table.status} in ('running', 'completed', 'failed', 'cancelled')`,
    ),
  ],
);

export const radarSourceRuns = pgTable(
  "radar_source_runs",
  {
    id: text("id").primaryKey(),
    agentRunId: text("agent_run_id").references(() => radarAgentRuns.id, {
      onDelete: "set null",
    }),
    lane: text("lane").notNull(),
    sourceId: text("source_id"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    intervalStart: timestamp("interval_start", { withTimezone: true }),
    intervalEnd: timestamp("interval_end", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: text("status").notNull().default("running"),
    sourcesSelected: integer("sources_selected").notNull().default(0),
    sourcesFetched: integer("sources_fetched").notNull().default(0),
    successfulFetches: integer("successful_fetches").notNull().default(0),
    failedFetches: integer("failed_fetches").notNull().default(0),
    extractionSuccesses: integer("extraction_successes").notNull().default(0),
    extractionFailures: integer("extraction_failures").notNull().default(0),
    opportunitiesCreated: integer("opportunities_created").notNull().default(0),
    opportunitiesUpdated: integer("opportunities_updated").notNull().default(0),
    duplicatesMerged: integer("duplicates_merged").notNull().default(0),
    retryCategories: jsonb("retry_categories")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, number>>(),
    reconciliation: jsonb("reconciliation")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    error: text("error"),
  },
  (table) => [
    index("radar_source_runs_lane_started_idx").on(table.lane, table.startedAt),
    index("radar_source_runs_status_idx").on(table.status, table.startedAt),
    check(
      "radar_source_runs_status_check",
      sql`${table.status} in ('running', 'completed', 'failed', 'skipped')`,
    ),
  ],
);

export const radarAgentHandoffs = pgTable(
  "radar_agent_handoffs",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => radarAgentRuns.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id").references(() => opportunities.id, {
      onDelete: "cascade",
    }),
    fromAgent: text("from_agent").notNull(),
    toAgent: text("to_agent").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("queued"),
    payload: jsonb("payload")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt,
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("radar_agent_handoffs_unique_idx").on(
      table.runId,
      table.opportunityId,
      table.toAgent,
      table.kind,
    ),
    index("radar_agent_handoffs_queue_idx").on(
      table.toAgent,
      table.status,
      table.createdAt,
    ),
    check(
      "radar_agent_handoffs_status_check",
      sql`${table.status} in ('queued', 'processing', 'completed', 'failed', 'blocked')`,
    ),
  ],
);

export const radarReviewJobs = pgTable(
  "radar_review_jobs",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .unique()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    inputVersion: text("input_version").notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("radar_review_jobs_ready_idx").on(
      table.status,
      table.nextAttemptAt,
      table.leaseUntil,
      table.priority,
    ),
    check(
      "radar_review_jobs_status_check",
      sql`${table.status} in ('queued', 'processing', 'completed', 'failed', 'needs-human', 'blocked')`,
    ),
    check("radar_review_jobs_attempts_check", sql`${table.attempts} >= 0`),
    check(
      "radar_review_jobs_priority_check",
      sql`${table.priority} between -100 and 100`,
    ),
  ],
);

export const radarReviewDecisions = pgTable(
  "radar_review_decisions",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => radarReviewJobs.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => radarAgentRuns.id, { onDelete: "cascade" }),
    decision: text("decision").notNull(),
    score: integer("score").notNull().default(0),
    reasons: jsonb("reasons")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<string[]>(),
    checks: jsonb("checks")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt,
  },
  (table) => [
    index("radar_review_decisions_opp_created_idx").on(
      table.opportunityId,
      table.createdAt,
    ),
    index("radar_review_decisions_run_idx").on(table.runId),
    check(
      "radar_review_decisions_decision_check",
      sql`${table.decision} in ('publish', 'needs-human', 'suppress', 'error')`,
    ),
    check(
      "radar_review_decisions_score_check",
      sql`${table.score} between 0 and 100`,
    ),
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
    publicationFormats: text("publication_formats")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    acceptedFormats: text("accepted_formats")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    subgenres: text("subgenres")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
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
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("opportunity_call_profiles_market_idx").on(
      table.marketKind,
      table.callKind,
    ),
    index("opportunity_call_profiles_period_idx").on(
      table.readingPeriodKind,
      table.lastVerifiedAt,
    ),
    check(
      "opportunity_call_profiles_call_kind_check",
      sql`${table.callKind} in ('general-submission', 'themed-call', 'contest', 'prize', 'fellowship', 'grant', 'residency', 'open-call', 'unknown')`,
    ),
    check(
      "opportunity_call_profiles_market_kind_check",
      sql`${table.marketKind} in ('magazine', 'journal', 'press', 'anthology', 'contest', 'award', 'organization', 'unknown')`,
    ),
    check(
      "opportunity_call_profiles_period_check",
      sql`${table.readingPeriodKind} in ('exact', 'rolling', 'year-round', 'seasonal', 'unknown')`,
    ),
    check(
      "opportunity_call_profiles_confidence_check",
      sql`${table.confidence} in ('confirmed', 'probable', 'unknown')`,
    ),
    check(
      "opportunity_call_profiles_numbers_check",
      sql`${table.acceptanceRate} is null or (${table.acceptanceRate} >= 0 and ${table.acceptanceRate} <= 100)`,
    ),
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
    index("opportunity_call_prizes_opp_idx").on(
      table.opportunityId,
      table.rank,
    ),
    check(
      "opportunity_call_prizes_confidence_check",
      sql`${table.confidence} in ('confirmed', 'probable', 'unknown')`,
    ),
    check(
      "opportunity_call_prizes_amount_check",
      sql`${table.amountCents} is null or ${table.amountCents} >= 0`,
    ),
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
    index("opportunity_call_windows_opp_idx").on(
      table.opportunityId,
      table.current,
      table.closesAt,
    ),
    check(
      "opportunity_call_windows_kind_check",
      sql`${table.kind} in ('exact', 'rolling', 'year-round', 'seasonal', 'unknown')`,
    ),
    check(
      "opportunity_call_windows_confidence_check",
      sql`${table.confidence} in ('confirmed', 'probable', 'unknown')`,
    ),
  ],
);

/**
 * User-facing Opportunity Intelligence is an additive projection. It is
 * generated from canonical opportunity facts and remains separate from the
 * Radar row so editorial copy can be rebuilt and reviewed without mutating
 * source truth.
 */
export const opportunityContents = pgTable(
  "opportunity_contents",
  {
    opportunityId: text("opportunity_id")
      .primaryKey()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    inputVersion: text("input_version").notNull(),
    builderVersion: text("builder_version").notNull(),
    content: jsonb("content").notNull().$type<Record<string, unknown>>(),
    reviewStatus: text("review_status").notNull().default("pending"),
    reviewScore: integer("review_score").notNull().default(0),
    reviewReasons: jsonb("review_reasons")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<string[]>(),
    reviewChecks: jsonb("review_checks")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("opportunity_contents_review_idx").on(
      table.reviewStatus,
      table.reviewedAt,
    ),
    check(
      "opportunity_contents_status_check",
      sql`${table.reviewStatus} in ('pending', 'approved', 'needs-human', 'blocked')`,
    ),
    check(
      "opportunity_contents_score_check",
      sql`${table.reviewScore} between 0 and 100`,
    ),
  ],
);

/** Durable build -> review queue for the user-facing content projection. */
export const radarContentReviewJobs = pgTable(
  "radar_content_review_jobs",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .unique()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    inputVersion: text("input_version").notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("radar_content_review_jobs_ready_idx").on(
      table.status,
      table.nextAttemptAt,
      table.leaseUntil,
      table.priority,
    ),
    check(
      "radar_content_review_jobs_status_check",
      sql`${table.status} in ('queued', 'building', 'pending-review', 'processing', 'completed', 'failed', 'needs-human', 'blocked')`,
    ),
    check(
      "radar_content_review_jobs_attempts_check",
      sql`${table.attempts} >= 0`,
    ),
    check(
      "radar_content_review_jobs_priority_check",
      sql`${table.priority} between -100 and 100`,
    ),
  ],
);

/** Append-only review history for Opportunity Intelligence content. */
export const radarContentReviewDecisions = pgTable(
  "radar_content_review_decisions",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => radarContentReviewJobs.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => radarAgentRuns.id, { onDelete: "cascade" }),
    reviewerAccountId: text("reviewer_account_id").references(
      () => accounts.id,
      {
        onDelete: "set null",
      },
    ),
    decisionSource: text("decision_source").notNull().default("automated"),
    decision: text("decision").notNull(),
    score: integer("score").notNull().default(0),
    reasons: jsonb("reasons")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<string[]>(),
    checks: jsonb("checks")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt,
  },
  (table) => [
    index("radar_content_review_decisions_opp_created_idx").on(
      table.opportunityId,
      table.createdAt,
    ),
    index("radar_content_review_decisions_run_idx").on(table.runId),
    check(
      "radar_content_review_decisions_decision_check",
      sql`${table.decision} in ('approved', 'needs-human', 'blocked', 'error')`,
    ),
    check(
      "radar_content_review_decisions_source_check",
      sql`${table.decisionSource} in ('automated', 'human')`,
    ),
    check(
      "radar_content_review_decisions_score_check",
      sql`${table.score} between 0 and 100`,
    ),
  ],
);

export const opportunityPreferences = pgTable(
  "opportunity_preferences",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    types: text("types")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    disciplines: text("disciplines")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    genres: text("genres")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    locations: text("locations")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    careerStages: text("career_stages")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    maxFeeCents: integer("max_fee_cents"),
    noFeeOnly: boolean("no_fee_only").notNull().default(false),
    deadlineWithinDays: integer("deadline_within_days"),
    simultaneousRequired: boolean("simultaneous_required")
      .notNull()
      .default(false),
    revision: revision(),
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
    check(
      "opportunity_preferences_revision_check",
      sql`${table.revision} >= 1`,
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
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("saved_searches_account_idx").on(table.accountId, table.updatedAt),
    check("saved_searches_revision_check", sql`${table.revision} >= 1`),
  ],
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
    notify: boolean("notify").notNull().default(true),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    workId: text("work_id"),
    lastImportId: text("last_import_id"),
    revision: revision(),
    trackedAt: timestamp("tracked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt,
  },
  (table) => [
    uniqueIndex("tracked_opportunities_account_opp_idx").on(
      table.accountId,
      table.opportunityId,
    ),
    index("tracked_opportunities_deadline_idx").on(
      table.accountId,
      table.status,
      table.updatedAt,
    ),
    check(
      "tracked_opportunities_status_check",
      sql`${table.status} in ('interested','saved','preparing','draft-started','ready-to-submit','submitted','received','in-review','longlisted','shortlisted','finalist','accepted','declined','waitlisted','revision-requested','withdrawn','partially-withdrawn','delivered','archived')`,
    ),
    check("tracked_opportunities_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const trackedStatusEvents = pgTable(
  "tracked_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trackedOpportunityId: text("tracked_opportunity_id")
      .notNull()
      .references(() => trackedOpportunities.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    source: text("source").notNull(),
    confidence: text("confidence"),
    note: text("note"),
    candidateId: text("candidate_id"),
    evidence: jsonb("evidence").$type<Record<string, unknown>>(),
    idempotencyKey: text("idempotency_key"),
    createdAt,
  },
  (table) => [
    uniqueIndex("tracked_status_events_idempotency_idx").on(
      table.accountId,
      table.idempotencyKey,
    ),
    index("tracked_status_events_tracked_idx").on(
      table.trackedOpportunityId,
      table.createdAt,
    ),
    check(
      "tracked_status_events_to_status_check",
      sql`${table.toStatus} in ('interested','saved','preparing','draft-started','ready-to-submit','submitted','received','in-review','longlisted','shortlisted','finalist','accepted','declined','waitlisted','revision-requested','withdrawn','partially-withdrawn','delivered','archived')`,
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
    revision: revision(),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.organizationId] }),
    index("organization_follows_org_idx").on(table.organizationId),
    check("organization_follows_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const creatorProfiles = pgTable(
  "creator_profiles",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    website: text("website"),
    location: text("location"),
    displayNameVisibility: text("display_name_visibility")
      .notNull()
      .default("public"),
    bioVisibility: text("bio_visibility").notNull().default("public"),
    trackedOpportunityCountVisibility: text(
      "tracked_opportunity_count_visibility",
    )
      .notNull()
      .default("private"),
    reduceMotion: boolean("reduce_motion").notNull().default(false),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("creator_profiles_user_idx").on(table.userId),
    check(
      "creator_profiles_display_name_visibility_check",
      sql`${table.displayNameVisibility} in ('public', 'private')`,
    ),
    check(
      "creator_profiles_bio_visibility_check",
      sql`${table.bioVisibility} in ('public', 'private')`,
    ),
    check(
      "creator_profiles_tracked_count_visibility_check",
      sql`${table.trackedOpportunityCountVisibility} in ('public', 'private')`,
    ),
    check("creator_profiles_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const creatorProfileMotionEvents = pgTable(
  "creator_profile_motion_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    detail: jsonb("detail")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("creator_profile_motion_events_account_idx").on(
      table.accountId,
      table.createdAt,
    ),
    uniqueIndex("creator_profile_motion_events_once_idx").on(
      table.accountId,
      table.eventType,
    ),
    check(
      "creator_profile_motion_events_revision_check",
      sql`${table.revision} >= 1`,
    ),
  ],
);

export const creatorInboxAlerts = pgTable(
  "creator_inbox_alerts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id").references(() => opportunities.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    reason: text("reason"),
    dedupeKey: text("dedupe_key").notNull(),
    deliveryEligibility: text("delivery_eligibility")
      .notNull()
      .default("in-app"),
    readAt: timestamp("read_at", { withTimezone: true }),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("creator_inbox_alerts_dedupe_idx").on(
      table.accountId,
      table.dedupeKey,
    ),
    index("creator_inbox_alerts_unread_idx").on(
      table.accountId,
      table.readAt,
      table.createdAt,
    ),
    check("creator_inbox_alerts_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    emailEnabled: boolean("email_enabled").notNull().default(false),
    digestCadence: text("digest_cadence").notNull().default("off"),
    savedSearchEnabled: boolean("saved_search_enabled").notNull().default(true),
    followEnabled: boolean("follow_enabled").notNull().default(true),
    reminderEnabled: boolean("reminder_enabled").notNull().default(true),
    providerState: text("provider_state").notNull().default("unavailable"),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    check(
      "notification_preferences_digest_check",
      sql`${table.digestCadence} in ('off', 'daily', 'weekly')`,
    ),
    check(
      "notification_preferences_provider_check",
      sql`${table.providerState} in ('unavailable', 'available')`,
    ),
    check(
      "notification_preferences_revision_check",
      sql`${table.revision} >= 1`,
    ),
  ],
);

export const calendarFeedTokens = pgTable(
  "calendar_feed_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    revision: revision(),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("calendar_feed_tokens_hash_idx").on(table.tokenHash),
    uniqueIndex("calendar_feed_tokens_account_version_idx").on(
      table.accountId,
      table.version,
    ),
    check(
      "calendar_feed_tokens_status_check",
      sql`${table.status} in ('active', 'rotated', 'revoked')`,
    ),
    check("calendar_feed_tokens_version_check", sql`${table.version} >= 1`),
    check("calendar_feed_tokens_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const creatorCalendarEvents = pgTable(
  "creator_calendar_events",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    allDay: boolean("all_day").notNull().default(false),
    color: text("color").notNull().default("ink"),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("creator_calendar_events_account_range_idx").on(
      table.accountId,
      table.startAt,
      table.endAt,
    ),
    check(
      "creator_calendar_events_range_check",
      sql`${table.endAt} > ${table.startAt}`,
    ),
    check(
      "creator_calendar_events_revision_check",
      sql`${table.revision} >= 1`,
    ),
  ],
);

export const calendarProviderConnections = pgTable(
  "calendar_provider_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("active"),
    providerSubjectHash: text("provider_subject_hash").notNull(),
    calendarIdCiphertext: text("calendar_id_ciphertext"),
    refreshTokenCiphertext: text("refresh_token_ciphertext").notNull(),
    tokenKeyVersion: integer("token_key_version").notNull().default(1),
    grantedScopes: text("granted_scopes")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    syncCursorCiphertext: text("sync_cursor_ciphertext"),
    syncPolicy: text("sync_policy").notNull().default("approved-events"),
    revision: revision(),
    consentedAt: timestamp("consented_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("calendar_provider_connections_active_idx")
      .on(table.accountId, table.provider)
      .where(sql`${table.status} <> 'revoked'`),
    check(
      "calendar_provider_connections_provider_check",
      sql`${table.provider} in ('google','microsoft')`,
    ),
    check(
      "calendar_provider_connections_status_check",
      sql`${table.status} in ('active','paused','error','revoked')`,
    ),
    check(
      "calendar_provider_connections_policy_check",
      sql`${table.syncPolicy} in ('approved-events','automatic-missa-events')`,
    ),
  ],
);

export const calendarOauthStates = pgTable(
  "calendar_oauth_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    stateHash: text("state_hash").notNull(),
    pkceVerifierCiphertext: text("pkce_verifier_ciphertext").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    uniqueIndex("calendar_oauth_states_hash_idx").on(table.stateHash),
    index("calendar_oauth_states_expiry_idx").on(table.expiresAt),
    check(
      "calendar_oauth_states_provider_check",
      sql`${table.provider} in ('google','microsoft')`,
    ),
  ],
);

export const calendarEventProjections = pgTable(
  "calendar_event_projections",
  {
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => calendarProviderConnections.id, {
        onDelete: "cascade",
      }),
    eventId: text("event_id").notNull(),
    providerEventIdCiphertext: text("provider_event_id_ciphertext").notNull(),
    sourceRevision: integer("source_revision").notNull(),
    status: text("status").notNull().default("active"),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.connectionId, table.eventId] }),
    check(
      "calendar_event_projections_status_check",
      sql`${table.status} in ('active','delete-pending','deleted','error')`,
    ),
  ],
);
export const calendarSyncJobs = pgTable(
  "calendar_sync_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => calendarProviderConnections.id, {
        onDelete: "cascade",
      }),
    eventId: text("event_id"),
    operation: text("operation").notNull(),
    status: text("status").notNull().default("queued"),
    dedupeKey: text("dedupe_key").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("calendar_sync_jobs_dedupe_idx").on(
      table.connectionId,
      table.dedupeKey,
    ),
    index("calendar_sync_jobs_ready_idx").on(
      table.status,
      table.nextAttemptAt,
      table.createdAt,
    ),
    check(
      "calendar_sync_jobs_operation_check",
      sql`${table.operation} in ('upsert','delete','bootstrap')`,
    ),
    check(
      "calendar_sync_jobs_status_check",
      sql`${table.status} in ('queued','running','succeeded','failed','cancelled')`,
    ),
    check("calendar_sync_jobs_attempts_check", sql`${table.attemptCount} >= 0`),
  ],
);

export const creatorLibraryWorks = pgTable(
  "creator_library_works",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("creator_library_works_account_idx").on(
      table.accountId,
      table.updatedAt,
    ),
    check("creator_library_works_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const creatorLibraryFiles = pgTable(
  "creator_library_files",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    workId: text("work_id").references(() => creatorLibraryWorks.id, {
      onDelete: "restrict",
    }),
    storageKey: text("storage_key").notNull(),
    name: text("name").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("creator_library_files_storage_idx").on(
      table.accountId,
      table.storageKey,
    ),
    index("creator_library_files_work_idx").on(table.accountId, table.workId),
    check(
      "creator_library_files_size_check",
      sql`${table.sizeBytes} is null or ${table.sizeBytes} >= 0`,
    ),
    check("creator_library_files_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const creatorLibraryFileDeletions = pgTable(
  "creator_library_file_deletions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    fileId: text("file_id").notNull(),
    storageKey: text("storage_key").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("creator_library_file_deletions_pending_idx").on(
      table.status,
      table.updatedAt,
    ),
    check(
      "creator_library_file_deletions_status_check",
      sql`${table.status} in ('pending', 'deleted', 'failed')`,
    ),
    check(
      "creator_library_file_deletions_attempts_check",
      sql`${table.attempts} >= 0`,
    ),
  ],
);

export const creatorSavedAnswers = pgTable(
  "creator_saved_answers",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    answer: text("answer").notNull(),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("creator_saved_answers_account_idx").on(
      table.accountId,
      table.updatedAt,
    ),
    check("creator_saved_answers_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const trackerManualEntries = pgTable(
  "tracker_manual_entries",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    organizationName: text("organization_name"),
    status: text("status").notNull().default("interested"),
    sourceKind: text("source_kind").notNull().default("manual"),
    detail: jsonb("detail")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("tracker_manual_entries_account_idx").on(
      table.accountId,
      table.updatedAt,
    ),
    check("tracker_manual_entries_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const trackerLists = pgTable(
  "tracker_lists",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    colorToken: text("color_token"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("tracker_lists_account_name_idx").on(
      table.accountId,
      sql`lower(${table.name})`,
    ),
    check("tracker_lists_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const trackerListMemberships = pgTable(
  "tracker_list_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    listId: text("list_id")
      .notNull()
      .references(() => trackerLists.id, { onDelete: "cascade" }),
    targetKey: text("target_key").notNull(),
    trackedOpportunityId: text("tracked_opportunity_id").references(
      () => trackedOpportunities.id,
      { onDelete: "cascade" },
    ),
    manualEntryId: text("manual_entry_id").references(
      () => trackerManualEntries.id,
      { onDelete: "cascade" },
    ),
    createdAt,
  },
  (table) => [
    uniqueIndex("tracker_list_memberships_identity_idx").on(
      table.accountId,
      table.listId,
      table.targetKey,
    ),
    check(
      "tracker_list_memberships_target_check",
      sql`(${table.trackedOpportunityId} is null) <> (${table.manualEntryId} is null)`,
    ),
  ],
);

export const trackerChecklists = pgTable(
  "tracker_checklists",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    trackedOpportunityId: text("tracked_opportunity_id")
      .notNull()
      .references(() => trackedOpportunities.id, { onDelete: "cascade" }),
    trackedAt: timestamp("tracked_at", { withTimezone: true }).notNull(),
    sourceVersion: text("source_version"),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("tracker_checklists_tracked_idx").on(
      table.accountId,
      table.trackedOpportunityId,
    ),
    check("tracker_checklists_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const trackerChecklistItems = pgTable(
  "tracker_checklist_items",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    checklistId: text("checklist_id")
      .notNull()
      .references(() => trackerChecklists.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    normalizedKey: text("normalized_key").notNull(),
    position: integer("position").notNull(),
    note: text("note"),
    state: text("state").notNull().default("missing"),
    source: text("source").notNull(),
    sourceConfidence: text("source_confidence"),
    workId: text("work_id").references(() => creatorLibraryWorks.id, {
      onDelete: "restrict",
    }),
    fileId: text("file_id").references(() => creatorLibraryFiles.id, {
      onDelete: "restrict",
    }),
    savedAnswerId: text("saved_answer_id").references(
      () => creatorSavedAnswers.id,
      { onDelete: "restrict" },
    ),
    revision: revision(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("tracker_checklist_items_checklist_idx").on(
      table.accountId,
      table.checklistId,
    ),
    uniqueIndex("tracker_checklist_items_key_idx").on(
      table.accountId,
      table.checklistId,
      table.normalizedKey,
    ),
    check(
      "tracker_checklist_items_revision_check",
      sql`${table.revision} >= 1`,
    ),
    check(
      "tracker_checklist_items_position_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "tracker_checklist_items_state_check",
      sql`${table.state} in ('missing','ready','complete','not-applicable')`,
    ),
    check(
      "tracker_checklist_items_source_check",
      sql`${table.source} in ('opportunity-required-material','user-added')`,
    ),
    check(
      "tracker_checklist_items_confidence_check",
      sql`${table.sourceConfidence} is null or ${table.sourceConfidence} in ('high','possible','unknown')`,
    ),
  ],
);

export const submissionOutboundEvents = pgTable(
  "submission_outbound_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "restrict" }),
    destinationHost: text("destination_host"),
    destinationState: text("destination_state").notNull(),
    createdAt,
  },
  (table) => [
    index("submission_outbound_opp_idx").on(
      table.opportunityId,
      table.createdAt,
    ),
    index("submission_outbound_account_idx").on(
      table.accountId,
      table.createdAt,
    ),
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
    uniqueIndex("opportunity_issue_reports_idempotency_idx").on(
      table.idempotencyKey,
    ),
    index("opportunity_issue_reports_status_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

/**
 * Canonical, versioned taxonomy graph. A term belongs to one facet but can
 * have multiple broader/related terms, including terms in another facet.
 * Legacy opportunity text fields remain during the additive backfill.
 */
export const taxonomySchemes = pgTable(
  "taxonomy_schemes",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description").notNull(),
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("taxonomy_schemes_key_idx").on(table.key),
    check("taxonomy_schemes_version_check", sql`${table.version} >= 1`),
    check(
      "taxonomy_schemes_status_check",
      sql`${table.status} in ('draft', 'active', 'superseded', 'archived')`,
    ),
  ],
);

export const taxonomyFacets = pgTable(
  "taxonomy_facets",
  {
    id: text("id").primaryKey(),
    schemeId: text("scheme_id")
      .notNull()
      .references(() => taxonomySchemes.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description").notNull(),
    selectionMode: text("selection_mode").notNull().default("multiple"),
    userVisible: boolean("user_visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("taxonomy_facets_scheme_key_idx").on(table.schemeId, table.key),
    index("taxonomy_facets_scheme_order_idx").on(
      table.schemeId,
      table.sortOrder,
    ),
    check(
      "taxonomy_facets_key_check",
      sql`${table.key} in ('practice-family', 'discipline', 'form', 'genre', 'subgenre', 'medium', 'technique', 'mode', 'role', 'theme', 'audience', 'language')`,
    ),
    check(
      "taxonomy_facets_selection_check",
      sql`${table.selectionMode} in ('single', 'multiple', 'hierarchical')`,
    ),
    check("taxonomy_facets_order_check", sql`${table.sortOrder} >= 0`),
  ],
);

export const taxonomyTerms = pgTable(
  "taxonomy_terms",
  {
    id: text("id").primaryKey(),
    facetId: text("facet_id")
      .notNull()
      .references(() => taxonomyFacets.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    preferredLabel: text("preferred_label").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    selectable: boolean("selectable").notNull().default(true),
    culturallySensitive: boolean("culturally_sensitive")
      .notNull()
      .default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("taxonomy_terms_facet_slug_idx").on(table.facetId, table.slug),
    index("taxonomy_terms_facet_status_idx").on(
      table.facetId,
      table.status,
      table.sortOrder,
    ),
    index("taxonomy_terms_label_idx").on(table.preferredLabel),
    check(
      "taxonomy_terms_status_check",
      sql`${table.status} in ('draft', 'active', 'deprecated', 'archived')`,
    ),
    check("taxonomy_terms_order_check", sql`${table.sortOrder} >= 0`),
  ],
);

export const taxonomyTermLabels = pgTable(
  "taxonomy_term_labels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    termId: text("term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "cascade" }),
    languageCode: text("language_code").notNull().default("en"),
    regionCode: text("region_code"),
    label: text("label").notNull(),
    normalizedLabel: text("normalized_label").notNull(),
    kind: text("kind").notNull().default("alias"),
    sourceUrl: text("source_url"),
    createdAt,
  },
  (table) => [
    uniqueIndex("taxonomy_term_labels_unique_idx").on(
      table.termId,
      table.languageCode,
      table.normalizedLabel,
    ),
    index("taxonomy_term_labels_lookup_idx").on(
      table.normalizedLabel,
      table.languageCode,
    ),
    check(
      "taxonomy_term_labels_kind_check",
      sql`${table.kind} in ('preferred', 'alias', 'abbreviation', 'historical', 'source-label', 'community-name')`,
    ),
  ],
);

export const taxonomyTermRelations = pgTable(
  "taxonomy_term_relations",
  {
    subjectTermId: text("subject_term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "cascade" }),
    objectTermId: text("object_term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(),
    weight: integer("weight").notNull().default(100),
    sourceUrl: text("source_url"),
    createdAt,
  },
  (table) => [
    primaryKey({
      columns: [table.subjectTermId, table.objectTermId, table.relationType],
    }),
    index("taxonomy_term_relations_object_idx").on(
      table.objectTermId,
      table.relationType,
    ),
    check(
      "taxonomy_term_relations_type_check",
      sql`${table.relationType} in ('broader', 'related', 'exact-match', 'close-match', 'replaced-by', 'requires', 'usually-used-with')`,
    ),
    check(
      "taxonomy_term_relations_self_check",
      sql`${table.subjectTermId} <> ${table.objectTermId}`,
    ),
    check(
      "taxonomy_term_relations_weight_check",
      sql`${table.weight} between 0 and 100`,
    ),
  ],
);

export const taxonomyTermEvidence = pgTable(
  "taxonomy_term_evidence",
  {
    id: text("id").primaryKey(),
    termId: text("term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    authorityKind: text("authority_kind").notNull().default("other"),
    languageCode: text("language_code").notNull().default("en"),
    note: text("note"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("active"),
    createdAt,
  },
  (table) => [
    uniqueIndex("taxonomy_term_evidence_unique_idx").on(
      table.termId,
      table.url,
    ),
    index("taxonomy_term_evidence_term_idx").on(table.termId, table.status),
    check(
      "taxonomy_term_evidence_authority_check",
      sql`${table.authorityKind} in ('standards-body', 'professional-body', 'cultural-institution', 'community', 'publisher', 'academic', 'official-source', 'other')`,
    ),
    check(
      "taxonomy_term_evidence_status_check",
      sql`${table.status} in ('active', 'stale', 'disputed', 'withdrawn')`,
    ),
  ],
);

export const taxonomyTermRevisions = pgTable(
  "taxonomy_term_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    termId: text("term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "cascade" }),
    schemeVersion: integer("scheme_version").notNull(),
    changeKind: text("change_kind").notNull(),
    snapshot: jsonb("snapshot").notNull().$type<Record<string, unknown>>(),
    changedByAccountId: text("changed_by_account_id").references(
      () => accounts.id,
      { onDelete: "set null" },
    ),
    changeNote: text("change_note"),
    createdAt,
  },
  (table) => [
    index("taxonomy_term_revisions_term_idx").on(table.termId, table.createdAt),
    check(
      "taxonomy_term_revisions_version_check",
      sql`${table.schemeVersion} >= 1`,
    ),
    check(
      "taxonomy_term_revisions_kind_check",
      sql`${table.changeKind} in ('created', 'updated', 'renamed', 'reparented', 'deprecated', 'restored')`,
    ),
  ],
);

export const taxonomyExternalMappings = pgTable(
  "taxonomy_external_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    termId: text("term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "cascade" }),
    namespace: text("namespace").notNull(),
    externalValue: text("external_value").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    mappingType: text("mapping_type").notNull().default("exact"),
    confidence: integer("confidence").notNull().default(100),
    evidenceUrl: text("evidence_url"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("taxonomy_external_mappings_unique_idx").on(
      table.namespace,
      table.normalizedValue,
      table.termId,
    ),
    index("taxonomy_external_mappings_lookup_idx").on(
      table.namespace,
      table.normalizedValue,
    ),
    check(
      "taxonomy_external_mappings_type_check",
      sql`${table.mappingType} in ('exact', 'close', 'broad', 'narrow', 'legacy', 'unresolved')`,
    ),
    check(
      "taxonomy_external_mappings_confidence_check",
      sql`${table.confidence} between 0 and 100`,
    ),
  ],
);

export const opportunityTaxonomyTerms = pgTable(
  "opportunity_taxonomy_terms",
  {
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "restrict" }),
    sourceEvidenceId: text("source_evidence_id").references(
      () => opportunitySourceEvidence.id,
      { onDelete: "set null" },
    ),
    sourceSnapshotId: text("source_snapshot_id"),
    sourcePhrase: text("source_phrase"),
    normalizedPhrase: text("normalized_phrase"),
    assignmentOrigin: text("assignment_origin").notNull(),
    certainty: text("certainty").notNull().default("unknown"),
    primary: boolean("primary").notNull().default(false),
    reviewedByAccountId: text("reviewed_by_account_id").references(
      () => accounts.id,
      { onDelete: "set null" },
    ),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.opportunityId, table.termId] }),
    index("opportunity_taxonomy_terms_term_idx").on(
      table.termId,
      table.certainty,
      table.opportunityId,
    ),
    check(
      "opportunity_taxonomy_terms_origin_check",
      sql`${table.assignmentOrigin} in ('source', 'extractor', 'registry', 'backfill', 'organization', 'reviewer')`,
    ),
    check(
      "opportunity_taxonomy_terms_certainty_check",
      sql`${table.certainty} in ('confirmed', 'probable', 'inferred', 'unknown', 'rejected')`,
    ),
  ],
);

export const opportunitySourceTaxonomyTerms = pgTable(
  "opportunity_source_taxonomy_terms",
  {
    sourceId: text("source_id")
      .notNull()
      .references(() => opportunitySources.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "restrict" }),
    coverageKind: text("coverage_kind").notNull().default("accepts"),
    assignmentOrigin: text("assignment_origin").notNull().default("registry"),
    sourcePhrase: text("source_phrase"),
    confidence: integer("confidence").notNull().default(100),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.sourceId, table.termId, table.coverageKind] }),
    index("opportunity_source_taxonomy_terms_term_idx").on(
      table.termId,
      table.coverageKind,
    ),
    check(
      "opportunity_source_taxonomy_terms_coverage_check",
      sql`${table.coverageKind} in ('accepts', 'specializes', 'sometimes', 'excludes', 'unknown')`,
    ),
    check(
      "opportunity_source_taxonomy_terms_origin_check",
      sql`${table.assignmentOrigin} in ('source', 'registry', 'extractor', 'backfill', 'reviewer')`,
    ),
    check(
      "opportunity_source_taxonomy_terms_confidence_check",
      sql`${table.confidence} between 0 and 100`,
    ),
  ],
);

export const workTaxonomyTerms = pgTable(
  "work_taxonomy_terms",
  {
    workId: text("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "restrict" }),
    primary: boolean("primary").notNull().default(false),
    assignmentOrigin: text("assignment_origin").notNull().default("user"),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.workId, table.termId] }),
    index("work_taxonomy_terms_term_idx").on(table.termId, table.workId),
    check(
      "work_taxonomy_terms_origin_check",
      sql`${table.assignmentOrigin} in ('user', 'import', 'extractor', 'organization', 'reviewer')`,
    ),
  ],
);

export const submissionPathTaxonomyTerms = pgTable(
  "submission_path_taxonomy_terms",
  {
    submissionPathId: text("submission_path_id")
      .notNull()
      .references(() => submissionPaths.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "restrict" }),
    rule: text("rule").notNull().default("accepted"),
    required: boolean("required").notNull().default(false),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.submissionPathId, table.termId, table.rule] }),
    index("submission_path_taxonomy_terms_term_idx").on(
      table.termId,
      table.rule,
    ),
    check(
      "submission_path_taxonomy_terms_rule_check",
      sql`${table.rule} in ('accepted', 'preferred', 'required', 'excluded')`,
    ),
  ],
);

export const accountTaxonomyPreferences = pgTable(
  "account_taxonomy_preferences",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "restrict" }),
    preference: text("preference").notNull().default("include"),
    weight: integer("weight").notNull().default(100),
    origin: text("origin").notNull().default("explicit"),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.termId] }),
    index("account_taxonomy_preferences_term_idx").on(
      table.termId,
      table.preference,
    ),
    check(
      "account_taxonomy_preferences_preference_check",
      sql`${table.preference} in ('include', 'prefer', 'exclude')`,
    ),
    check(
      "account_taxonomy_preferences_origin_check",
      sql`${table.origin} in ('explicit', 'saved-search', 'import', 'legacy-backfill')`,
    ),
    check(
      "account_taxonomy_preferences_weight_check",
      sql`${table.weight} between 0 and 100`,
    ),
  ],
);

/** A coverage cell is the stable identity of one source-coverage question.
 * Its dimension key is a canonical serialization of its term set plus type,
 * geography, language, and tier. Counts are derived from memberships. */
export const sourceCoverageCells = pgTable(
  "source_coverage_cells",
  {
    id: text("id").primaryKey(),
    schemeId: text("scheme_id")
      .notNull()
      .references(() => taxonomySchemes.id, { onDelete: "restrict" }),
    dimensionKey: text("dimension_key").notNull(),
    opportunityType: text("opportunity_type").notNull(),
    geographyCode: text("geography_code").notNull().default("global"),
    languageCode: text("language_code").notNull().default("und"),
    sourceTier: integer("source_tier").notNull().default(0),
    minimumSources: integer("minimum_sources").notNull().default(3),
    minimumCanonicalSources: integer("minimum_canonical_sources")
      .notNull()
      .default(1),
    status: text("status").notNull().default("unassessed"),
    lastAssessedAt: timestamp("last_assessed_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    blockedReason: text("blocked_reason"),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("source_coverage_cells_dimension_idx").on(
      table.schemeId,
      table.dimensionKey,
    ),
    index("source_coverage_cells_gap_idx").on(
      table.status,
      table.nextReviewAt,
      table.opportunityType,
    ),
    index("source_coverage_cells_geography_idx").on(
      table.geographyCode,
      table.languageCode,
      table.status,
    ),
    check(
      "source_coverage_cells_type_check",
      sql`${table.opportunityType} in ('open-call', 'magazine', 'grant', 'award', 'fellowship', 'residency', 'festival', 'scholarship', 'conference', 'rfp', 'contest', 'pitch', 'exhibition', 'commission', 'other')`,
    ),
    check(
      "source_coverage_cells_tier_check",
      sql`${table.sourceTier} between 0 and 3`,
    ),
    check(
      "source_coverage_cells_minimum_check",
      sql`${table.minimumSources} >= 1 and ${table.minimumCanonicalSources} >= 0 and ${table.minimumCanonicalSources} <= ${table.minimumSources}`,
    ),
    check(
      "source_coverage_cells_status_check",
      sql`${table.status} in ('unassessed', 'gap', 'thin', 'covered', 'strong', 'blocked')`,
    ),
  ],
);

export const sourceCoverageCellTerms = pgTable(
  "source_coverage_cell_terms",
  {
    coverageCellId: text("coverage_cell_id")
      .notNull()
      .references(() => sourceCoverageCells.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "restrict" }),
    required: boolean("required").notNull().default(true),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.coverageCellId, table.termId] }),
    index("source_coverage_cell_terms_term_idx").on(
      table.termId,
      table.coverageCellId,
    ),
  ],
);

export const sourceCoverageMemberships = pgTable(
  "source_coverage_memberships",
  {
    coverageCellId: text("coverage_cell_id")
      .notNull()
      .references(() => sourceCoverageCells.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => opportunitySources.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    status: text("status").notNull().default("candidate"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.coverageCellId, table.sourceId, table.role] }),
    index("source_coverage_memberships_source_idx").on(
      table.sourceId,
      table.status,
    ),
    check(
      "source_coverage_memberships_role_check",
      sql`${table.role} in ('canonical', 'application', 'discovery', 'syndication', 'professional-body', 'funder')`,
    ),
    check(
      "source_coverage_memberships_status_check",
      sql`${table.status} in ('candidate', 'active', 'stale', 'rejected', 'blocked')`,
    ),
  ],
);

export const sourceDiscoveryQueries = pgTable(
  "source_discovery_queries",
  {
    id: text("id").primaryKey(),
    coverageCellId: text("coverage_cell_id")
      .notNull()
      .references(() => sourceCoverageCells.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    engine: text("engine").notNull().default("web"),
    locale: text("locale").notNull().default("en"),
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(0),
    cadenceHours: integer("cadence_hours").notNull().default(720),
    cursor: text("cursor"),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastError: text("last_error"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("source_discovery_queries_unique_idx").on(
      table.coverageCellId,
      table.query,
      table.locale,
    ),
    index("source_discovery_queries_due_idx").on(
      table.status,
      table.nextRunAt,
      table.priority,
    ),
    check(
      "source_discovery_queries_engine_check",
      sql`${table.engine} in ('web', 'directory', 'feed', 'partner', 'manual')`,
    ),
    check(
      "source_discovery_queries_status_check",
      sql`${table.status} in ('queued', 'running', 'complete', 'failed', 'paused', 'blocked')`,
    ),
    check(
      "source_discovery_queries_priority_check",
      sql`${table.priority} between -100 and 100`,
    ),
    check(
      "source_discovery_queries_cadence_check",
      sql`${table.cadenceHours} between 1 and 8760`,
    ),
    check(
      "source_discovery_queries_failures_check",
      sql`${table.consecutiveFailures} >= 0`,
    ),
  ],
);

export const sourceDiscoveryCandidates = pgTable(
  "source_discovery_candidates",
  {
    id: text("id").primaryKey(),
    queryId: text("query_id")
      .notNull()
      .references(() => sourceDiscoveryQueries.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    title: text("title"),
    snippet: text("snippet"),
    proposedKind: text("proposed_kind"),
    proposedTier: integer("proposed_tier"),
    status: text("status").notNull().default("discovered"),
    score: integer("score").notNull().default(0),
    rejectionReason: text("rejection_reason"),
    promotedSourceId: text("promoted_source_id").references(
      () => opportunitySources.id,
      { onDelete: "set null" },
    ),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("source_discovery_candidates_query_url_idx").on(
      table.queryId,
      table.normalizedUrl,
    ),
    index("source_discovery_candidates_review_idx").on(
      table.status,
      table.score,
      table.discoveredAt,
    ),
    index("source_discovery_candidates_url_idx").on(table.normalizedUrl),
    check(
      "source_discovery_candidates_tier_check",
      sql`${table.proposedTier} is null or ${table.proposedTier} between 0 and 3`,
    ),
    check(
      "source_discovery_candidates_status_check",
      sql`${table.status} in ('discovered', 'queued', 'reviewing', 'accepted', 'rejected', 'duplicate', 'blocked')`,
    ),
    check(
      "source_discovery_candidates_score_check",
      sql`${table.score} between 0 and 100`,
    ),
  ],
);

export const taxonomyChangeProposals = pgTable(
  "taxonomy_change_proposals",
  {
    id: text("id").primaryKey(),
    schemeId: text("scheme_id")
      .notNull()
      .references(() => taxonomySchemes.id, { onDelete: "restrict" }),
    termId: text("term_id").references(() => taxonomyTerms.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("open"),
    proposedByAccountId: text("proposed_by_account_id").references(
      () => accounts.id,
      { onDelete: "set null" },
    ),
    reviewedByAccountId: text("reviewed_by_account_id").references(
      () => accounts.id,
      { onDelete: "set null" },
    ),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    evidenceUrls: text("evidence_urls")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    decisionNote: text("decision_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("taxonomy_change_proposals_queue_idx").on(
      table.status,
      table.kind,
      table.createdAt,
    ),
    check(
      "taxonomy_change_proposals_kind_check",
      sql`${table.kind} in ('add-term', 'rename-term', 'add-alias', 'change-relation', 'deprecate-term', 'restore-term', 'merge-terms', 'split-term')`,
    ),
    check(
      "taxonomy_change_proposals_status_check",
      sql`${table.status} in ('open', 'researching', 'approved', 'rejected', 'applied', 'withdrawn')`,
    ),
  ],
);

/**
 * Platform-control-plane foundations. These tables are additive to the
 * compatibility stores: they record provider effects, operator CRM events,
 * billing-provider facts, and agent control intents without becoming a
 * second source of truth for product state.
 *
 * The matching SQL lives in registered migration 0014. The runtime adapter
 * guard remains for controlled bootstraps in environments that may lag the
 * migration.
 */
export const platformMessageEffects = pgTable(
  "platform_message_effects",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id"),
    accountId: text("account_id"),
    tenantKey: text("tenant_key").notNull(),
    recipientAccountId: text("recipient_account_id"),
    actorAccountId: text("actor_account_id"),
    kind: text("kind").notNull(),
    provider: text("provider").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    templateKey: text("template_key").notNull(),
    templateVersion: text("template_version").notNull(),
    status: text("status").notNull().default("queued"),
    providerMessageId: text("provider_message_id"),
    providerStatus: text("provider_status"),
    providerEventId: text("provider_event_id"),
    providerEventAt: timestamp("provider_event_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    disposition: text("disposition"),
    createdAt,
    updatedAt,
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
  },
  (table) => [
    uniqueIndex("platform_message_effects_tenant_idempotency_idx").on(
      table.tenantKey,
      table.idempotencyKey,
    ),
    index("platform_message_effects_status_idx").on(
      table.status,
      table.updatedAt,
    ),
    index("platform_message_effects_account_idx").on(
      table.accountId,
      table.createdAt,
    ),
    index("platform_message_effects_provider_message_idx")
      .on(table.provider, table.providerMessageId)
      .where(sql`${table.providerMessageId} is not null`),
    check(
      "platform_message_effects_status_check",
      sql`${table.status} in ('queued', 'attempted', 'accepted', 'delivered', 'bounced', 'failed', 'unknown', 'suppressed')`,
    ),
    check(
      "platform_message_effects_attempts_check",
      sql`${table.attemptCount} >= 0`,
    ),
  ],
);

export const platformMessageAttempts = pgTable(
  "platform_message_attempts",
  {
    id: text("id").primaryKey(),
    effectId: text("effect_id")
      .notNull()
      .references(() => platformMessageEffects.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("attempted"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    errorCode: text("error_code"),
    errorCategory: text("error_category"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
  },
  (table) => [
    uniqueIndex("platform_message_attempts_effect_attempt_idx").on(
      table.effectId,
      table.attemptNumber,
    ),
    index("platform_message_attempts_status_idx").on(
      table.status,
      table.startedAt,
    ),
    check(
      "platform_message_attempts_status_check",
      sql`${table.status} in ('attempted', 'accepted', 'failed')`,
    ),
    check(
      "platform_message_attempts_number_check",
      sql`${table.attemptNumber} >= 1`,
    ),
  ],
);

export const platformMessageProviderEvents = pgTable(
  "platform_message_provider_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    providerMessageId: text("provider_message_id"),
    effectId: text("effect_id").references(() => platformMessageEffects.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("received"),
    classification: text("classification"),
    failureCode: text("failure_code"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    createdAt,
  },
  (table) => [
    uniqueIndex("platform_message_provider_events_provider_id_idx").on(
      table.provider,
      table.providerEventId,
    ),
    index("platform_message_provider_events_message_idx").on(
      table.provider,
      table.providerMessageId,
      table.occurredAt,
    ),
    index("platform_message_provider_events_status_idx").on(
      table.status,
      table.createdAt,
    ),
    check(
      "platform_message_provider_events_status_check",
      sql`${table.status} in ('received', 'matched', 'unmatched', 'ignored')`,
    ),
  ],
);

export const platformCrmTimelineEvents = pgTable(
  "platform_crm_timeline_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id"),
    accountId: text("account_id"),
    tenantKey: text("tenant_key").notNull(),
    eventType: text("event_type").notNull(),
    source: text("source").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    actorAccountId: text("actor_account_id"),
    idempotencyKey: text("idempotency_key"),
    requestIdentity: text("request_identity"),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    createdAt,
  },
  (table) => [
    uniqueIndex("platform_crm_timeline_tenant_idempotency_idx").on(
      table.tenantKey,
      table.idempotencyKey,
    ),
    index("platform_crm_timeline_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("platform_crm_timeline_account_created_idx").on(
      table.accountId,
      table.createdAt,
    ),
    index("platform_crm_timeline_type_created_idx").on(
      table.eventType,
      table.createdAt,
    ),
    check(
      "platform_crm_timeline_subject_check",
      sql`(${table.organizationId} is not null)::int + (${table.accountId} is not null)::int = 1`,
    ),
  ],
);

export const platformBillingLedger = pgTable(
  "platform_billing_ledger",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id"),
    provider: text("provider").notNull().default("stripe"),
    providerEventId: text("provider_event_id").notNull(),
    providerObjectId: text("provider_object_id"),
    providerObjectType: text("provider_object_type"),
    receiptDigest: text("receipt_digest"),
    eventType: text("event_type").notNull(),
    entryType: text("entry_type").notNull(),
    status: text("status").notNull().default("received"),
    processingStatus: text("processing_status").notNull().default("received"),
    reconciliationVersion: integer("reconciliation_version")
      .notNull()
      .default(1),
    amountCents: integer("amount_cents"),
    currency: text("currency"),
    customerId: text("customer_id"),
    subscriptionId: text("subscription_id"),
    invoiceId: text("invoice_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("platform_billing_ledger_provider_event_idx").on(
      table.provider,
      table.providerEventId,
      table.entryType,
    ),
    index("platform_billing_ledger_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("platform_billing_ledger_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
    check(
      "platform_billing_ledger_status_check",
      sql`${table.status} in ('received', 'processed', 'failed', 'ignored')`,
    ),
    check(
      "platform_billing_ledger_amount_check",
      sql`${table.amountCents} is null or ${table.amountCents} >= 0`,
    ),
  ],
);

export const platformBillingProviderEventOutcomes = pgTable(
  "platform_billing_provider_event_outcomes",
  {
    id: text("id").primaryKey(),
    ledgerId: text("ledger_id")
      .notNull()
      .references(() => platformBillingLedger.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    errorCategory: text("error_category"),
    createdAt,
  },
  (table) => [
    index("platform_billing_provider_event_outcomes_ledger_idx").on(
      table.ledgerId,
      table.createdAt,
    ),
  ],
);

export const platformAgentControlRequests = pgTable(
  "platform_agent_control_requests",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    expectedState: text("expected_state"),
    action: text("action").notNull(),
    status: text("status").notNull().default("requested"),
    actorAccountId: text("actor_account_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    policyVersion: text("policy_version").notNull().default("agent-control.v1"),
    confirmationDigest: text("confirmation_digest"),
    requestIdentity: text("request_identity"),
    leaseOwner: text("lease_owner"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    reason: text("reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt,
    updatedAt,
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
  },
  (table) => [
    uniqueIndex("platform_agent_control_requests_domain_idempotency_idx").on(
      table.targetType,
      table.idempotencyKey,
    ),
    index("platform_agent_control_requests_target_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt,
    ),
    index("platform_agent_control_requests_status_idx").on(
      table.status,
      table.createdAt,
    ),
    check(
      "platform_agent_control_requests_status_check",
      sql`${table.status} in ('requested', 'processing', 'applied', 'rejected', 'failed', 'expired', 'cancelled', 'unknown')`,
    ),
    check(
      "platform_agent_control_requests_action_check",
      sql`${table.action} in ('pause', 'resume', 'cancel', 'replay', 'requeue', 'release-stale')`,
    ),
  ],
);

export const platformCrmContacts = pgTable(
  "platform_crm_contacts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id"),
    accountId: text("account_id"),
    tenantKey: text("tenant_key").notNull(),
    idempotencyKey: text("idempotency_key"),
    requestIdentity: text("request_identity"),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    email: text("email"),
    role: text("role"),
    status: text("status").notNull().default("active"),
    source: text("source").notNull().default("operator"),
    createdByAccountId: text("created_by_account_id"),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("platform_crm_contacts_org_email_idx").on(
      table.organizationId,
      sql`lower(${table.email})`,
    ),
    index("platform_crm_contacts_org_idx").on(
      table.organizationId,
      table.updatedAt,
    ),
    index("platform_crm_contacts_account_idx").on(
      table.accountId,
      table.updatedAt,
    ),
    check(
      "platform_crm_contacts_subject_check",
      sql`(${table.organizationId} is not null)::int + (${table.accountId} is not null)::int = 1`,
    ),
    check(
      "platform_crm_contacts_status_check",
      sql`${table.status} in ('active', 'inactive', 'lead')`,
    ),
    check("platform_crm_contacts_version_check", sql`${table.version} >= 1`),
    uniqueIndex("platform_crm_contacts_tenant_idempotency_idx").on(
      table.tenantKey,
      table.idempotencyKey,
    ),
  ],
);

export const platformCrmTasks = pgTable(
  "platform_crm_tasks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id"),
    accountId: text("account_id"),
    tenantKey: text("tenant_key").notNull(),
    idempotencyKey: text("idempotency_key"),
    requestIdentity: text("request_identity"),
    version: integer("version").notNull().default(1),
    contactId: text("contact_id").references(() => platformCrmContacts.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("open"),
    priority: integer("priority").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }),
    ownerAccountId: text("owner_account_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdByAccountId: text("created_by_account_id"),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("platform_crm_tasks_org_due_idx").on(
      table.organizationId,
      table.status,
      table.dueAt,
    ),
    index("platform_crm_tasks_owner_status_idx").on(
      table.ownerAccountId,
      table.status,
      table.dueAt,
    ),
    check(
      "platform_crm_tasks_subject_check",
      sql`(${table.organizationId} is not null)::int + (${table.accountId} is not null)::int = 1`,
    ),
    check(
      "platform_crm_tasks_status_check",
      sql`${table.status} in ('open', 'in-progress', 'done', 'snoozed', 'cancelled')`,
    ),
    check(
      "platform_crm_tasks_priority_check",
      sql`${table.priority} between -100 and 100`,
    ),
    check("platform_crm_tasks_version_check", sql`${table.version} >= 1`),
    uniqueIndex("platform_crm_tasks_tenant_idempotency_idx").on(
      table.tenantKey,
      table.idempotencyKey,
    ),
  ],
);

export const platformBillingActions = pgTable(
  "platform_billing_actions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    action: text("action").notNull(),
    provider: text("provider").notNull().default("stripe"),
    providerObjectId: text("provider_object_id"),
    amountCents: integer("amount_cents"),
    currency: text("currency"),
    entitlementKey: text("entitlement_key"),
    expectedState: text("expected_state"),
    expectedVersion: integer("expected_version"),
    policyVersion: text("policy_version").notNull(),
    actorAccountId: text("actor_account_id").notNull(),
    reasonCode: text("reason_code").notNull(),
    confirmationDigest: text("confirmation_digest").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestIdentity: text("request_identity").notNull(),
    status: text("status").notNull().default("requested"),
    leaseOwner: text("lease_owner"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    providerIdempotencyKey: text("provider_idempotency_key").notNull(),
    recoveryOfActionId: text("recovery_of_action_id"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("platform_billing_actions_org_idempotency_idx").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    index("platform_billing_actions_claim_idx").on(
      table.status,
      table.leaseUntil,
      table.createdAt,
    ),
  ],
);

export const platformBillingActionOutcomes = pgTable(
  "platform_billing_action_outcomes",
  {
    id: text("id").primaryKey(),
    actionId: text("action_id")
      .notNull()
      .references(() => platformBillingActions.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    errorCategory: text("error_category"),
    providerEventId: text("provider_event_id"),
    createdAt,
  },
  (table) => [
    index("platform_billing_action_outcomes_action_idx").on(
      table.actionId,
      table.createdAt,
    ),
  ],
);

export const platformEntitlementAdjustments = pgTable(
  "platform_entitlement_adjustments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    actionId: text("action_id")
      .notNull()
      .references(() => platformBillingActions.id, { onDelete: "restrict" }),
    entitlementKey: text("entitlement_key").notNull(),
    direction: text("direction").notNull(),
    version: integer("version").notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex("platform_entitlement_adjustments_action_idx").on(
      table.actionId,
    ),
  ],
);

export const platformAgentControlOutcomes = pgTable(
  "platform_agent_control_outcomes",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => platformAgentControlRequests.id, {
        onDelete: "restrict",
      }),
    status: text("status").notNull(),
    category: text("category").notNull(),
    checkpointAcknowledged: boolean("checkpoint_acknowledged")
      .notNull()
      .default(false),
    childRunId: text("child_run_id"),
    createdAt,
  },
  (table) => [
    index("platform_agent_control_outcomes_request_idx").on(
      table.requestId,
      table.createdAt,
    ),
    uniqueIndex("platform_agent_control_one_child_idx")
      .on(table.requestId)
      .where(sql`${table.childRunId} is not null`),
  ],
);

export const platformAnalyticsEvents = pgTable(
  "platform_analytics_events",
  {
    id: text("id").primaryKey(),
    eventName: text("event_name").notNull(),
    source: text("source").notNull(),
    accountId: text("account_id"),
    organizationId: text("organization_id"),
    sessionId: text("session_id"),
    path: text("path"),
    properties: jsonb("properties")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    idempotencyKey: text("idempotency_key"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt,
  },
  (table) => [
    uniqueIndex("platform_analytics_events_idempotency_idx").on(
      table.idempotencyKey,
    ),
    index("platform_analytics_events_name_time_idx").on(
      table.eventName,
      table.occurredAt,
    ),
    index("platform_analytics_events_account_time_idx").on(
      table.accountId,
      table.occurredAt,
    ),
    index("platform_analytics_events_org_time_idx").on(
      table.organizationId,
      table.occurredAt,
    ),
  ],
);

/**
 * Durable state for the first read-only assistant slice. Conversation state is
 * operational history; it is not authoritative opportunity or publication
 * state. Structured response metadata keeps evidence and evaluation fields
 * available without making the transcript the source of truth.
 */
export const chatConversations = pgTable(
  "chat_conversations",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    status: text("status").notNull().default("active"),
    title: text("title"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("chat_conversations_account_updated_idx").on(
      table.accountId,
      table.updatedAt,
    ),
    index("chat_conversations_organization_updated_idx").on(
      table.organizationId,
      table.updatedAt,
    ),
    check(
      "chat_conversations_status_check",
      sql`${table.status} in ('active', 'archived')`,
    ),
  ],
);

export const chatRuns = pgTable(
  "chat_runs",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => chatConversations.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    status: text("status").notNull().default("running"),
    intent: text("intent").notNull().default("opportunity-search"),
    graphVersion: text("graph_version").notNull().default("chat-baseline.v1"),
    idempotencyKey: text("idempotency_key").notNull(),
    inputMessageId: text("input_message_id"),
    outputMessageId: text("output_message_id"),
    error: text("error"),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("chat_runs_account_idempotency_idx").on(
      table.accountId,
      table.idempotencyKey,
    ),
    index("chat_runs_conversation_started_idx").on(
      table.conversationId,
      table.startedAt,
    ),
    index("chat_runs_organization_status_idx").on(
      table.organizationId,
      table.status,
      table.startedAt,
    ),
    check(
      "chat_runs_status_check",
      sql`${table.status} in ('running', 'completed', 'failed', 'blocked')`,
    ),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => chatConversations.id, { onDelete: "cascade" }),
    runId: text("run_id").references(() => chatRuns.id, {
      onDelete: "set null",
    }),
    sequence: integer("sequence").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    createdAt,
  },
  (table) => [
    uniqueIndex("chat_messages_conversation_sequence_idx").on(
      table.conversationId,
      table.sequence,
    ),
    index("chat_messages_run_idx").on(table.runId, table.createdAt),
    check(
      "chat_messages_role_check",
      sql`${table.role} in ('user', 'assistant')`,
    ),
    check("chat_messages_sequence_check", sql`${table.sequence} >= 0`),
  ],
);

export const chatRunEvents = pgTable(
  "chat_run_events",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => chatRuns.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    createdAt,
  },
  (table) => [
    uniqueIndex("chat_run_events_run_sequence_idx").on(
      table.runId,
      table.sequence,
    ),
    index("chat_run_events_type_created_idx").on(
      table.eventType,
      table.createdAt,
    ),
    check("chat_run_events_sequence_check", sql`${table.sequence} >= 0`),
  ],
);

export const trackerImportReceipts = pgTable(
  "tracker_import_receipts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    userId: text("user_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    sourceHash: text("source_hash").notNull(),
    createdAt,
    result: jsonb("result").notNull().$type<Record<string, unknown>>(),
  },
  (table) => [
    uniqueIndex("tracker_import_receipts_account_key_idx").on(
      table.accountId,
      table.idempotencyKey,
    ),
    index("tracker_import_receipts_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const trackerImportRateEvents = pgTable(
  "tracker_import_rate_events",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    kind: text("kind").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("tracker_import_rate_events_scope_idx").on(
      table.accountId,
      table.kind,
      table.occurredAt,
    ),
    check(
      "tracker_import_rate_events_kind_check",
      sql`${table.kind} in ('preview', 'commit')`,
    ),
  ],
);

export const waitlistSignups = pgTable(
  "waitlist_signups",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    source: text("source").notNull().default("/waitlist"),
    campaign: jsonb("campaign")
      .notNull()
      .$type<Record<string, string>>()
      .default(sql`'{}'::jsonb`),
    createdAt,
  },
  (table) => [uniqueIndex("waitlist_signups_email_idx").on(table.email)],
);

export const waitlistInvites = pgTable(
  "waitlist_invites",
  {
    id: text("id").primaryKey(),
    waitlistSignupId: text("waitlist_signup_id")
      .notNull()
      .references(() => waitlistSignups.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    state: text("state").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    redeemedByAccountId: text("redeemed_by_account_id").references(
      () => accounts.id,
      { onDelete: "set null" },
    ),
  },
  (table) => [
    uniqueIndex("waitlist_invites_token_hash_idx").on(table.tokenHash),
    index("waitlist_invites_signup_idx").on(table.waitlistSignupId),
    index("waitlist_invites_redeemed_account_idx").on(
      table.redeemedByAccountId,
    ),
    check(
      "waitlist_invites_state_check",
      sql`${table.state} in ('sent', 'redeemed', 'expired', 'revoked')`,
    ),
  ],
);


const portfolioBytes = customType<{data:Buffer}>({dataType:()=>"bytea"});
export const creatorPortfolioDrafts = pgTable("creator_portfolio_drafts", {
 accountId:text("account_id").primaryKey().references(()=>accounts.id,{onDelete:"cascade"}),
 draftData:jsonb("draft_data").notNull().default({}),
 revision:integer("revision").notNull().default(0),
 publishedData:jsonb("published_data"),
 publishedAt:timestamp("published_at",{withTimezone:true}),
 publishedMediaIds:uuid("published_media_ids").array().notNull().default(sql`'{}'::uuid[]`),
 updatedAt,
});
export const creatorPortfolioMedia = pgTable("creator_portfolio_media", {
 id:uuid("id").primaryKey(),
 accountId:text("account_id").notNull().references(()=>accounts.id,{onDelete:"cascade"}),
 contentType:text("content_type").notNull(),bytes:portfolioBytes("bytes").notNull(),createdAt,
},table=>[index("creator_portfolio_media_owner_idx").on(table.accountId),check("creator_portfolio_media_bytes_check",sql`octet_length(${table.bytes}) BETWEEN 1 AND 20971520`)]);
