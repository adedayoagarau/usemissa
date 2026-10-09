import assert from "node:assert/strict";
import { test } from "node:test";
import { getSchema } from "@tiptap/react";
import { EditorState, TextSelection, type Transaction } from "@tiptap/pm/state";
import { history, undo } from "@tiptap/pm/history";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  documentText,
  newDocument,
  parseWritingDocument,
  serializeDocument,
  WRITING_DOCUMENT_MAX,
} from "./writing-document.ts";
import {
  WritingSections,
  writingFoldKey,
  toggleWritingSection,
  ensureWritingSectionId,
  writingSectionId,
  writingImageWidth,
  writingSectionRange,
  moveWritingSection,
  localWritingImage,
  writingImageAlt,
  writingImageFits,
  writingImageSource,
  writingLinkHref,
  writingRichExtensions,
  WRITING_IMAGE_MAX,
} from "./writing-rich.ts";

const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/WZkAAAAASUVORK5CYII=";
const schema = getSchema([
  StarterKit.configure({ link: false }),
  ...writingRichExtensions(),
]);

test("manual links reject unsafe schemes, controls, relative paths and credentials", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "/page",
    "//example.com",
    "https://user:secret@example.com",
    "https://exam\nple.com",
    "mailto:invalid",
    "file:///tmp/photo.png",
  ])
    assert.equal(writingLinkHref(value), null);
  assert.equal(
    writingLinkHref(" https://example.com/report "),
    "https://example.com/report",
  );
  assert.equal(
    writingLinkHref("mailto:writer@example.com"),
    "mailto:writer@example.com",
  );
  assert.equal(writingLinkHref("http://example.com"), "http://example.com/");
});

test("image sources require bounded verified raster data and a nonempty description", async () => {
  assert.equal(writingImageSource(png), png);
  for (const source of [
    "https://example.com/tracker.png",
    "file:///tmp/local.png",
    "blob:https://example.com/photo",
    "data:image/svg+xml;base64,PHN2Zz4=",
    png.replace("image/png", "image/jpeg"),
    "data:image/png;base64,not-an-image",
  ])
    assert.equal(writingImageSource(source), null);
  assert.equal(
    writingImageSource(
      `data:image/png;base64,${Buffer.alloc(WRITING_IMAGE_MAX + 1).toString("base64")}`,
    ),
    null,
  );
  assert.equal(writingImageAlt("  A tree.  "), "A tree.");
  assert.equal(writingImageAlt("  "), null);
  const bytes = Buffer.from(png.split(",")[1]!, "base64");
  assert.equal(
    await localWritingImage({
      size: bytes.length,
      arrayBuffer: async () =>
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
    }),
    png,
  );
  await assert.rejects(
    localWritingImage({
      size: WRITING_IMAGE_MAX + 1,
      arrayBuffer: async () => new ArrayBuffer(0),
    }),
    /128 KB/,
  );
  await assert.rejects(
    localWritingImage({
      size: 4,
      arrayBuffer: async () => new TextEncoder().encode("<svg").buffer,
    }),
    /PNG or JPEG/,
  );
});

test("actual rich schema round trips table headers, cells, links and embedded image metadata", () => {
  const paragraph = {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Research",
        marks: [{ type: "link", attrs: { href: "https://example.com" } }],
      },
    ],
  };
  const doc = newDocument("literata");
  doc.pages[0]!.content = schema
    .nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableHeader", content: [paragraph] },
                { type: "tableCell", content: [{ type: "paragraph" }] },
              ],
            },
          ],
        },
        { type: "image", attrs: { src: png, alt: "A single pixel" } },
      ],
    })
    .toJSON();
  const restored = parseWritingDocument(serializeDocument(doc))!;
  const node = schema.nodeFromJSON(restored.pages[0]!.content);
  node.check();
  assert.deepEqual(node.toJSON(), doc.pages[0]!.content);
  assert.equal(node.child(0).child(0).child(0).type.name, "tableHeader");
  assert.equal(node.child(1).attrs.alt, "A single pixel");
  assert.equal(documentText(restored), "Research\n\n");
});

