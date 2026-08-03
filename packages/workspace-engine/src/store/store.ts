import type {
  Entity,
  Program,
  OpenCall,
  SubmissionPath,
  Submission,
  SubmissionDraft,
  Work,
  ReviewRound,
  ReviewAssignment,
  ReviewRecommendation,
  Decision,
  DeliveryTask,
} from '../domain/types.js';
import type { AuditEntry } from '@missa/radar-engine';

/**
 * In-memory store for the Workspace domain -- mirrors radar-engine's
 * store/store.ts pattern (a plain object of Maps + a createStore() factory)
 * deliberately, so this package feels like the same codebase as radar-engine
 * to someone reading it, per the architecture doc's Implementation Patterns.
 *
 * This is the "built-in adapter." A Postgres adapter (via the Drizzle schema
 * in db/schema.ts) is the production swap-in, following the exact same
 * ports-and-adapters split radar-engine already established -- not built in
 * this session (no live Postgres available to develop it against), but the
 * schema exists so it's the next concrete step, not a design unknown.
 */
export interface WorkspaceStore {
  entities: Map<string, Entity>;
  programs: Map<string, Program>;
  openCalls: Map<string, OpenCall>;
  submissionPaths: Map<string, SubmissionPath>;
  submissions: Map<string, Submission>;
  submissionDrafts: Map<string, SubmissionDraft>;
  works: Map<string, Work>;
  reviewRounds: Map<string, ReviewRound>;
  reviewAssignments: Map<string, ReviewAssignment>;
  /** Keyed by reviewAssignmentId -- one recommendation per assignment. */
  reviewRecommendations: Map<string, ReviewRecommendation>;
  /** Append-only audit entries for Workspace mutations (including decisions). */
  auditLog: AuditEntry[];
  /** One Decision per Work. Keyed by decision id; workId is unique by domain rule. */
  decisions: Map<string, Decision>;
  /** One delivery task per accepted Work in the MVP. */
  deliveryTasks: Map<string, DeliveryTask>;
}

export function createStore(): WorkspaceStore {
  return {
    entities: new Map(),
    programs: new Map(),
    openCalls: new Map(),
    submissionPaths: new Map(),
    submissions: new Map(),
    submissionDrafts: new Map(),
    works: new Map(),
    reviewRounds: new Map(),
    reviewAssignments: new Map(),
    reviewRecommendations: new Map(),
    auditLog: [],
    decisions: new Map(),
    deliveryTasks: new Map(),
  };
}
