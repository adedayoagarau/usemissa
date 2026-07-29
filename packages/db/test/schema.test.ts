import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  auditEvents,
  memberships,
  outboxEvents,
  reviewAssignments,
} from "../src/schema.js";

test("platform schema carries tenant, audit, outbox, and reviewer indexes", () => {
  const membershipConfig = getTableConfig(memberships);
  const auditConfig = getTableConfig(auditEvents);
  const outboxConfig = getTableConfig(outboxEvents);
  const assignmentConfig = getTableConfig(reviewAssignments);

  assert.ok(membershipConfig.primaryKeys.length === 1);
  assert.ok(
    auditConfig.indexes.some(
      (index) => index.config.name === "audit_events_org_created_idx",
    ),
  );
  assert.ok(
    outboxConfig.indexes.some(
      (index) => index.config.name === "outbox_events_pending_idx",
    ),
  );
  assert.ok(
    assignmentConfig.indexes.some(
      (index) => index.config.name === "review_assignments_unique_idx",
    ),
  );
});
