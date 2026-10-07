import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countWords,
  isWritingEntryId,
  newWritingEntryId,
  parseWritingSaveRequest,
  readingTime,
  textCounts,
  WRITING_BODY_MAX,
  writingPreview,
} from "./writing.ts";
import { opensQuote } from "./writing-typing.ts";

test("entry ids are created on the device and validated on the server", () => {
  const id = newWritingEntryId();
  assert.ok(isWritingEntryId(id));
  assert.notEqual(id, newWritingEntryId());
  assert.equal(isWritingEntryId("writing_not-a-uuid"), false);
  assert.equal(isWritingEntryId(`${id}/../other`), false);
  assert.equal(isWritingEntryId(42), false);
});

test("words are counted the way a reader counts them", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("   \n\t "), 0);
  assert.equal(countWords("The river doesn't wait."), 4);
  assert.equal(countWords("one — two – three"), 3);
  assert.equal(countWords("well-known 2026 poems"), 3);
  assert.equal(countWords("line one\nline two\n\nline three"), 6);
});

test("the preview is the first words on one line", () => {
  assert.equal(
    writingPreview("  First line\n\nsecond line  "),
    "First line second line",
  );
  assert.equal(writingPreview(""), "");
  const long = writingPreview("word ".repeat(100), 20);
  assert.ok(long.length <= 20);
  assert.ok(long.endsWith("…"));
});

test("a save names its text and the revision it was written on", () => {
  assert.deepEqual(
    parseWritingSaveRequest({ body: "Hello", baseRevision: 0 }),
    {
      title: "",
      body: "Hello",
      document: null,
      baseRevision: 0,
      projectId: null,
    },
  );
  const projectId = "project_0f8fad5b-d9cb-469f-a165-70867728950e";
  assert.equal(
    (
      parseWritingSaveRequest({ body: "x", baseRevision: 0, projectId }) as {
        projectId: string;
      }
    ).projectId,
    projectId,
  );
  assert.ok(
    "error" in
      parseWritingSaveRequest({ body: "x", baseRevision: 0, projectId: "x" }),
  );
  assert.deepEqual(parseWritingSaveRequest({ body: "", baseRevision: 3 }), {
    title: "",
    body: "",
    document: null,
    baseRevision: 3,
    projectId: null,
  });
  assert.ok(
    "error" in
      parseWritingSaveRequest({ body: "x", baseRevision: 0, title: 5 }),
  );
  assert.ok(
    "error" in
      parseWritingSaveRequest({
        body: "x",
        baseRevision: 0,
        title: "t".repeat(201),
      }),
  );
  assert.ok(
    "error" in
      parseWritingSaveRequest({
        body: "x",
        baseRevision: 0,
        document: "{not json",
      }),
  );
  assert.ok("error" in parseWritingSaveRequest(null));
  assert.ok("error" in parseWritingSaveRequest([]));
  assert.ok("error" in parseWritingSaveRequest({ body: 5, baseRevision: 0 }));
  assert.ok(
    "error" in parseWritingSaveRequest({ body: "x", baseRevision: -1 }),
  );
  assert.ok(
    "error" in parseWritingSaveRequest({ body: "x", baseRevision: 1.5 }),
  );
  assert.ok("error" in parseWritingSaveRequest({ body: "x" }));
  assert.ok(
    "error" in
      parseWritingSaveRequest({
        body: "x".repeat(WRITING_BODY_MAX + 1),
        baseRevision: 0,
      }),
  );
  assert.ok(
    !(
      "error" in
      parseWritingSaveRequest({
        body: "x".repeat(WRITING_BODY_MAX),
        baseRevision: 0,
      })
    ),
  );
});

test("the word count counts words, characters and reading time", () => {
  assert.deepEqual(textCounts("The rain came\nearly."), {
    words: 4,
    characters: 19,
    charactersWithoutSpaces: 17,
  });
  assert.equal(readingTime(0), "None");
  assert.equal(readingTime(40), "About 1 minute");
  assert.equal(readingTime(2380), "About 10 minutes");
});

test("a quote opens after a space, a bracket or a dash, and closes after a letter", () => {
  for (const before of ["", " ", "\t", "(", "—", "-"])
    assert.ok(opensQuote(before), JSON.stringify(before));
  for (const before of ["a", ".", "!", "”"])
    assert.ok(!opensQuote(before), JSON.stringify(before));
});
