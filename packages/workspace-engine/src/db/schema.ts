/**
 * Drizzle schema for the Workspace domain -- kept as the typed reference for
 * db/postgresStore.ts's hand-written SQL (see that file's schema.sql
 * sibling), mirroring radar-adapters/src/postgresStore.ts's pattern for the
 * Radar domain. Built incrementally, one table per story, per the
 * implementation-readiness fix to Story 1.3:
 *   Story 6.1 -> entities, programs
 *   Story 6.2 -> open_calls
 *   Story 6.3 -> submission_paths
 *   Story 6.5 -> submissions, works (added retroactively -- this table
 *     was missed when 6.5's in-memory store was built; caught while
 *     adding Story 7.2's tables)
 *   Story 7.2 -> review_rounds, review_assignments
 *   Story 7.3 -> review_recommendations
 * Later stories (8.1, 8.3) add decisions/delivery_tasks here when built.
 *
 * snake_case table/column names throughout, matching
 * packages/radar-adapters/src/postgresSchema.sql's existing convention.
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
});

export const works = pgTable('works', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull().references(() => submissions.id),
  title: text('title').notNull(),
  // Data-URI values only for now (no file storage adapter yet -- see Story
  // 6.5's dev notes); text, not jsonb, since it's a single opaque string.
  fileUrl: text('file_url'),
  order: integer('order').notNull(),
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
