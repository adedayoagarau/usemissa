import assert from "node:assert/strict";
import { test } from "node:test";

import {
  daysBetween,
  pickShowcase,
  shouts,
  sluglike,
  weekBeforeReminder,
  type ShowcaseSource,
} from "./homepageShowcase";

const TODAY = "2026-10-06";

function call(
  id: string,
  date: string | null,
  extra: Partial<ShowcaseSource> = {},
): ShowcaseSource {
  return {
    id,
    title: `Call ${id}`,
    type: "grant",
    organizationName: `Org ${id}`,
    deadline: { kind: date ? "exact" : "rolling", date },
    ...extra,
  };
}

test("days are counted between calendar dates", () => {
  assert.equal(daysBetween(TODAY, "2026-10-07"), 1);
  assert.equal(daysBetween(TODAY, "2026-10-13T23:59:00Z"), 7);
  assert.equal(daysBetween(TODAY, TODAY), 0);
});

test("no example uses a call closing today, in the past, or without a date", () => {
  const { urgent, lead } = pickShowcase(
    [call("past", "2026-10-01"), call("today", TODAY), call("rolling", null)],
    TODAY,
  );
  assert.equal(urgent, null);
  assert.equal(lead, null);
});

test("urgent closes within a week; lead is two weeks out from another organization", () => {
  const { urgent, lead } = pickShowcase(
    [
      call("tomorrow", "2026-10-07"),
      call("soon", "2026-10-10"),
      call("same-org", "2026-11-20", { organizationName: "Org soon" }),
      call("later", "2026-11-30"),
    ],
    TODAY,
  );
  assert.equal(urgent?.id, "soon");
  assert.equal(urgent?.daysLeft, 4);
  assert.equal(lead?.id, "later");
});

test("shouting titles, slug names and duplicates are skipped", () => {
  assert.equal(shouts("ALL WRITE, COLUMBIA, CREATIVE NONFICTION Writers Conference"), true);
  assert.equal(shouts("North River Review — Call for Submissions"), false);
  assert.equal(shouts("2026 EVENT Creative Non-Fiction Contest - STUDENTS"), true);
  assert.equal(shouts("Winter 2027 Issue: Nonfiction"), false);
  assert.equal(sluglike("Driftdribblemiscellany"), true);
  assert.equal(sluglike("North River Review"), false);
  assert.equal(sluglike("Eventmagazine"), true);
  assert.equal(sluglike("HerStry"), false);
  assert.equal(sluglike("Poetry"), false);
  const { urgent, lead } = pickShowcase(
    [
      call("loud", "2026-10-09", { title: "ANNUAL OPEN CALL FOR EMERGING ARTISTS" }),
      call("slug", "2026-10-10", { organizationName: "Driftdribblemiscellany" }),
      call("ok", "2026-10-11"),
      call("ok", "2026-10-11"),
    ],
    TODAY,
  );
  assert.equal(urgent?.id, "ok");
  assert.equal(lead, null);
});

test("the reminder example is the week-before email", () => {
  const [{ urgent }] = [pickShowcase([call("far", "2026-11-30")], TODAY)];
  assert.ok(urgent);
  assert.equal(weekBeforeReminder(urgent).daysLeft, 7);
  assert.equal(weekBeforeReminder({ ...urgent, daysLeft: 3 }).daysLeft, 3);
});
