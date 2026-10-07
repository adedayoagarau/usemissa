import assert from "node:assert/strict";
import { test } from "node:test";

import { coverKey } from "./callCover";

test("a specific type decides the cover", () => {
  assert.equal(coverKey("residency", "Spring open call"), "residency");
  assert.equal(coverKey("pitch"), "publication");
  assert.equal(coverKey("scholarship"), "grant");
});

test("open calls are read from their title", () => {
  const cases: [string, string][] = [
    ["ALL WRITE, COLUMBIA, CREATIVE NONFICTION Writers Conference 2026", "fellowship"],
    ["O+ Festival Kingston Clinic Providers", "festival"],
    ["FY27 Food Security Grants", "grant"],
    ["Bateau BOOM Chapbook Contest 2026/2027", "contest"],
    ["Open Call: Fiction - The Drift & Dribble Miscellany, a Literary Magazine", "magazine"],
    ["Free Reads 2026-27", "publication"],
    ["Harbour Arts Trust Coastal Residency", "residency"],
  ];
  for (const [title, cover] of cases) assert.equal(coverKey("open-call", title), cover, title);
});

test("nothing to go on gives the open-call pinboard", () => {
  assert.equal(coverKey("open-call", "E-Prokurimi"), "open-call");
  assert.equal(coverKey(undefined), "open-call");
  assert.equal(coverKey("job", "Studio assistant"), "open-call");
});
