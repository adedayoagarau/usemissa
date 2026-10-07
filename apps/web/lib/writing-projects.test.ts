import assert from "node:assert/strict";
import { test } from "node:test";
import {
  documentText,
  newDocument,
  parseWritingDocument,
  plainTextToDocument,
  serializeDocument,
} from "./writing-document.ts";
import {
  compileProject,
  compileProjectText,
  newWritingProjectId,
  parsePieceChange,
  parsePieceOrder,
  parseProjectCreate,
} from "./writing-projects.ts";
import { newWritingEntryId } from "./writing.ts";

test("a compiled project keeps every piece's pages and their formats, in order", () => {
  const poem = plainTextToDocument(
    "the light went      thin\n\twith yesterday’s news",
    "eb-garamond",
  );
  poem.pages[0]!.format.align = "center";
  poem.pages[0]!.format.lineHeight = 3;
  const second = newDocument("courier-prime");
  second.pages.push({ ...second.pages[0]!, id: "page_bbbbbbbbbbbbbbbbbbbb" });
  const compiled = compileProject(
    "Harmattan",
    [
      { title: "Light", body: "", document: serializeDocument(poem) },
      { title: "Notes", body: "plain words", document: null },
      { title: "Two pages", body: "", document: serializeDocument(second) },
    ],
    { pageSize: "a5", titlePage: true, pieceTitles: true },
    "literata",
  );
  assert.equal(compiled.pageSize, "a5");
  // Title page, one poem page, one notes page, two pages.
  assert.equal(compiled.pages.length, 5);
  assert.equal(compiled.pages[1]!.format.align, "center");
  assert.equal(compiled.pages[1]!.format.lineHeight, 3);
  assert.equal(compiled.pages[1]!.format.typeface, "eb-garamond");
  assert.equal(compiled.pages[3]!.format.typeface, "courier-prime");
  assert.equal(new Set(compiled.pages.map((page) => page.id)).size, 5);
  assert.ok(parseWritingDocument(serializeDocument(compiled)));
  const text = documentText(compiled);
  assert.ok(
    text.startsWith("Harmattan\n\nLight\nthe light went      thin\n\twith"),
  );
  assert.ok(text.includes("Notes\nplain words"));
});

test("compiling without titles adds nothing to the writing", () => {
  const compiled = compileProject(
    "Harmattan",
    [{ title: "Light", body: "only this", document: null }],
    { pageSize: "a4", titlePage: false, pieceTitles: false },
    "literata",
  );
  assert.equal(compiled.pages.length, 1);
  assert.equal(documentText(compiled), "only this");
  assert.equal(
    compileProjectText(
      "Harmattan",
      [
        { title: "One", body: "a", document: null },
        { title: "Two", body: "b", document: null },
      ],
      { titlePage: true, pieceTitles: true },
    ),
    "Harmattan\n\n\nOne\n\na\n\n* * *\n\nTwo\n\nb\n",
  );
});

test("project requests are checked", () => {
  const id = newWritingProjectId();
  assert.deepEqual(
    parseProjectCreate({ id, title: "Poems", template: "poetry" }),
    {
      id,
      title: "Poems",
      template: "poetry",
    },
  );
  assert.ok("error" in parseProjectCreate({ id, template: "screenplay" }));
  assert.ok("error" in parseProjectCreate({ id: "project_x" }));
  assert.ok("error" in parseProjectCreate({ id, title: "t".repeat(201) }));

  const entry = newWritingEntryId();
  assert.deepEqual(parsePieceOrder({ entryIds: [entry] }), {
    entryIds: [entry],
  });
  assert.ok("error" in parsePieceOrder({ entryIds: [entry, entry] }));
  assert.ok("error" in parsePieceOrder({ entryIds: ["nope"] }));

  assert.deepEqual(parsePieceChange({ projectId: null }), { projectId: null });
  assert.deepEqual(parsePieceChange({ status: "final", synopsis: "x" }), {
    status: "final",
    synopsis: "x",
  });
  assert.ok("error" in parsePieceChange({}));
  assert.ok("error" in parsePieceChange({ status: "done" }));
  assert.ok("error" in parsePieceChange({ synopsis: "x".repeat(1001) }));
  assert.ok("error" in parsePieceChange({ projectId: "project_x" }));
  assert.deepEqual(parsePieceChange({ callId: "opp_poetry-prize_2027" }), {
    callId: "opp_poetry-prize_2027",
  });
  assert.deepEqual(parsePieceChange({ callId: null }), { callId: null });
  assert.ok("error" in parsePieceChange({ callId: "not/a/call" }));
  assert.ok("error" in parsePieceChange({ callId: "x".repeat(201) }));
});