test("rendering stored remote images cannot issue a fetch, and unsafe links lose their target", () => {
  const remote = schema.nodes.image!.create({
    src: "https://example.com/tracker.png",
    alt: "Remote",
  });
  const safe = schema.nodes.image!.create({ src: png, alt: "A single pixel" });
  const missingAlt = schema.nodes.image!.create({ src: png, alt: "" });
  const spec = schema.nodes.image!.spec.toDOM!;
  assert.equal((spec(remote) as [string, { src?: string }])[1].src, undefined);
  assert.equal(
    (spec(missingAlt) as [string, { src?: string }])[1].src,
    undefined,
  );
  assert.equal((spec(safe) as [string, { src?: string }])[1].src, png);
  const unsafeLink = schema.marks.link!.create({ href: "javascript:alert(1)" });
  const linkSpec = schema.marks.link!.spec.toDOM!(unsafeLink, true) as [
    string,
    { href: string },
  ];
  assert.equal(linkSpec[1].href, "");
});

test("image insertion checks the whole document budget, including other pages", () => {
  const doc = newDocument("literata");
  assert.equal(writingImageFits(doc, png, "A tree"), true);
  doc.pages.push({
    ...doc.pages[0]!,
    id: "page_second",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "a".repeat(WRITING_DOCUMENT_MAX) }],
        },
      ],
    },
  });
  assert.equal(writingImageFits(doc, png, "A tree"), false);
  assert.equal(writingImageFits(newDocument("literata"), png, ""), false);
});

test("checklists, highlight, captions and footnotes survive the actual editor schema and storage", () => {
  const document = newDocument("literata");
  const content = schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: true },
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Checked",
                    marks: [{ type: "highlight" }],
                  },
                ],
              },
            ],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Open" }] },
            ],
          },
        ],
      },
      {
        type: "image",
        attrs: { src: png, alt: "One pixel", caption: "Figure one" },
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Source" },
          {
            type: "footnote",
            attrs: { id: "note-a", note: "A source description." },
          },
        ],
      },
    ],
  });
  content.check();
  document.pages[0]!.content = content.toJSON();
  const restored = parseWritingDocument(serializeDocument(document))!;
  assert.deepEqual(
    schema.nodeFromJSON(restored.pages[0]!.content).toJSON(),
    content.toJSON(),
  );
  assert.equal(content.child(0).child(0).attrs.checked, true);
  assert.equal(content.child(1).attrs.caption, "Figure one");
  assert.equal(content.child(2).child(1).attrs.note, "A source description.");
  assert.match(documentText(restored), /Checked\nOpen/);
  assert.match(documentText(restored), /Figure one/);
  const spec = schema.nodes.image!.spec.toDOM!(
    content.child(1),
  ) as readonly unknown[];
  assert.equal(spec[0], "figure");
  assert.deepEqual(spec[3], ["figcaption", {}, "Figure one"]);
});

test("piece links allow only the document route with a valid writing identity", () => {
  const path = "/doc?entry=writing_12345678-1234-1234-1234-123456789abc";
  assert.equal(writingLinkHref(path), path);
  const link = schema.marks.link!.create({ href: path });
  const rendered = schema.marks.link!.spec.toDOM!(link, true) as readonly [
    string,
    { href: string },
  ];
  assert.equal(rendered[1].href, path);
  assert.equal(writingLinkHref(path + "#chapter-one"), path + "#chapter-one");
  for (const unsafe of [
    "/doc?entry=writing_hello",
    path + "&redirect=https://other.com",
    "/admin",
    path + "#<script>",
  ])
    assert.equal(writingLinkHref(unsafe), null);
});

