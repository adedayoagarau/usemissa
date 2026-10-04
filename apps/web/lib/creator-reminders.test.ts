import assert from "node:assert/strict";
import test from "node:test";

import { reminderInput } from "./creator-reminders.ts";

const baseDeadline = {
  opportunityId: "art-worker-artist-grant",
  kind: "deadline" as const,
  offsetDays: 0 as const,
  timezone: "America/Los_Angeles",
};

test("accepts a selected deadline reminder time", () => {
  const result = reminderInput.safeParse({
    ...baseDeadline,
    timeOfDay: "16:30",
  });
  assert.equal(result.success, true);
  if (result.success && result.data.kind === "deadline")
    assert.equal(result.data.timeOfDay, "16:30");
});

test("keeps 9am compatibility for an older deadline reminder client", () => {
  const result = reminderInput.safeParse(baseDeadline);
  assert.equal(result.success, true);
  if (result.success && result.data.kind === "deadline")
    assert.equal(result.data.timeOfDay, "09:00");
});

test("rejects malformed deadline reminder times", () => {
  assert.equal(
    reminderInput.safeParse({ ...baseDeadline, timeOfDay: "25:00" }).success,
    false,
  );
  assert.equal(
    reminderInput.safeParse({ ...baseDeadline, timeOfDay: "4pm" }).success,
    false,
  );
});

test("reminder queries name the 0088 subject columns only when the database has them", async () => {
  const { reminderListSql, ownReminderSql, ownReminderUpsertSql } = await import("./creator-reminders.ts");
  for (const sql of [reminderListSql(false), ownReminderSql(false), ownReminderUpsertSql(false)])
    assert.doesNotMatch(sql, /subject_kind|subject_id/);
  assert.match(reminderListSql(false), /null::text as "subjectKind",null::text as "subjectId"/);
  assert.match(ownReminderUpsertSql(false), /on conflict\(account_id,opportunity_id,kind\) do update/);
  assert.match(reminderListSql(true), /r\.subject_kind as "subjectKind"/);
  assert.match(ownReminderSql(true), /subject_kind is null and subject_id is null/);
  assert.match(ownReminderUpsertSql(true), /coalesce\(subject_kind,''\),coalesce\(subject_id,''\)/);
});

test("tier and milestone titles are worded for the day they are delivered", async () => {
  const { deliveryTitle } = await import("./creator-reminders.ts");
  const base = { title: "stored", subject_date: "2026-10-10", local_today: "2026-10-10", milestone_label: null, tier_facts: null };
  assert.equal(deliveryTitle({ ...base, kind: "milestone", milestone_label: "Final draft" }), "Final draft is due today");
  assert.equal(
    deliveryTitle({ ...base, kind: "tier", tier_facts: { label: "Early-bird", feeCents: 2500, currency: "USD", nextLabel: "Regular", nextFeeCents: 4000 } }),
    "Early-bird closes today, $15 less than the regular fee",
  );
  assert.equal(deliveryTitle({ ...base, kind: "deadline" }), "stored");
  assert.equal(deliveryTitle({ ...base, kind: "milestone" }), "stored", "falls back without the subject");
});
