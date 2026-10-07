import assert from "node:assert/strict";
import test from "node:test";
import { createWork } from "./creator-portfolio-schema";
import {
  addressFromInput,
  findWorkByAddress,
  isThinWorkPage,
  recordEntryDetail,
  recordEntryForWork,
  stanzas,
  workAddress,
  workAddressText,
  workBlocks,
  workContents,
  workCounts,
  workCountsLine,
  workPageDescription,
  workParts,
  workRights,
} from "./creator-work-page";

const w = (title: string, extra: Record<string, unknown> = {}) =>
  createWork({ title, ...extra });

const part = (
  kind: "text" | "image" | "audio",
  extra: Record<string, unknown> = {},
) => ({
  kind,
  title: "",
  text: kind === "text" ? "A line." : "",
  image: kind === "image" ? "/api/creator/portfolio-media/i" : "",
  audio: kind === "audio" ? "/api/creator/portfolio-media/a" : "",
  caption: "",
  ...extra,
});

const sequence = () =>
  w("Atlas", {
    kind: "Poem sequence",
    parts: [
      part("text", { title: "Window" }),
      part("text", { title: "Platform 4" }),
      part("image", { title: "Low tide", caption: "A grey sea" }),
      part("image"),
      part("audio", { title: "Between Perth and Inverness" }),
    ],
  });

test("parts keep their order, anchors and plain names", () => {
  const parts = workParts(sequence());
  assert.deepEqual(
    parts.map((p) => [p.number, p.anchor, p.heading, p.label]),
    [
      [1, "part-1", "Window", "Poem 1 of 2"],
      [2, "part-2", "Platform 4", "Poem 2 of 2"],
      [3, "part-3", "Low tide", "Plate 1 of 2"],
      [4, "part-4", "Plate 2", "Plate 2 of 2"],
      [5, "part-5", "Between Perth and Inverness", "Recording"],
    ],
  );
});

test("a part with nothing to show is left out of counts and contents", () => {
  const work = w("Atlas", {
    parts: [
      part("text"),
      part("text", { text: "   " }),
      part("image", { image: "" }),
      part("audio", { audio: "" }),
      part("text", { title: "Only this" }),
    ],
  });
  // Two text parts have words; the empty image and audio and the blank text do not.
  assert.equal(workParts(work).length, 2);
  const single = w("Atlas", {
    parts: [part("text", { text: " " }), part("image")],
  });
  assert.equal(workParts(single).length, 1);
  assert.equal(workCountsLine(single), "");
  assert.deepEqual(workContents(single), []);
});

test("the counts line names parts by what the work is", () => {
  assert.equal(workCountsLine(sequence()), "2 poems · 2 plates · 1 recording");
  const essays = w("Notes", {
    kind: "Essays",
    parts: [part("text"), part("text"), part("text")],
  });
  assert.equal(workCountsLine(essays), "3 essays");
  const plain = w("Notes", { parts: [part("text"), part("image")] });
  assert.equal(workCountsLine(plain), "1 text · 1 plate");
  assert.deepEqual(
    workCounts(sequence()).map((entry) => entry.kind),
    ["text", "image", "audio"],
  );
});

test("counts and contents wait for a second part", () => {
  const one = w("Single", { parts: [part("text")] });
  assert.equal(workCountsLine(one), "");
  assert.deepEqual(workContents(one), []);
  assert.equal(workCountsLine(w("None")), "");
  assert.deepEqual(
    workContents(sequence()).map((entry) => [entry.number, entry.title]),
    [
      [1, "Window"],
      [2, "Platform 4"],
      [3, "Low tide"],
      [4, "Plate 2"],
      [5, "Between Perth and Inverness"],
    ],
  );
});

test("sixty parts number cleanly", () => {
  const work = w("Long", {
    kind: "Poems",
    parts: Array.from({ length: 60 }, (_, at) =>
      part("text", { title: `Poem ${at + 1}` }),
    ),
  });
  const contents = workContents(work);
  assert.equal(contents.length, 60);
  assert.equal(contents.at(-1)?.anchor, "part-60");
  assert.equal(workCountsLine(work), "60 poems");
});

test("plates that follow one another sit together, in order", () => {
  const work = w("Atlas", {
    parts: [
      part("text", { title: "One" }),
      part("image", { title: "A" }),
      part("image", { title: "B" }),
      part("text", { title: "Two" }),
      part("image", { title: "C" }),
      part("audio", { title: "Sound" }),
    ],
  });
  const blocks = workBlocks(workParts(work));
  assert.deepEqual(
    blocks.map((block) =>
      block.type === "plates"
        ? `plates:${block.parts.map((p) => p.title).join("+")}`
        : `${block.type}:${block.part.title}`,
    ),
    ["text:One", "plates:A+B", "text:Two", "plates:C", "recording:Sound"],
  );
});

test("stanzas split on blank lines and keep line breaks", () => {
  assert.deepEqual(stanzas("One\ntwo\n\n\nThree\r\n\r\nFour"), [
    "One\ntwo",
    "Three",
    "Four",
  ]);
  assert.deepEqual(stanzas("  \n "), []);
});

test("a page with only a title is thin", () => {
  assert.equal(
    isThinWorkPage(w("Only a title", { url: "https://a.org" })),
    true,
  );
  assert.equal(isThinWorkPage(w("Words", { text: "A line" })), false);
  assert.equal(isThinWorkPage(w("Picture", { image: "/x" })), false);
  assert.equal(isThinWorkPage(w("Parts", { parts: [part("text")] })), false);
  assert.equal(isThinWorkPage(w("Context", { about: "Why." })), false);
});

