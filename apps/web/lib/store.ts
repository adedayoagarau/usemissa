import { createStore, type RadarStore } from '@missa/radar-engine';

/**
 * Story 1.2 scaffold: a single in-memory store shared across route handlers
 * in this process. This is a placeholder composition root, not the
 * production wiring -- Epic 2 (Passport auth UI) is where real persistence
 * (Postgres, via the same pattern radar-adapters/src/serve.ts already
 * establishes) needs to land before this holds real user data.
 */
let store: RadarStore | undefined;

export function getStore(): RadarStore {
  if (!store) store = createStore();
  return store;
}
