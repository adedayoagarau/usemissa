import { sql } from "drizzle-orm";
import {
  check,
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
