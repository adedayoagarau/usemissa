import assert from "node:assert/strict";
import test from "node:test";

import { portfolioSchema, publicationIssue } from "./creator-portfolio-schema";
import {
  ADDON_LIST_MAX,
  COUNT_MAX,
  WEB_LINK_MESSAGE,
  editionStock,
  formatCount,
  hasPassed,
  parseCount,
  placesLeft,
  shortDate,
  todayIso,
  webLinkIssue,
  withEditionCounts,
} from "./creator-profile-addon-fields";

test("an empty count field means not stated, never NaN", () => {
  assert.deepEqual(parseCount(""), { value: undefined, capped: false });
  assert.deepEqual(parseCount("abc"), { value: undefined, capped: false });
  assert.deepEqual(parseCount("-"), { value: undefined, capped: false });
  assert.deepEqual(parseCount("  "), { value: undefined, capped: false });
});

test("a count keeps its digits and drops everything else", () => {
  assert.equal(parseCount("12").value, 12);
  assert.equal(parseCount("007").value, 7);
  assert.equal(parseCount("0").value, 0);
  assert.equal(parseCount("1,200").value, 1200);
  assert.equal(parseCount("-5").value, 5, "a count is never negative");
  assert.equal(parseCount("12 copies").value, 12);
});

test("a count is held at the schema's limit and says so", () => {
  assert.deepEqual(parseCount(String(COUNT_MAX)), {
    value: COUNT_MAX,
    capped: false,
  });
  assert.deepEqual(parseCount(String(COUNT_MAX + 1)), {
    value: COUNT_MAX,
    capped: true,
  });
  const huge = parseCount("9".repeat(400));
  assert.equal(huge.value, COUNT_MAX, "a huge paste is held, not Infinity");
  assert.equal(huge.capped, true);
  assert.deepEqual(parseCount("13", 12), { value: 12, capped: true });
  assert.deepEqual(parseCount("12", 12), { value: 12, capped: false });
  assert.equal(parseCount("5", COUNT_MAX * 10).value, 5);
  assert.equal(
    parseCount("200000", COUNT_MAX * 10).value,
    COUNT_MAX,
    "a caller cannot raise the limit past the schema's",
  );
  assert.equal(parseCount("5", Number.NaN).value, 0);
});

test("the count limit and list limits are the schema's", () => {
  const count = (total: number) =>
    portfolioSchema.safeParse({ editions: [{ total }] }).success;
  assert.equal(count(COUNT_MAX), true);
  assert.equal(count(COUNT_MAX + 1), false);
  const rows = (key: keyof typeof ADDON_LIST_MAX, n: number) =>
    portfolioSchema.safeParse({
      [key]: Array.from({ length: n }, () => ({})),
    }).success;
  for (const key of Object.keys(
    ADDON_LIST_MAX,
  ) as (keyof typeof ADDON_LIST_MAX)[]) {
    assert.equal(rows(key, ADDON_LIST_MAX[key]), true, `${key} at its limit`);
    assert.equal(rows(key, ADDON_LIST_MAX[key] + 1), false, `${key} over it`);
  }
});

test("a stored count that is not a count shows as empty", () => {
  assert.equal(formatCount(undefined), "");
  assert.equal(formatCount(0), "0");
  assert.equal(formatCount(12), "12");
  assert.equal(formatCount(Number.NaN), "");
  assert.equal(formatCount(-3), "");
  assert.equal(formatCount(Number.POSITIVE_INFINITY), "");
  assert.equal(formatCount(3.7), "3");
});

test("available is never more than the edition size", () => {
  const edition = { total: 12, available: 4 };
  assert.deepEqual(withEditionCounts(edition, { available: 9 }), {
    available: 9,
  });
  assert.deepEqual(withEditionCounts(edition, { available: 40 }), {
    available: 12,
  });
  assert.deepEqual(
    withEditionCounts(edition, { total: 3 }),
    { total: 3, available: 3 },
    "lowering the edition size brings what is available down with it",
  );
  assert.deepEqual(withEditionCounts(edition, { total: 20 }), { total: 20 });
  assert.deepEqual(
    withEditionCounts({ total: undefined, available: 40 }, { available: 50 }),
    { available: 50 },
    "with no edition size stated there is nothing to cap against",
  );
  assert.deepEqual(withEditionCounts(edition, { total: undefined }), {
    total: undefined,
  });
  assert.deepEqual(withEditionCounts({ total: 12 }, { available: 12 }), {
    available: 12,
  });
});

test("the stock line reads like the edition's label", () => {
  assert.equal(editionStock({ total: 12, available: 4 }), "4 of 12 available");
  assert.equal(editionStock({ total: 12, available: 0 }), "Sold out");
  assert.equal(editionStock({ available: 0 }), "Sold out");
  assert.equal(editionStock({ available: 4 }), "4 available");
  assert.equal(editionStock({ total: 12 }), "Edition of 12");
  assert.equal(editionStock({}), "");
});

test("places left are hidden when unstated and read Full at zero", () => {
  assert.equal(placesLeft(undefined), "");
  assert.equal(placesLeft(0), "Full");
  assert.equal(placesLeft(1), "1 place left");
  assert.equal(placesLeft(3), "3 places left");
});

test("a session has passed the day after its date, and no date never passes", () => {
  assert.equal(hasPassed("2026-10-06", "2026-10-07"), true);
  assert.equal(hasPassed("2026-10-07", "2026-10-07"), false);
  assert.equal(hasPassed("2026-10-08", "2026-10-07"), false);
  assert.equal(hasPassed("", "2026-10-07"), false);
  assert.equal(todayIso(new Date("2026-10-07T23:30:00Z")), "2026-10-07");
});

test("dates read the way the date picker shows them", () => {
  assert.equal(shortDate("2027-03-09"), "9 Mar 2027");
  assert.equal(shortDate(""), "");
  assert.equal(shortDate("March"), "");
});

test("a link has to be a full web address, as publishing requires", () => {
  assert.equal(webLinkIssue(""), undefined, "a link is optional");
  assert.equal(webLinkIssue("https://example.com/support"), undefined);
  assert.equal(webLinkIssue("http://example.com"), undefined);
  for (const value of [
    "example.com",
    "ko-fi",
    "https://",
    "javascript:alert(1)",
    "ftp://example.com",
    "https://user:secret@example.com",
    "   ",
  ])
    assert.equal(webLinkIssue(value), WEB_LINK_MESSAGE, value);
});

test("the link rule and publicationIssue never disagree", () => {
  for (const url of [
    "",
    "https://example.com/support",
    "http://example.com",
    "example.com",
    "ko-fi",
    "https://",
    "javascript:alert(1)",
    "https://user:secret@example.com",
    "   ",
    " https://example.com ",
  ]) {
    const draft = portfolioSchema.parse({
      name: "Riley",
      support: { label: "Support", url, note: "" },
    });
    assert.equal(
      Boolean(publicationIssue(draft)),
      Boolean(webLinkIssue(url)),
      JSON.stringify(url),
    );
  }
});
