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
      sql`${table.role} in ('member', 'admin')`,
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
    updatedAt,
  },
  (table) => [
    index("submissions_path_status_idx").on(
      table.submissionPathId,
      table.status,
    ),
    index("submissions_submitter_idx").on(table.submitterAccountId),
    check(
      "submissions_status_check",
      sql`${table.status} in ('submitted', 'in-review', 'decided', 'withdrawn')`,
    ),
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

/** Normalized profile boundary. The radar_users JSON document remains a
 * compatibility read/write path while new profile APIs migrate to these
 * account-scoped tables. */
export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    pronouns: text("pronouns"),
    location: text("location"),
    bio: text("bio"),
    disciplines: text("disciplines").array().notNull().default(sql`ARRAY[]::text[]`),
    genres: text("genres").array().notNull().default(sql`ARRAY[]::text[]`),
    careerStage: text("career_stage"),
    languages: text("languages").array().notNull().default(sql`ARRAY[]::text[]`),
    eligibility: jsonb("eligibility").notNull().$type<Record<string, string>>().default({}),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("profiles_account_idx").on(table.accountId)],
);

export const profilePreferences = pgTable(
  "profile_preferences",
  {
    profileId: text("profile_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    disciplines: text("disciplines").array().notNull().default(sql`ARRAY[]::text[]`),
    locations: text("locations").array().notNull().default(sql`ARRAY[]::text[]`),
    languages: text("languages").array().notNull().default(sql`ARRAY[]::text[]`),
    noFeeOnly: boolean("no_fee_only").notNull().default(false),
    maxFeeCents: integer("max_fee_cents"),
    deadlineWithinDays: integer("deadline_within_days"),
    simultaneousRequired: boolean("simultaneous_required").notNull().default(false),
    updatedAt,
  },
  (table) => [
    check("profile_preferences_fee_check", sql`${table.maxFeeCents} is null or ${table.maxFeeCents} >= 0`),
    check("profile_preferences_deadline_check", sql`${table.deadlineWithinDays} is null or ${table.deadlineWithinDays} > 0`),
  ],
);

export const profilePrivacy = pgTable("profile_privacy", {
  profileId: text("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  publicProfile: boolean("public_profile").notNull().default(false),
  showLocation: boolean("show_location").notNull().default(false),
  shareContact: boolean("share_contact").notNull().default(false),
  shareMaterialsByDefault: boolean("share_materials_by_default").notNull().default(false),
  updatedAt,
});

export const profileMaterials = pgTable(
  "profile_materials",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    content: text("content"),
    url: text("url"),
    storageKey: text("storage_key"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    status: text("status").notNull().default("draft"),
    visibility: text("visibility").notNull().default("private"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("profile_materials_account_idx").on(table.accountId, table.updatedAt),
    check("profile_materials_status_check", sql`${table.status} in ('draft', 'ready', 'needs-review', 'archived')`),
    check("profile_materials_visibility_check", sql`${table.visibility} in ('private', 'submission-only', 'public')`),
    check("profile_materials_size_check", sql`${table.sizeBytes} is null or ${table.sizeBytes} >= 0`),
  ],
);

export const submissionDrafts = pgTable(
  "submission_drafts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("draft"),
    note: text("note"),
    createdAt,
    updatedAt,
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => [
    index("submission_drafts_account_idx").on(table.accountId, table.updatedAt),
    index("submission_drafts_opportunity_idx").on(table.opportunityId, table.status),
    check("submission_drafts_status_check", sql`${table.status} in ('draft', 'ready', 'submitted', 'withdrawn')`),
  ],
);

export const submissionDraftMaterials = pgTable(
  "submission_draft_materials",
  {
    id: text("id").primaryKey(),
    draftId: text("draft_id")
      .notNull()
      .references(() => submissionDrafts.id, { onDelete: "cascade" }),
    materialId: text("material_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    url: text("url"),
    materialUpdatedAt: timestamp("material_updated_at", { withTimezone: true }).notNull(),
    createdAt,
  },
  (table) => [index("submission_draft_materials_draft_idx").on(table.draftId, table.createdAt)],
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
