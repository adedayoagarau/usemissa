import { test } from "node:test";
import assert from "node:assert/strict";
import {
  writingLocations,
  resolveWritingLocation,
  readWritingBookmarks,
  writingNavigationKey,
} from "./writing-navigation";
import { newDocument } from "./writing-document";

test("heading anchors follow text across pages and retain ProseMirror positions", () => {
  const doc = newDocument("");
  doc.pages[0].content = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Intro" }] },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Chapter" }],
      },
    ],
  };
  const locations = writingLocations(doc);
  assert.equal(locations[1].position, 8);
  assert.equal(locations[1].headingLevel, 2);
  const saved = locations[1];
  doc.pages[0].id = "repaginated";
  assert.equal(
    resolveWritingLocation(saved, writingLocations(doc))?.editorId,
    "repaginated",
  );
  doc.pages[0].content = { type: "doc", content: [] };
  assert.equal(resolveWritingLocation(saved, writingLocations(doc)), null);
});
test("bookmark storage rejects malformed data and scopes account and entry", () => {
  assert.deepEqual(readWritingBookmarks('{"id":"bad"}'), []);
  assert.deepEqual(readWritingBookmarks('[{"id":"bad"}]'), []);
  assert.notEqual(
    writingNavigationKey("a", "entry"),
    writingNavigationKey("b", "entry"),
  );
  assert.notEqual(
    writingNavigationKey("a", "entry"),
    writingNavigationKey("a", "other"),
  );
});
test("canvas headings use block editor IDs and ambiguous moved anchors are unavailable", () => {
  const doc = newDocument("");
  const page = doc.pages[0];
  page.kind = "canvas";
  page.blocks = [
    {
      id: "box",
      x: 0,
      y: 0,
      width: 30,
      rotation: 0,
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 3 },
            content: [{ type: "text", text: "Repeated" }],
          },
        ],
      },
    },
  ];
  const [location] = writingLocations(doc);
  assert.equal(location.editorId, `${page.id}/box`);
  assert.equal(location.position, 1);
  const moved = { ...location, editorId: "gone" };
  assert.equal(
    resolveWritingLocation(moved, [
      location,
      { ...location, editorId: "other", occurrence: 1 },
    ]),
    null,
  );
});
