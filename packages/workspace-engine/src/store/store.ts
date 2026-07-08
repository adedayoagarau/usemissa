import type {
  Entity,
  Program,
  OpenCall,
  SubmissionPath,
  Submission,
  Work,
  ReviewRound,
  ReviewAssignment,
  ReviewRecommendation,
} from '../domain/types.js';

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
  works: Map<string, Work>;
  reviewRounds: Map<string, ReviewRound>;
  reviewAssignments: Map<string, ReviewAssignment>;
  /** Keyed by reviewAssignmentId -- one recommendation per assignment. */
  reviewRecommendations: Map<string, ReviewRecommendation>;
}

export function createStore(): WorkspaceStore {
  return {
    entities: new Map(),
    programs: new Map(),
    openCalls: new Map(),
    submissionPaths: new Map(),
    submissions: new Map(),
    works: new Map(),
    reviewRounds: new Map(),
    reviewAssignments: new Map(),
    reviewRecommendations: new Map(),
  };
}

let nextId = 1;
export function nextIdFor(prefix: string): string {
  return `${prefix}_${String(nextId++).padStart(4, '0')}`;
}

/** Test/dev helper to make id generation deterministic across a test run. */
export function resetIdsForTest(): void {
  nextId = 1;
}
