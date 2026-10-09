import assert from "node:assert/strict";
import { test } from "node:test";
import { documentText, plainTextToDocument, serializeDocument } from "./writing-document.ts";
import { readerCheckpoint } from "./writing-revisions.ts";

test("published reading omits retained deletions and research without changing private history", () => {
  const doc = plainTextToDocument("", "newsreader");
  doc.pages[0]!.content = { type: "doc", content: [{ type: "paragraph", content: [
    { type: "text", text: "Old private wording", marks: [{ type: "writingDeletion", attrs: { id: "change-one" } }] },
    { type: "text", text: "New wording", marks: [{ type: "writingInsertion", attrs: { id: "change-one" } }, { type: "bold" }] },
  ] }] };
  const original = serializeDocument(doc);
  assert.equal(documentText(doc), "New wording");
  const checkpoint = { id: crypto.randomUUID(), name: "Reading", createdAt: new Date().toISOString(), pieces: [
    { id: "writing_00000000-0000-4000-8000-000000000001", title: "Draft", body: "Old private wordingNew wording", document: original },
    { id: "writing_00000000-0000-4000-8000-000000000002", title: "Research", body: "Private source", document: serializeDocument({ ...doc, purpose: "research" }) },
  ] };
  const published = readerCheckpoint(checkpoint);
  assert.equal(published.pieces.length, 1);
  assert.equal(published.pieces[0]!.body, "New wording");
  assert.ok(!published.pieces[0]!.document!.includes("Old private wording"));
  assert.ok(!published.pieces[0]!.document!.includes("writingInsertion"));
  assert.ok(published.pieces[0]!.document!.includes('"bold"'));
  assert.equal(checkpoint.pieces[0]!.document, original);
});
