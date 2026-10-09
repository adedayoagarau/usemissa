import assert from "node:assert/strict";
import { test } from "node:test";
import { Schema } from "@tiptap/pm/model";
import { newDocument, toCanvasPage } from "./writing-document.ts";
import {
  manuscriptHeadings,
  mergeManuscriptPieces,
  manuscriptSearchDocument,
} from "./writing-manuscript.ts";
import {
  isProjectTemplate,
  newWritingProjectId,
  parseProjectCreate,
  PROJECT_TEMPLATES,
} from "./writing-projects.ts";

test("search namespaces copied page ids without changing the pieces or their format", () => {
  const doc = newDocument("literata");
  const before = JSON.stringify(doc);
  const result = manuscriptSearchDocument([
    { id: "a", title: "A", doc },
    { id: "b", title: "B", doc },
  ])!;
  assert.equal(result.pages.length, 2);
  assert.notEqual(result.pages[0]!.id, result.pages[1]!.id);
  assert.equal(result.pages[0]!.id, `a/${doc.pages[0]!.id}`);
  assert.deepEqual(result.pages[0]!.format, doc.pages[0]!.format);
  assert.equal(JSON.stringify(doc), before);
  assert.equal(manuscriptSearchDocument([]), null);
});

test("outline offsets match ProseMirror positions after empty paragraphs and nested lists", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { group: "block", content: "inline*" },
      heading: {
        group: "block",
        content: "inline*",
        attrs: { level: { default: 1 } },
      },
      bulletList: { group: "block", content: "listItem+" },
      listItem: { content: "block+" },
      text: { group: "inline" },
      hardBreak: { inline: true, group: "inline" },
    },
  });
  const doc = newDocument("literata");
  doc.pages[0]!.content = {
    type: "doc",
    content: [
      { type: "paragraph" },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Before" }, { type: "hardBreak" }],
      },
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "First" }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Nested" }],
              },
            ],
          },
        ],
      },
    ],
  };
  const expected: number[] = [];
  schema.nodeFromJSON(doc.pages[0]!.content).descendants((node, position) => {
    if (node.type.name === "heading") expected.push(position + 1);
  });
  const headings = manuscriptHeadings([{ id: "piece", title: "Piece", doc }]);
  assert.deepEqual(
    headings.map((heading) => heading.position),
    expected,
  );
  assert.deepEqual(
    headings.map((heading) => heading.label),
    ["First", "Nested"],
  );
});

test("outline includes canvas headings in reading order using original editor keys", () => {
  const doc = newDocument("literata");
  const page = toCanvasPage(doc.pages[0]!, doc.pageSize);
  const heading = (label: string) => ({
    type: "doc",
    content: [{ type: "heading", content: [{ type: "text", text: label }] }],
  });
  page.blocks = [
    {
      id: "block_bottom",
      x: 0,
      y: 50,
      width: 50,
      rotation: 0,
      content: heading("Bottom"),
    },
    {
      id: "block_top",
      x: 0,
      y: 0,
      width: 50,
      rotation: 0,
      content: heading("Top"),
    },
  ];
  doc.pages = [page];
  const headings = manuscriptHeadings([{ id: "piece", title: "Canvas", doc }]);
  assert.deepEqual(
    headings.map((item) => item.label),
    ["Top", "Bottom"],
  );
  assert.equal(headings[0]!.editorKey, `${page.id}/block_top`);
});

test("new templates validate alongside all existing project templates", () => {
  for (const template of Object.keys(PROJECT_TEMPLATES)) {
    assert.ok(isProjectTemplate(template));
    assert.ok(
      !("error" in parseProjectCreate({ id: newWritingProjectId(), template })),
    );
  }
  assert.equal(isProjectTemplate("toString"), false);
  for (const template of ["article", "report", "script"] as const)
    assert.ok(PROJECT_TEMPLATES[template].pieces.length);
});

test("combined edits keep research material in a whole-project backup", () => {
  const draft = { id: "draft", title: "Draft", doc: newDocument("newsreader") };
  const research = { id: "research", title: "Private sources", doc: { ...newDocument("newsreader"), purpose: "research" as const } };
  const edited = { ...draft, title: "Edited draft" };
  const result = mergeManuscriptPieces([draft, research], [edited]);
  assert.deepEqual(result, [edited, research]);
  assert.equal(result[1]!.doc.purpose, "research");
});
