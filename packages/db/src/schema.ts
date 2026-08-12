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
    uniqueIndex("submissions_submitter_path_idempotency_idx").on(
      table.submitterAccountId,
      table.submissionPathId,
      table.idempotencyKey,
    ),
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
    index("opportunity_sources_trust_idx").on(table.trustStatus, table.trustScore),
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
    publicationState: text("publication_state").notNull().default("published"),
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
    content: jsonb("content")
      .notNull()
      .$type<Record<string, unknown>>(),
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
    check("radar_content_review_jobs_attempts_check", sql`${table.attempts} >= 0`),
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
    reviewerAccountId: text("reviewer_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
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
  (table) => [
    index("saved_searches_account_idx").on(table.accountId, table.updatedAt),
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
    uniqueIndex("tracked_status_events_idempotency_idx").on(
      table.idempotencyKey,
    ),
    index("tracked_status_events_tracked_idx").on(
      table.trackedOpportunityId,
      table.createdAt,
    ),
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
    kind: text("kind").notNull(),
    provider: text("provider").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("pending"),
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
    createdAt,
    updatedAt,
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
  },
  (table) => [
    uniqueIndex("platform_message_effects_idempotency_idx").on(
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
      sql`${table.status} in ('pending', 'sending', 'sent', 'failed', 'suppressed')`,
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
    status: text("status").notNull().default("started"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
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
      sql`${table.status} in ('started', 'sent', 'failed')`,
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
    eventType: text("event_type").notNull(),
    source: text("source").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    actorAccountId: text("actor_account_id"),
    idempotencyKey: text("idempotency_key"),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    createdAt,
  },
  (table) => [
    uniqueIndex("platform_crm_timeline_idempotency_idx").on(
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
    eventType: text("event_type").notNull(),
    entryType: text("entry_type").notNull(),
    status: text("status").notNull().default("received"),
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
    uniqueIndex("platform_agent_control_requests_idempotency_idx").on(
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
      sql`${table.status} in ('requested', 'accepted', 'applied', 'rejected', 'failed', 'cancelled')`,
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
      sql`${table.organizationId} is not null or ${table.accountId} is not null`,
    ),
    check(
      "platform_crm_contacts_status_check",
      sql`${table.status} in ('active', 'inactive', 'lead')`,
    ),
  ],
);

export const platformCrmTasks = pgTable(
  "platform_crm_tasks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id"),
    accountId: text("account_id"),
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
      sql`${table.organizationId} is not null or ${table.accountId} is not null`,
    ),
    check(
      "platform_crm_tasks_status_check",
      sql`${table.status} in ('open', 'in-progress', 'done', 'snoozed', 'cancelled')`,
    ),
    check(
      "platform_crm_tasks_priority_check",
      sql`${table.priority} between -100 and 100`,
    ),
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
    result: jsonb("result")
      .notNull()
      .$type<Record<string, unknown>>(),
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