test("section identities and bounded image widths survive the rich schema", () => {
  const id = `section_${crypto.randomUUID()}`;
  const document = schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1, sectionId: id },
        content: [{ type: "text", text: "A section" }],
      },
      {
        type: "image",
        attrs: { src: png, alt: "A pixel", widthPercent: 50, caption: "Local" },
      },
    ],
  });
  assert.equal(document.firstChild?.attrs.sectionId, id);
  assert.equal(document.lastChild?.attrs.widthPercent, 50);
  assert.equal(writingSectionId(id), id);
  assert.equal(writingSectionId("section_bad#injection"), null);
  for (const width of [NaN, Infinity, -1, 0, 101, "30px", 49.5])
    assert.equal(writingImageWidth(width), 100);
  assert.equal(writingImageWidth("75"), 75);
});

test("section ranges include child headings and safe moves undo in one step", () => {
  const heading = (text: string, level = 1) => ({
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  });
  const paragraph = (text: string) => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  });
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: [
      heading("First"),
      paragraph("Body"),
      heading("Nested", 2),
      paragraph("Child"),
      heading("Second"),
      paragraph("End"),
    ],
  });
  let state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, 1),
    plugins: [history()],
  });
  const editor = {
    get state() {
      return state;
    },
    view: {
      dispatch(tr: Transaction) {
        state = state.apply(tr);
      },
    },
  } as unknown as Editor;
  const first = writingSectionRange(doc, 1)!;
  assert.equal(doc.slice(first.from, first.to).content.childCount, 4);
  assert.equal(moveWritingSection(editor, -1, false), false);
  assert.equal(moveWritingSection(editor, 1, false), true);
  assert.equal(moveWritingSection(editor, 1), true);
  assert.equal(state.doc.firstChild?.textContent, "Second");
  assert.equal(state.doc.child(2).textContent, "First");
  assert.equal(
    undo(state, (tr) => {
      state = state.apply(tr);
    }),
    true,
  );
  assert.deepEqual(state.doc.toJSON(), doc.toJSON());
  state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, first.to + 1),
  });
  assert.equal(moveWritingSection(editor, 1, false), false);
});

test("folding hides the section only in the view and keeps stored prose complete", () => {
  const id = `section_${crypto.randomUUID()}`;
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1, sectionId: id },
        content: [{ type: "text", text: "Section" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Retained prose" }],
      },
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Next" }],
      },
    ],
  });
  const plugins = WritingSections.config.addProseMirrorPlugins!.call(
    WritingSections as never,
  );
  let state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, 1),
    plugins,
  });
  const editor = {
    get state() {
      return state;
    },
    view: {
      dispatch(tr: Transaction) {
        state = state.apply(tr);
      },
    },
  } as unknown as Editor;
  assert.equal(toggleWritingSection(editor), true);
  assert.equal(writingFoldKey.getState(state)?.has(id), true);
  assert.deepEqual(state.doc.toJSON(), doc.toJSON());
  assert.equal(state.doc.textContent, "SectionRetained proseNext");
  assert.equal(toggleWritingSection(editor), true);
  assert.equal(writingFoldKey.getState(state)?.has(id), false);
});

test("copying a section identity repairs duplicated pasted heading IDs", () => {
  const id = `section_${crypto.randomUUID()}`;
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: ["First", "Second"].map((text) => ({
      type: "heading",
      attrs: { level: 1, sectionId: id },
      content: [{ type: "text", text }],
    })),
  });
  let state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, 1),
  });
  const editor = {
    get state() {
      return state;
    },
    view: {
      dispatch(tr: Transaction) {
        state = state.apply(tr);
      },
    },
  } as unknown as Editor;
  const fresh = ensureWritingSectionId(editor);
  assert.notEqual(fresh, id);
  assert.equal(state.doc.firstChild?.attrs.sectionId, fresh);
  assert.equal(state.doc.lastChild?.attrs.sectionId, id);
  assert.equal(ensureWritingSectionId(editor), fresh);
});
