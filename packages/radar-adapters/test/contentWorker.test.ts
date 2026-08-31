import assert from "node:assert/strict";
import test from "node:test";
import { CONTENT_APPROVAL_HANDOFF_SQL, REQUEUE_LEGACY_CONTENT_SQL, SEED_CONTENT_JOBS_SQL } from "../src/contentWorker.js";

test("content jobs requeue after fresh high-confidence lifecycle evidence", () => {
  assert.match(SEED_CONTENT_JOBS_SQL, /opportunity_lifecycle_evidence/);
  assert.match(SEED_CONTENT_JOBS_SQL, /decision = 'apply' and confidence = 'high'/);
  assert.match(SEED_CONTENT_JOBS_SQL, /input_version is distinct from excluded.input_version/);
});

test("new review policy requeues legacy writer holds and wakes publication", () => {
  assert.match(REQUEUE_LEGACY_CONTENT_SQL, /reviewPolicyVersion/);
  assert.match(REQUEUE_LEGACY_CONTENT_SQL, /job.status = 'needs-human'/);
  assert.match(CONTENT_APPROVAL_HANDOFF_SQL, /last_changed_at = now\(\)/);
  assert.match(CONTENT_APPROVAL_HANDOFF_SQL, /publication_state = 'reviewable'/);
});
