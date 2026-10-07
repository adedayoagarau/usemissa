import assert from "node:assert/strict";
import test from "node:test";
import { lineViolations } from "../missa-language-rules.mjs";

const ids = (line, file = "apps/web/app/page.tsx") => lineViolations(line, file).map((rule) => rule.id);

test("flags retired messaging in customer copy", () => {
  assert.deepEqual(ids(`<h1>Creative Opportunity infrastructure for clearer decisions.</h1>`), ["infrastructure", "capitalized domain noun"]);
  assert.deepEqual(ids(`title: "Missa — Opportunities for every creator",`), ["every creator"]);
  assert.deepEqual(ids(`<p>Missa brings them together.</p>`), ["brings them together"]);
  assert.deepEqual(ids(`label: "✨ Where Should I Submit?",`), ["sparkles emoji"]);
  assert.deepEqual(ids(`<p>We score fit and odds for every magazine.</p>`), ["odds"]);
  assert.deepEqual(ids(`{ actionLabel: 'Browse Opportunities' }`), ["capitalized domain noun"]);
  assert.deepEqual(ids(`<p>Send it to the Organization.</p>`), ["capitalized domain noun"]);
});

test("passes the copy in docs/missa-messaging.md", () => {
  for (const line of [
    `<h1>Find the call. Make the deadline.</h1>`,
    `<p>For writers, artists, filmmakers, and everyone in between.</p>`,
    `toast("Saved. One less tab.")`,
    `<p>Nothing saved yet. Your open tabs can finally rest.</p>`,
    `{ actionLabel: 'Browse open calls' }`,
  ]) {
    assert.deepEqual(ids(line), [], line);
  }
});

test("ignores code that isn't copy", () => {
  assert.deepEqual(ids("fetch(`/api/journey/first-save/intent?outcome=completed`)"), []);
  assert.deepEqual(ids(`import { SmartShortlistBuilder } from "@/components/rankings/smart-shortlist-builder";`), []);
  assert.deepEqual(ids(`track("journey.abandoned")`), []);
});

test("skips internal surfaces for messaging rules, not taxonomy rules", () => {
  assert.deepEqual(ids(`<small>Operate Missa</small>`, "apps/web/components/platform-admin-nav.tsx"), []);
  assert.deepEqual(ids(`<small>Operate Missa</small>`, "apps/web/lib/platformAdminViews.ts"), []);
  assert.deepEqual(ids(`<p>Your creative practice</p>`, "apps/web/components/platform-admin-nav.tsx"), ["practice"]);
});

test("honours the allow comment", () => {
  assert.deepEqual(ids(`<q>The opportunity layer</q> {/* missa-language-allow: quoting the old deck */}`), []);
});

test("reads guide Markdown as prose, ignoring link targets", () => {
  const guide = "apps/web/content/guides/where-to-find-open-calls.md";
  assert.deepEqual(ids("Missa helps you unlock the next call.", guide), ["filler verbs"]);
  assert.deepEqual(ids("Read the [guidelines](https://example.com/journey-smart).", guide), []);
  assert.deepEqual(ids("Check the fee on the [organizer's page](https://example.com).", guide), []);
});
