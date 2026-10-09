import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createProjectBackup,
  parseProjectBackup,
  prepareProjectRestore,
} from "./writing-project-backup.ts";
import { plainTextToDocument, serializeDocument } from "./writing-document.ts";
import {
  researchSourceSchema,
  researchNoteSchema,
} from "./writing-research-notes.ts";
import {
  structureRecordSchema,
  gridRowSchema,
  timelineEventSchema,
} from "./writing-structure.ts";
import { EMPTY_STUDIO } from "./writing-studio-data.ts";
import { newWritingEntryId } from "./writing.ts";
import {
  newWritingProjectId,
  type WritingProject,
} from "./writing-projects.ts";
function fixture() {
  const id = newWritingEntryId(),
    next = newWritingEntryId();
  const doc = plainTextToDocument("Preserve original", "literata");
  doc.pages[0]!.content.content!.push({
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Internal",
        marks: [
          { type: "link", attrs: { href: `/doc?entry=${next}#section_a` } },
          { type: "writingInsertion", attrs: { id: "change" } },
        ],
      },
    ],
  });
  const project: WritingProject = {
    id: newWritingProjectId(),
    title: "Book",
    template: "novel",
    plan: { plotlines: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const studio = structuredClone(EMPTY_STUDIO);
  studio.research.sources = [
    researchSourceSchema.parse({
      id: "source",
      title: "Book source",
      citation: "Author (2026)",
      excerpt: "Quoted words",
      footnote: "Page 3",
    }),
  ];
  studio.research.notes = [
    researchNoteSchema.parse({
      id: "note",
      pieceId: id,
      quote: "Preserve original",
      body: "Evidence note",
      sourceId: "source",
    }),
  ];
  studio.structure.records = [
    structureRecordSchema.parse({
      id: "person",
      kind: "person",
      name: "Ada",
      pieceIds: [id, next],
    }),
  ];
  studio.structure.gridRows = [
    gridRowSchema.parse({
      id: "row",
      kind: "argument",
      label: "Main claim",
      cells: { [id]: "Evidence" },
    }),
  ];
  studio.structure.timeline = [
    timelineEventSchema.parse({
      id: "event",
      label: "Chapter event",
      pieceId: id,
    }),
  ];
  studio.structure.customFields = [
    { id: "field", name: "Custom", kind: "text", options: [] },
  ];
  studio.structure.goal.pieceIds = [id];
  studio.structure.pieceValues = { [id]: { field: "Value" } };
  studio.revisions.checkpoints = [
    {
      id: crypto.randomUUID(),
      name: "Before",
      createdAt: new Date().toISOString(),
      pieces: [
        {
          id: next,
          title: "Historical",
          body: "Preserve original",
          document: serializeDocument(doc),
        },
      ],
    },
  ];
  return createProjectBackup(
    project,
    [
      { id, title: "Chapter", doc },
      {
        id: next,
        title: "Second",
        doc: plainTextToDocument("Second", "literata"),
      },
    ],
    studio,
    {
      [id]: JSON.stringify({
        version: 1,
        suggestions: [],
        comments: [],
        cuttings: [{ id: "cut", text: "Private words", createdAt: "today" }],
      }),
    },
  );
}
test("project restore creates distinct IDs, remaps links/checkpoints and preserves drafts and device notes", () => {
  const backup = fixture(),
    before = JSON.stringify(backup),
    restored = prepareProjectRestore(backup);
  assert.notEqual(restored.project.id, backup.project.id);
  assert.notEqual(restored.pieces[0]!.id, backup.pieces[0]!.id);
  assert.equal(
    restored.studio.revisions.checkpoints[0]!.pieces[0]!.id,
    restored.pieces[1]!.id,
  );
  assert.notEqual(
    restored.studio.revisions.checkpoints[0]!.id,
    backup.studio.revisions.checkpoints[0]!.id,
  );
  assert.ok(
    restored.pieces[0]!.document.includes(
      `/doc?entry=${restored.pieces[1]!.id}#section_a`,
    ),
  );
  assert.ok(restored.pieces[0]!.document.includes("writingInsertion"));
  assert.equal(
    restored.deviceRevisions[restored.pieces[0]!.id],
    backup.deviceRevisions[backup.pieces[0]!.id],
  );
  assert.deepEqual(
    restored.studio.research.sources,
    backup.studio.research.sources,
  );
  assert.equal(
    restored.studio.research.notes[0]!.pieceId,
    restored.pieces[0]!.id,
  );
  assert.deepEqual(
    restored.studio.structure.records[0]!.pieceIds,
    restored.pieces.map((piece) => piece.id),
  );
  assert.equal(
    restored.studio.structure.gridRows[0]!.cells[restored.pieces[0]!.id],
    "Evidence",
  );
  assert.equal(
    restored.studio.structure.timeline[0]!.pieceId,
    restored.pieces[0]!.id,
  );
  assert.deepEqual(restored.studio.structure.goal.pieceIds, [
    restored.pieces[0]!.id,
  ]);
  assert.deepEqual(
    restored.studio.structure.pieceValues[restored.pieces[0]!.id],
    { field: "Value" },
  );
  assert.equal(JSON.stringify(backup), before);
  assert.deepEqual(parseProjectBackup(JSON.stringify(restored)), restored);
});
test("malformed, duplicate and unsupported data refuse restore without changing original", () => {
  const backup = fixture();
  assert.throws(() => parseProjectBackup("no"), /readable/);
  assert.throws(
    () => parseProjectBackup(JSON.stringify({ ...backup, version: 2 })),
    /supported/,
  );
  assert.throws(
    () =>
      parseProjectBackup(
        JSON.stringify({
          ...backup,
          pieces: [backup.pieces[0], backup.pieces[0]],
        }),
      ),
    /distinct/,
  );
  assert.throws(
    () =>
      parseProjectBackup(
        JSON.stringify({
          ...backup,
          studio: { ...backup.studio, futureFeature: "cannot lose" },
        }),
      ),
    /cannot keep/,
  );
  assert.throws(
    () =>
      parseProjectBackup(
        JSON.stringify({
          ...backup,
          project: {
            ...backup.project,
            plan: { ...backup.project.plan, futureFeature: 1 },
          },
        }),
      ),
    /cannot keep/,
  );
  const document = JSON.parse(backup.pieces[0]!.document);
  document.futureFeature = "keep";
  assert.ok(
    parseProjectBackup(
      JSON.stringify({
        ...backup,
        pieces: [
          { ...backup.pieces[0], document: JSON.stringify(document) },
          backup.pieces[1],
        ],
      }),
    ).pieces[0]!.document.includes("futureFeature"),
  ); // document schema preserves unknown rich data
});
