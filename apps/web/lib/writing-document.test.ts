import assert from "node:assert/strict";
import { test } from "node:test";
import {
  documentText,
  emptyPage,
  newDocument,
  parseWritingDocument,
  plainTextToDocument,
  serializeDocument,
  WRITING_PAGES_MAX,
  newCanvasBlock,
  pageStart,
  sectionPages,
  toCanvasPage,
  toFlowPage,
  type WritingDocument,
} from "./writing-document.ts";

test("plain text becomes one page with every space, tab and line kept", () => {
  const text = "Harmattan\n\nthe light went       thin\n\t\t\tand gold";
  const document = plainTextToDocument(text, "newsreader");
  assert.equal(document.pages.length, 1);
  assert.equal(documentText(document), text);
  assert.ok(parseWritingDocument(serializeDocument(document)));
});

test("the text of a document reads every page in order", () => {
  const document = newDocument("newsreader");
  document.pages[0]!.content = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "One" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "first" },
          { type: "hardBreak" },
          { type: "text", text: "line" },
        ],
      },
    ],
  };
  const second = emptyPage();
  second.content = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Two" }] }],
  };
  document.pages.push(second);
  assert.equal(documentText(document), "One\nfirst\nline\n\nTwo");
});

test("only well-formed documents are accepted", () => {
  const good = newDocument("literata", "a5");
  assert.ok(parseWritingDocument(good));
  assert.equal(parseWritingDocument("{not json"), null);
  assert.equal(parseWritingDocument({ ...good, version: 2 }), null);
  assert.equal(parseWritingDocument({ ...good, pageSize: "tabloid" }), null);
  assert.equal(parseWritingDocument({ ...good, pages: [] }), null);
  const page = good.pages[0]!;
  assert.equal(
    parseWritingDocument({ ...good, pages: [page, page] }),
    null,
    "page ids are unique",
  );
  assert.equal(
    parseWritingDocument({ ...good, pages: [{ ...page, kind: "canvas" }] }),
    null,
  );
  assert.equal(
    parseWritingDocument({
      ...good,
      pages: [{ ...page, format: { ...page.format, lineHeight: 9 } }],
    }),
    null,
  );
  assert.equal(
    parseWritingDocument({
      ...good,
      pages: [{ ...page, content: { type: "paragraph" } }],
    }),
    null,
  );
  const tooMany = Array.from({ length: WRITING_PAGES_MAX + 1 }, () =>
    emptyPage(),
  );
  assert.equal(parseWritingDocument({ ...good, pages: tooMany }), null);
});

test("a page turns into a canvas and back without losing a word or a space", () => {
  const document = plainTextToDocument("the light\n\t   went thin", "literata");
  const canvas = toCanvasPage(document.pages[0]!, "a4");
  assert.equal(canvas.kind, "canvas");
  assert.equal(canvas.blocks?.length, 1);
  assert.equal(canvas.blocks?.[0]?.x, canvas.format.margins.left);
  const withBoxes: WritingDocument = {
    ...document,
    pages: [
      {
        ...canvas,
        blocks: [
          ...(canvas.blocks ?? []),
          {
            ...newCanvasBlock(20, 5, 40),
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "above" }],
                },
              ],
            },
          },
          {
            ...newCanvasBlock(150, 200, 40),
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "below" }],
                },
              ],
            },
          },
        ],
      },
    ],
  };
  // Reading order: top to bottom, then left to right.
  assert.equal(
    documentText(withBoxes),
    "above\nthe light\n\t   went thin\nbelow",
  );
  assert.ok(parseWritingDocument(serializeDocument(withBoxes)));
  const back = toFlowPage(withBoxes.pages[0]!);
  assert.equal(back.kind, "flow");
  assert.equal(back.blocks, undefined);
  assert.equal(
    documentText({ ...withBoxes, pages: [back] }),
    "above\nthe light\n\t   went thin\nbelow",
  );
});

test("canvas pages are checked like any page", () => {
  const document = newDocument("literata");
  const canvas = toCanvasPage(document.pages[0]!, "a4");
  const bad = (change: Record<string, unknown>) =>
    serializeDocument({
      ...document,
      pages: [{ ...canvas, blocks: [{ ...canvas.blocks![0]!, ...change }] }],
    } as WritingDocument);
  assert.equal(parseWritingDocument(bad({ x: Number.NaN })), null);
  assert.equal(parseWritingDocument(bad({ width: 1 })), null);
  assert.equal(parseWritingDocument(bad({ id: "nope" })), null);
  assert.equal(parseWritingDocument(bad({ content: { type: "text" } })), null);
  assert.equal(
    parseWritingDocument(
      serializeDocument({
        ...document,
        pages: [{ ...canvas, continues: true }],
      }),
    ),
    null,
    "a canvas page never continues a flow",
  );
  assert.equal(
    parseWritingDocument(
      serializeDocument({
        ...document,
        pages: [{ ...document.pages[0]!, blocks: [] }],
      }),
    ),
    null,
    "only canvas pages hold boxes",
  );
});

test("page breaks keep a section together; section breaks start a new one", () => {
  const text = (words: string) => ({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: words }] }],
  });
  const document = newDocument("newsreader");
  const first = { ...document.pages[0]!, content: text("one") };
  const flowed = { ...emptyPage(), continues: true, content: text("two") };
  const broken = { ...emptyPage(), pageBreak: true, content: text("three") };
  const section = { ...emptyPage(), content: text("four") };
  const after = { ...emptyPage(), pageBreak: true, content: text("five") };
  document.pages = [first, flowed, broken, section, after];

  assert.deepEqual(
    document.pages.map((_, index) => pageStart(document.pages, index)),
    ["first", "flow", "page-break", "section-break", "page-break"],
  );
  assert.deepEqual(sectionPages(document.pages, 1), [0, 1, 2]);
  assert.deepEqual(sectionPages(document.pages, 4), [3, 4]);
  // A page break is a line between paragraphs; a section starts after a blank line.
  assert.equal(documentText(document), "one\ntwo\nthree\n\nfour\nfive");
  assert.ok(parseWritingDocument(serializeDocument(document)));

  assert.equal(
    parseWritingDocument({
      ...document,
      pages: [first, { ...broken, continues: true }],
    }),
    null,
    "a page either continues or follows a break",
  );
  const canvas = toCanvasPage(emptyPage(), "a4");
  assert.equal(
    parseWritingDocument({
      ...document,
      pages: [first, { ...canvas, pageBreak: true }],
    }),
    null,
    "a canvas page starts its own section",
  );
});
