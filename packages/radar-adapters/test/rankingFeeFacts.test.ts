import test from "node:test";
import assert from "node:assert/strict";
import {
  withoutMagazineName,
  categoryGenres,
  deriveFeeFacts,
  isRegularCategory,
  overallFeeFact,
  type SubmissionCategory,
} from "../src/ranking/live/feeFacts.js";

const cat = (title: string, feeCents: number, checkedOn = "2026-09-01"): SubmissionCategory => ({
  title,
  feeCents,
  url: `https://example.submittable.com/submit/${encodeURIComponent(title)}`,
  checkedOn,
});

test("category genres: prose covers fiction and nonfiction; untitled covers all", () => {
  assert.deepEqual(categoryGenres("Prose General Submissions").sort(), ["fiction", "nonfiction"]);
  assert.deepEqual(categoryGenres("Nonfiction-- Submissions for Print Issue 56.1"), ["nonfiction"]);
  assert.deepEqual(categoryGenres("Creative Nonfiction"), ["nonfiction"]);
  assert.deepEqual(categoryGenres("Poetry - Issue 57"), ["poetry"]);
  assert.deepEqual(categoryGenres("MICROS - 100-Word Microfiction"), ["fiction"]);
  assert.deepEqual(categoryGenres("General Submissions").sort(), ["fiction", "nonfiction", "poetry"]);
});

test("prizes, paid extras, jobs and art are not regular submissions", () => {
  for (const title of [
    "2027 Rattle Chapbook Prize",
    "Poetry - Expedited - 2026",
    "Communications Coordinator",
    "2026 Open Call for Artwork",
    "Fiction Contest",
    "Tip Jar",
    "AGNI: Review",
    "AGNI: Conversation",
    "AGNI: Proximity Portfolio (Writing)",
    "Sundog Lit — Illustration",
    "Chestnut Review — Chapbooks",
    "New England Review — New Japanese Literature in Translation",
    "Ilanot Review — Translations: TIME, HISTORY, ETERNITY (free)",
  ]) {
    assert.equal(isRegularCategory(title), false, title);
  }
  assert.equal(isRegularCategory("General Fiction 2027"), true);
});

test("the regular fee is the cheapest category open to everyone, per genre", () => {
  const facts = deriveFeeFacts([
    cat("5. Print Edition Creative Nonfiction Submissions", 300),
    cat("3. Web Edition CREATIVE NONFICTION", 0),
    cat("Print Edition Fiction", 300),
    cat("Poetry - Expedited - 2026", 400),
    cat("Poetry 2026", 300),
  ]);
  assert.equal(facts.nonfiction?.regularFeeCents, 0, "a free web category is a free route in");
  assert.equal(facts.fiction?.regularFeeCents, 300);
  assert.equal(facts.poetry?.regularFeeCents, 300, "the $4 expedited option is not the regular fee");
  assert.match(facts.fiction!.sourceUrl, /Print%20Edition%20Fiction/);
});

test("a free category limited to some writers is a waiver, not a free route", () => {
  const facts = deriveFeeFacts([
    cat("General Submissions - Issue 32", 300),
    cat("Complimentary Submissions for Writers from Historically Marginalized Groups - Issue 32", 0),
  ]);
  assert.equal(facts.fiction?.regularFeeCents, 300);
  assert.equal(facts.fiction?.hasSubsidizedFeeCategory, true);
});

test("limited free slots are a waiver; the regular fee stays the paid category", () => {
  const facts = deriveFeeFacts([
    cat("Southern Humanities Review — Limited Free Fiction Submissions (Print)", 0),
    cat("Southern Humanities Review — Fiction (Print)", 300),
  ]);
  assert.equal(facts.fiction?.regularFeeCents, 300);
  assert.equal(facts.fiction?.hasSubsidizedFeeCategory, true);
});

test("AGNI: free reviews and interviews do not make poetry free", () => {
  const facts = deriveFeeFacts([
    cat("AGNI: Review", 0),
    cat("AGNI: Conversation", 0),
    cat("AGNI: Poetry Submissions", 300),
  ]);
  assert.equal(facts.poetry?.regularFeeCents, 300);
});

test("the magazine's own name never decides the category", () => {
  assert.equal(withoutMagazineName("Arts & Letters — Fiction", "Arts & Letters"), "Fiction");
  assert.equal(withoutMagazineName("Catamaran Literary Reader: Poetry", "Catamaran Literary Reader"), "Poetry");
  assert.equal(withoutMagazineName("Raleigh Review", "Raleigh Review"), "Raleigh Review");
  const facts = deriveFeeFacts([cat("Catamaran Literary Reader: Poetry", 300)], "Catamaran Literary Reader");
  assert.equal(facts.poetry?.regularFeeCents, 300);
});

test("a magazine with only prize calls has no regular fee fact", () => {
  assert.deepEqual(deriveFeeFacts([cat("Poetry Prize", 3000)]), {});
});

test("overall uses the cheapest genre", () => {
  const overall = overallFeeFact(
    deriveFeeFacts([cat("Fiction", 300), cat("Poetry", 0)]),
  );
  assert.equal(overall?.regularFeeCents, 0);
  assert.equal(overallFeeFact({}), null);
});