test("the description prefers the summary, then context, then the words", () => {
  assert.equal(
    workPageDescription(w("A", { summary: "Made on trains." }), "Riley"),
    "Made on trains.",
  );
  assert.equal(
    workPageDescription(
      w("A", { about: "Three years\non the line." }),
      "Riley",
    ),
    "Three years on the line.",
  );
  assert.equal(
    workPageDescription(w("A", { text: "First\nline" }), "Riley"),
    "First line",
  );
  assert.equal(
    workPageDescription(w("A", { kind: "Poem" }), "Riley"),
    "Poem by Riley.",
  );
  assert.equal(
    workPageDescription(w("A", { summary: "x".repeat(400) }), "R").length,
    298,
  );
});

/* ---------- Published in ---------- */

const entry = (
  title: string,
  extra: Record<string, unknown> = {},
): Parameters<typeof recordEntryForWork>[1][number] => ({
  kind: "publication",
  title,
  venue: "The Quiet Review",
  year: "2026",
  url: "",
  provenance: "added",
  ...extra,
});

test("a publication that names the work is found by whole words", () => {
  const record = [
    entry("Windowpane, Issue 2"),
    entry("“Window”, Issue 14", { provenance: "confirmed" }),
    entry("Window prize", { kind: "prize" }),
  ];
  const found = recordEntryForWork(w("Window"), record);
  assert.equal(found?.title, "“Window”, Issue 14");
  assert.equal(recordEntryForWork(w("Mirror"), record), undefined);
  assert.equal(recordEntryForWork(w("Ab"), [entry("Ab")]), undefined);
  assert.equal(recordEntryForWork(w(""), record), undefined);
});

test("the best-evidenced, newest publication wins", () => {
  const record = [
    entry("Tidal glossary", { year: "2024", provenance: "linked" }),
    entry("Tidal glossary", { year: "2025", provenance: "linked" }),
    entry("Tidal glossary", { year: "2026", provenance: "added" }),
  ];
  assert.equal(recordEntryForWork(w("Tidal glossary"), record)?.year, "2025");
  const withConfirmed = [
    ...record,
    entry("Tidal glossary", { year: "2020", provenance: "confirmed" }),
  ];
  assert.equal(
    recordEntryForWork(w("Tidal glossary"), withConfirmed)?.provenance,
    "confirmed",
  );
});

test("the entry's detail is what the title says besides the work", () => {
  const work = w("Tidal glossary");
  assert.equal(
    recordEntryDetail(work, entry("“Tidal glossary”, Issue 14")),
    "Issue 14",
  );
  assert.equal(recordEntryDetail(work, entry("Tidal glossary")), "");
  assert.equal(
    recordEntryDetail(
      w("What (not) to keep?"),
      entry("What (not) to keep? Issue 3"),
    ),
    "Issue 3",
  );
});

/* ---------- Rights ---------- */

test("the rights line is the creator's own, or a plain default", () => {
  assert.deepEqual(
    workRights(w("A", { rights: " CC BY-NC 4.0 " }), "Riley Chen", true),
    { notice: "CC BY-NC 4.0", ask: "", custom: true },
  );
  assert.deepEqual(workRights(w("A", { year: "2026" }), "Riley Chen", true), {
    notice: "© Riley Chen 2026. Shared here for reading.",
    ask: "For permissions, get in touch.",
    custom: false,
  });
});

test("the default offers permissions only when a visitor can write", () => {
  const line = workRights(w("A"), "Riley Chen", false);
  assert.equal(line.notice, "© Riley Chen. Shared here for reading.");
  assert.equal(line.ask, "");
});

/* ---------- Page address ---------- */

test("the address explains itself when it is not the one asked for", () => {
  const first = w("Atlas");
  const second = w("Another", { slug: "atlas" });
  const works = [first, second];
  // The second work chose "atlas", so the first, which would be "atlas", is numbered.
  assert.deepEqual(workAddress(second, works), {
    slug: "atlas",
    requested: "atlas",
  });
  assert.deepEqual(workAddress(first, works), {
    slug: "atlas-2",
    requested: "",
    note: "numbered",
    otherTitle: "Another",
  });
  const third = w("Third", { slug: "atlas" });
  const clash = [second, third];
  assert.deepEqual(workAddress(third, clash), {
    slug: "third",
    requested: "atlas",
    note: "taken",
    otherTitle: "Another",
  });
});

test("reserved words are explained, and untitled works still have an address", () => {
  const cv = w("My CV", { slug: "cv" });
  assert.deepEqual(workAddress(cv, [cv]), {
    slug: "my-cv",
    requested: "cv",
    note: "reserved",
  });
  const blank = w("");
  assert.equal(workAddress(blank, [blank]).slug, "work-1");
});

test("a requested address finds its work, in any case, and names the real one", () => {
  const works = [w("Window"), w("Window"), w("Mirror", { slug: "glass" })];
  assert.equal(findWorkByAddress(works, "window-2")?.index, 1);
  assert.equal(findWorkByAddress(works, "window-2")?.slug, "window-2");
  const upper = findWorkByAddress(works, "GLASS");
  assert.equal(upper?.index, 2);
  assert.equal(upper?.slug, "glass");
  assert.equal(findWorkByAddress(works, "mirror"), undefined);
  assert.equal(findWorkByAddress(works, "cv"), undefined);
  assert.equal(findWorkByAddress([], "window"), undefined);
});

test("an address is tidied as it is typed", () => {
  assert.equal(addressFromInput("My Work, 2026!"), "my-work-2026");
  assert.equal(addressFromInput("  "), "");
  assert.equal(
    workAddressText("rileychen", "atlas"),
    "usemissa.com/@rileychen/atlas",
  );
  assert.equal(workAddressText("", "atlas"), "usemissa.com/@yourname/atlas");
});
