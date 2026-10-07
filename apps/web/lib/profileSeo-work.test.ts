import assert from "node:assert/strict";
import { test } from "node:test";

import { creativeWorkJsonLd } from "./profileSeo";

const base = {
  path: "/@rileychen/atlas",
  profilePath: "/@rileychen",
  title: "An atlas of small departures",
  description: "Poems and photographs made on trains.",
  creator: "Riley Chen",
};

test("a work is described as a CreativeWork by its creator", () => {
  const data = creativeWorkJsonLd(base);
  assert.equal(data["@context"], "https://schema.org");
  assert.equal(data["@type"], "CreativeWork");
  assert.equal(data.name, "An atlas of small departures");
  assert.equal(data.url, "https://www.usemissa.com/@rileychen/atlas");
  assert.deepEqual(data.author, {
    "@type": "Person",
    name: "Riley Chen",
    url: "https://www.usemissa.com/@rileychen",
  });
  assert.equal(data.description, "Poems and photographs made on trains.");
});

test("optional facts appear only when the page states them", () => {
  const bare = creativeWorkJsonLd(base);
  for (const key of [
    "genre",
    "dateCreated",
    "image",
    "publisher",
    "copyrightNotice",
    "contributor",
    "hasPart",
  ])
    assert.equal(key in bare, false, key);

  const full = creativeWorkJsonLd({
    ...base,
    kind: "Poem sequence",
    year: "2026",
    image: "/@rileychen/share.png",
    publisher: "The Quiet Review",
    rights: "CC BY-NC 4.0",
    credits: [
      { role: "Editor", name: "Mara Lind" },
      { role: "", name: "Harbour Print Studio" },
      { role: "Skipped", name: "  " },
    ],
    parts: [
      { kind: "text", heading: "Window" },
      { kind: "image", heading: "Low tide" },
      { kind: "audio", heading: "Between Perth and Inverness" },
    ],
  });
  assert.equal(full.genre, "Poem sequence");
  assert.equal(full.dateCreated, "2026");
  assert.equal(full.image, "https://www.usemissa.com/@rileychen/share.png");
  assert.deepEqual(full.publisher, {
    "@type": "Organization",
    name: "The Quiet Review",
  });
  assert.equal(full.copyrightNotice, "CC BY-NC 4.0");
  assert.equal((full.contributor as unknown[]).length, 2);
  assert.deepEqual(
    (full.hasPart as Array<Record<string, unknown>>).map((part) => [
      part["@type"],
      part.name,
      part.position,
    ]),
    [
      ["CreativeWork", "Window", 1],
      ["ImageObject", "Low tide", 2],
      ["AudioObject", "Between Perth and Inverness", 3],
    ],
  );
});

test("a sixty-part work is capped and never carries private fields", () => {
  const data = creativeWorkJsonLd({
    ...base,
    parts: Array.from({ length: 80 }, (_, at) => ({
      kind: "text" as const,
      heading: `Part ${at + 1}`,
    })),
  });
  assert.equal((data.hasPart as unknown[]).length, 60);
  const serialized = JSON.stringify(data);
  assert.equal(/outcome|decision|draft|email/i.test(serialized), false);
});
