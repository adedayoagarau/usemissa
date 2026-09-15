import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const opportunitiesPage = readFileSync(
  new URL("../app/opportunities/page.tsx", import.meta.url),
  "utf8",
);
const forYouPage = readFileSync(
  new URL("../app/opportunities/for-you/page.tsx", import.meta.url),
  "utf8",
);

test("signed-in opportunity pages do not hydrate the legacy production engine", () => {
  for (const source of [opportunitiesPage, forYouPage]) {
    assert.doesNotMatch(source, /from ["']@\/lib\/engine["']/);
    assert.doesNotMatch(source, /getEngine\s*\(/);
    assert.match(source, /organizationNames\s*\(/);
  }
});
