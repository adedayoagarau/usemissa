/**
 * Drizzle schema for the Workspace domain -- kept as the typed reference for
 * db/postgresSchema.ts's hand-written SQL string, mirroring
 * radar-adapters/src/postgresStore.ts's pattern for the Radar domain. Built
 * incrementally, one table per story, per the
 * implementation-readiness fix to Story 1.3:
 *   Story 6.1 -> entities, programs
 *   Story 6.2 -> open_calls
 *   Story 6.3 -> submission_paths
 *   Story 6.5 -> submissions, works (added retroactively -- this table
 *     was missed when 6.5's in-memory store was built; caught while
 *     adding Story 7.2's tables)
 *   Story 7.2 -> review_rounds, review_assignments
 *   Story 7.3 -> review_recommendations
 * Story 8.1 -> decisions; Story 8.3 adds delivery_tasks.
 *
 * snake_case table/column names throughout, matching
 * packages/radar-adapters/src/postgresSchema.ts's existing convention.
 */
import { pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const entities = pgTable('entities', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  label: text('label'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const programs = pgTable('programs', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull().references(() => entities.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const openCalls = pgTable('open_calls', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull().references(() => programs.id),
  title: text('title').notNull(),
  status: text('status').notNull(), // 'draft' | 'published' | 'closed'
  radarOpportunityId: text('radar_opportunity_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  guidelineUrl: text('guideline_url'),
  guidelineText: text('guideline_text'),
  guidelineSourceType: text('guideline_source_type'),
  guidelineImportedAt: timestamp('guideline_imported_at', { withTimezone: true }),
  guidelineImportReport: jsonb('guideline_import_report'),
});

export const submissionPaths = pgTable('submission_paths', {
  id: text('id').primaryKey(),
  openCallId: text('open_call_id').notNull().references(() => openCalls.id),
  categories: jsonb('categories').notNull().$type<string[]>(),
  fields: jsonb('fields').notNull().$type<Array<{ id: string; type: string; label: string; required: boolean; order: number }>>(),
  feeCents: integer('fee_cents'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const submissions = pgTable('submissions', {
  id: text('id').primaryKey(),
  submissionPathId: text('submission_path_id').notNull().references(() => submissionPaths.id),
  submitterAccountId: text('submitter_account_id').notNull(),
  status: text('status').notNull(), // 'submitted' | 'in-review' | 'decided' | 'withdrawn'
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull(),
  paymentStatus: text('payment_status').notNull().default('not-required'),
  paymentSessionId: text('payment_session_id'),
  feeCents: integer('fee_cents'),
  idempotencyKey: text('idempotency_key'),
  answers: jsonb('answers').$type<Record<string, string | string[]>>(),
  category: text('category'),
});

export const submissionDrafts = pgTable('submission_drafts', {
  id: text('id').primaryKey(),
  submissionPathId: text('submission_path_id').notNull().references(() => submissionPaths.id),
  submitterAccountId: text('submitter_account_id').notNull(),
  answers: jsonb('answers').notNull().$type<Record<string, string | string[]>>(),
  category: text('category'),
  workTitles: jsonb('work_titles').notNull().$type<string[]>(),
  idempotencyKey: text('idempotency_key'),
  paymentSessionId: text('payment_session_id'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const works = pgTable('works', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull().references(() => submissions.id),
  title: text('title').notNull(),
  // Data-URI values only for now (no file storage adapter yet -- see Story
  // 6.5's dev notes); text, not jsonb, since it's a single opaque string.
  fileUrl: text('file_url'),
  fileUrls: jsonb('file_urls').$type<string[]>(),
  order: integer('order').notNull(),
});

export const decisions = pgTable('decisions', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().unique().references(() => works.id),
  outcome: text('outcome').notNull(), // 'accepted' | 'declined' | 'waitlisted'
  decidedByAccountId: text('decided_by_account_id').notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }).notNull(),
});

export const workspaceAuditLog = pgTable('workspace_audit_log', {
  id: text('id').primaryKey(),
  at: timestamp('at', { withTimezone: true }).notNull(),
  accountId: text('account_id'),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  detail: text('detail'),
});

export const reviewRounds = pgTable('review_rounds', {
  id: text('id').primaryKey(),
  openCallId: text('open_call_id').notNull().references(() => openCalls.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const reviewAssignments = pgTable('review_assignments', {
  id: text('id').primaryKey(),
  reviewRoundId: text('review_round_id').notNull().references(() => reviewRounds.id),
  submissionId: text('submission_id').notNull().references(() => submissions.id),
  reviewerAccountId: text('reviewer_account_id').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const reviewRecommendations = pgTable('review_recommendations', {
  reviewAssignmentId: text('review_assignment_id').primaryKey().references(() => reviewAssignments.id),
  score: integer('score'),
  notes: text('notes'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
});

export const deliveryTasks = pgTable('delivery_tasks', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().unique().references(() => works.id),
  status: text('status').notNull(),
  dueDate: text('due_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
