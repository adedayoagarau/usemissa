import assert from "node:assert/strict";
import test from "node:test";

import { CreatorConflictError, ObligationNotFoundError, ObligationValidationError } from "@missa/radar-adapters";
import {
  ifMatchRevision,
  obligationCreateSchema,
  obligationError,
  obligationUpdateSchema,
  parsePlanningPreferences,
} from "./obligation-routes.ts";

const preferences = {
  weeklyHoursAvailable: 6,
  defaultBufferDays: 2,
  materialEffort: { statement: 5 },
  defaultDeadlineOffsets: [7, 1],
  goneQuietDays: 21,
  deadlineDayAlarm: true,
  openingAlerts: true,
  dailyNoticeCap: 3,
  expectedRevision: 0,
};

test("planning preferences accept the first save at revision 0 and refuse invalid values", () => {
  const parsed = parsePlanningPreferences(preferences);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.expectedRevision, 0);
    assert.equal("expectedRevision" in parsed.input, false);
  }
  assert.equal(parsePlanningPreferences({ ...preferences, defaultDeadlineOffsets: [2] }).ok, false);
  assert.equal(parsePlanningPreferences({ ...preferences, goneQuietDays: 3 }).ok, false);
  assert.equal(parsePlanningPreferences({ ...preferences, weeklyHoursAvailable: 200 }).ok, false);
  assert.equal(parsePlanningPreferences({ ...preferences, expectedRevision: undefined }).ok, false);
  assert.equal(parsePlanningPreferences({ ...preferences, weeklyHoursAvailable: null }).ok, true);
});

test("obligation bodies: template sets need an application, steps need a label", () => {
  assert.equal(obligationCreateSchema.safeParse({ templates: "acceptance", opportunityId: "o1" }).success, true);
  assert.equal(obligationCreateSchema.safeParse({ templates: "preparation" }).success, false);
  assert.equal(obligationCreateSchema.safeParse({ label: "Ask referees", opportunityId: "o1", offsetDays: -28 }).success, true);
  assert.equal(obligationCreateSchema.safeParse({ label: "", dueOn: "2026-10-10" }).success, false);
  assert.equal(obligationCreateSchema.safeParse({ label: "Print", dueOn: "10/10/2026" }).success, false);
  assert.equal(obligationUpdateSchema.safeParse({}).success, false);
  assert.equal(obligationUpdateSchema.safeParse({ state: "done" }).success, true);
  assert.equal(obligationUpdateSchema.safeParse({ bufferPolicy: "stretch" }).success, false);
});

test("If-Match must be a positive revision", () => {
  const request = (value?: string) => new Request("https://missa.test", { headers: value ? { "If-Match": value } : {} });
  assert.equal(ifMatchRevision(request("3")), 3);
  assert.equal(ifMatchRevision(request('"4"')), 4);
  assert.equal(ifMatchRevision(request("0")), null);
  assert.equal(ifMatchRevision(request()), null);
});

test("ledger errors map to calm responses, with the current step on a conflict", async () => {
  assert.equal(obligationError(new ObligationValidationError("Choose a valid date."), "x").status, 400);
  assert.equal(obligationError(new ObligationNotFoundError(), "x").status, 404);
  const conflict = obligationError(new CreatorConflictError("creator-obligation", "id", 1, 2), "x", { id: "id", revision: 2 });
  assert.equal(conflict.status, 409);
  const body = await conflict.json();
  assert.deepEqual(body.current, { id: "id", revision: 2 });
  assert.equal(body.conflict.actualRevision, 2);
  assert.equal(obligationError(new Error("boom"), "The step could not be saved. Try again.").status, 503);
});
