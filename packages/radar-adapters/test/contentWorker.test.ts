import assert from "node:assert/strict";
import test from "node:test";
import { SEED_CONTENT_JOBS_SQL } from "../src/contentWorker.js";

test("content jobs requeue after fresh high-confidence lifecycle evidence", () => {
  assert.match(SEED_CONTENT_JOBS_SQL, /opportunity_lifecycle_evidence/);
  assert.match(SEED_CONTENT_JOBS_SQL, /decision = 'apply' and confidence = 'high'/);
  assert.match(SEED_CONTENT_JOBS_SQL, /input_version is distinct from excluded.input_version/);
});
