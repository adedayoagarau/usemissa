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
