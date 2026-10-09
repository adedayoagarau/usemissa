import assert from "node:assert/strict";
import { test } from "node:test";
import { Schema, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { checkRange, extractCheckText } from "./writing-check-text.ts";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    heading: {
      content: "inline*",
      group: "block",
      attrs: { level: { default: 1 } },
    },
    bulletList: { content: "listItem+", group: "block" },
    orderedList: { content: "listItem+", group: "block" },
    listItem: { content: "paragraph block*" },
    hardBreak: { inline: true, group: "inline", selectable: false },
    text: { group: "inline" },
  },
  marks: { bold: {}, italic: {}, writingDeletion: {} },
});

const paragraph = (...content: ProseMirrorNode[]) =>
  schema.nodes.paragraph!.create(null, content);
const text = (value: string, marks: string[] = []) =>
  schema.text(
    value,
    marks.map((name) => schema.marks[name]!.create()),
  );
const doc = (...content: ProseMirrorNode[]) =>
  schema.nodes.doc!.create(null, content);

test("maps UTF-16 checker offsets after a supplementary Unicode character", () => {
  const document = doc(paragraph(text("😀 wrng")));
  const snapshot = extractCheckText(document);
  assert.equal(snapshot.text, "😀 wrng");
  assert.deepEqual(checkRange(document, snapshot.text, 3, 7), {
    from: 4,
    to: 8,
  });
  assert.equal(checkRange(document, snapshot.text, 1, 2), null);
});

test("joins text across formatting marks without adding a boundary", () => {
  const document = doc(
    paragraph(text("hel", ["bold"]), text("lo", ["italic"]), text(" world")),
  );
  const snapshot = extractCheckText(document);
  assert.equal(snapshot.text, "hello world");
  assert.deepEqual(checkRange(document, snapshot.text, 2, 7), {
    from: 3,
    to: 8,
  });
});

test("preserves heading, paragraph, and nested list-item boundaries", () => {
  const document = doc(
    schema.nodes.heading!.create({ level: 2 }, text("Title")),
    paragraph(text("Body")),
    schema.nodes.bulletList!.create(null, [
      schema.nodes.listItem!.create(null, [
        paragraph(text("Outer")),
        schema.nodes.orderedList!.create(null, [
          schema.nodes.listItem!.create(null, paragraph(text("Inner one"))),
          schema.nodes.listItem!.create(null, paragraph(text("Inner two"))),
        ]),
      ]),
      schema.nodes.listItem!.create(null, paragraph(text("Next"))),
    ]),
  );
  const snapshot = extractCheckText(document);
  assert.equal(snapshot.text, "Title\nBody\nOuter\nInner one\nInner two\nNext");
  assert.equal(checkRange(document, snapshot.text, 0, 5)?.to, 6);
  assert.equal(checkRange(document, snapshot.text, 3, 8), null);
});

test("marks hard breaks and block separators as non-crossable boundaries", () => {
  const document = doc(
    paragraph(text("first"), schema.nodes.hardBreak!.create(), text("second")),
    paragraph(text("third")),
  );
  const snapshot = extractCheckText(document);
  assert.equal(snapshot.text, "first\nsecond\nthird");
  assert.deepEqual(checkRange(document, snapshot.text, 0, 5), {
    from: 1,
    to: 6,
  });
  assert.equal(checkRange(document, snapshot.text, 0, 7), null);
  assert.equal(checkRange(document, snapshot.text, 12, 17), null);
  assert.deepEqual(checkRange(document, snapshot.text, 6, 12), {
    from: 7,
    to: 13,
  });
  assert.ok(checkRange(document, snapshot.text, 5, 5));
});

test("rejects stale snapshots and invalid checker ranges", () => {
  const document = doc(paragraph(text("current text")));
  const snapshot = extractCheckText(document).text;
  assert.equal(checkRange(document, "older text", 0, 5), null);
  assert.equal(checkRange(document, snapshot, -1, 2), null);
  assert.equal(checkRange(document, snapshot, 4, 3), null);
  assert.equal(checkRange(document, snapshot, 0, snapshot.length + 1), null);
  assert.equal(checkRange(document, snapshot, 1.5, 2), null);
  assert.deepEqual(checkRange(document, snapshot, 7, 7), { from: 8, to: 8 });
});

test("tracked deletions are excluded and cannot be consumed by grammar replacements", () => {
  const document = doc(
    paragraph(
      text("Good "),
      text("mispelled", ["writingDeletion"]),
      text("new wrd"),
    ),
  );
  const snapshot = extractCheckText(document);
  assert.equal(snapshot.text, "Good \nnew wrd");
  assert.equal(checkRange(document, snapshot.text, 0, 10), null);
  assert.deepEqual(checkRange(document, snapshot.text, 10, 13), {
    from: 19,
    to: 22,
  });
});
