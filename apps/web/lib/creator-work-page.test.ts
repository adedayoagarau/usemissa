import assert from "node:assert/strict";
import test from "node:test";
import { createWork } from "./creator-portfolio-schema";
import {
  slugify,
  workBySlug,
  workHref,
  workNeighbours,
  workSlugs,
} from "./creator-work-page";

const w = (title: string, extra: Record<string, unknown> = {}) =>
  createWork({ title, ...extra });

test("slugify keeps readable ascii words", () => {
  assert.equal(
    slugify("An atlas of small departures"),
    "an-atlas-of-small-departures",
  );
  assert.equal(slugify("Café & the sea — 2024!"), "cafe-and-the-sea-2024");
  assert.equal(slugify("Riley’s notes"), "rileys-notes");
  assert.equal(slugify("日本語"), "");
});

test("each work gets a unique address that survives reordering", () => {
  const a = w("Window");
  const b = w("Window");
  const c = w("Window");
  assert.deepEqual(workSlugs([a, b, c]), ["window", "window-2", "window-3"]);
  assert.deepEqual(workSlugs([c, a, b]), ["window", "window-2", "window-3"]);
});

test("a slug the creator chose is kept, even ahead of an earlier title", () => {
  const first = w("Atlas");
  const second = w("Something else", { slug: "atlas" });
  assert.deepEqual(workSlugs([first, second]), ["atlas-2", "atlas"]);
});

test("reserved words and untitled works still get an address", () => {
  assert.deepEqual(workSlugs([w("CV"), w("Story"), w("")]), [
    "cv-2",
    "story-2",
    "work-3",
  ]);
  assert.deepEqual(workSlugs([w("x", { slug: "cv" })]), ["x"]);
});

test("addresses resolve both ways", () => {
  const works = [w("Tidal glossary"), w("Threshold studies")];
  assert.equal(
    workHref("rileychen", works[1], works),
    "/@rileychen/threshold-studies",
  );
  assert.equal(workHref("", works[1], works), undefined);
  assert.equal(workBySlug(works, "threshold-studies")?.index, 1);
  assert.equal(workBySlug(works, "nope"), undefined);
  assert.deepEqual(
    Object.keys(workNeighbours(works, 0)).map((k) => [
      k,
      workNeighbours(works, 0)[k as "next"]?.title,
    ]),
    [
      ["previous", undefined],
      ["next", "Threshold studies"],
    ],
  );
});
