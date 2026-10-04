import assert from "node:assert/strict";
import test from "node:test";
import { PROVIDER_MIRROR_PURPOSES } from "@missa/radar-adapters";
import { CALENDAR_MIRROR_PURPOSES, isCalendarMirrorPurpose } from "./calendar-mirror-purposes";
import { calendarMirrorTickLimits, mirrorCalendarProviderTick } from "./calendar-provider-mirror";

test("the Calendar leaves out exactly the purposes the provider mirror writes", () => {
  assert.deepEqual([...CALENDAR_MIRROR_PURPOSES], [...PROVIDER_MIRROR_PURPOSES]);
  for (const purpose of PROVIDER_MIRROR_PURPOSES) assert.equal(isCalendarMirrorPurpose(purpose), true);
  for (const purpose of ["personal", "preparation", "official-deadline", "personal-target", "goal-date", undefined])
    assert.equal(isCalendarMirrorPurpose(purpose), false);
});

test("mirror tick limits default and ignore invalid overrides", () => {
  assert.deepEqual(calendarMirrorTickLimits({}), { maxAccounts: 200, timeBudgetMs: 15_000 });
  assert.deepEqual(
    calendarMirrorTickLimits({ MISSA_CALENDAR_MIRROR_ACCOUNTS: "25", MISSA_CALENDAR_MIRROR_TIME_BUDGET_MS: "0" }),
    { maxAccounts: 25, timeBudgetMs: 15_000 },
  );
});

test("the mirror step is skipped without a database", async () => {
  assert.equal(await mirrorCalendarProviderTick(undefined), undefined);
});
