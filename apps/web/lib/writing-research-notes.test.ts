import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createResearchAnchor,
  EMPTY_RESEARCH,
  locateResearchAnchor,
  researchSchema,
  researchSourceSchema,
  safeResearchUrl,
  type ResearchNote,
} from "./writing-research-notes.ts";

function note(text: string, quote: string): ResearchNote {
  const anchor = createResearchAnchor("piece_one", quote, text);
  assert.ok(anchor);
  return {
    id: "note_one",
    ...anchor,
    body: "Check the wording.",
    sourceId: null,
  };
}

test("research has bounded defaults and rejects unsafe links", () => {
  assert.deepEqual(researchSchema.parse({}), EMPTY_RESEARCH);
  const source = researchSourceSchema.parse({
    id: "source_one",
    title: "Essay",
  });
  assert.equal(source.url, "");
  assert.equal(source.citation, "");
  assert.equal(source.footnote, "");
  for (const url of ["https://example.org/a?b=c#d", "http://example.org", ""])
    assert.equal(safeResearchUrl(url), true);
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///etc/passwd",
    "/relative",
    "https://user:pass@example.org",
    " https://example.org",
    "https://exam\nple.org",
    "https://example.org/a b",
  ]) {
    assert.equal(safeResearchUrl(url), false, url);
    assert.equal(
      researchSourceSchema.safeParse({ id: "one", title: "Essay", url })
        .success,
      false,
    );
  }
  assert.equal(
    researchSourceSchema.safeParse({
      id: "one",
      title: "Essay",
      excerpt: "x".repeat(20_001),
    }).success,
    false,
  );
  assert.equal(
    researchSchema.safeParse({
      sources: Array.from({ length: 101 }, (_, i) => ({
        id: `s${i}`,
        title: "Essay",
      })),
    }).success,
    false,
  );
});

test("a unique exact quote remains anchored after surrounding edits", () => {
  const original = "Opening. The moon was red. Ending.";
  const saved = note(original, "The moon was red.");
  assert.deepEqual(
    locateResearchAnchor(
      saved,
      "piece_one",
      "An added introduction. " + original,
    ),
    { status: "anchored", start: 32, end: 49 },
  );
  assert.deepEqual(
    locateResearchAnchor(
      saved,
      "piece_one",
      "Changed opening. The moon was red. New ending.",
    ),
    { status: "anchored", start: 17, end: 34 },
  );
});

test("edited or removed quotes are orphaned without a fuzzy relocation", () => {
  const saved = note("Opening. The moon was red. Ending.", "The moon was red.");
  assert.deepEqual(
    locateResearchAnchor(
      saved,
      "piece_one",
      "Opening. The moon was blue. Ending.",
    ),
    { status: "orphaned", reason: "missing" },
  );
  assert.deepEqual(
    locateResearchAnchor(
      saved,
      "piece_two",
      "Opening. The moon was red. Ending.",
    ),
    { status: "orphaned", reason: "other-piece" },
  );
});

test("duplicate text uses exact context only and ambiguous context stays orphaned", () => {
  const original = "Opening. The moon was red. Ending.";
  const saved = note(original, "The moon was red.");
  const duplicated = original + "\nThe moon was red. Another ending.";
  assert.deepEqual(locateResearchAnchor(saved, "piece_one", duplicated), {
    status: "anchored",
    start: 9,
    end: 26,
  });
  assert.deepEqual(
    locateResearchAnchor(saved, "piece_one", original + "\n" + original),
    { status: "orphaned", reason: "ambiguous" },
  );
  assert.deepEqual(
    locateResearchAnchor(
      saved,
      "piece_one",
      "The moon was red. A. The moon was red. B.",
    ),
    { status: "orphaned", reason: "context-changed" },
  );
  assert.equal(createResearchAnchor("piece_one", "red", "red and red"), null);
  assert.equal(createResearchAnchor("piece_one", "", original), null);
  assert.equal(
    createResearchAnchor("piece_one", "not present", original),
    null,
  );
});

test("source links refer to saved IDs and record IDs are distinct", () => {
  const saved = note("A unique line", "unique");
  assert.equal(
    researchSchema.safeParse({ notes: [{ ...saved, sourceId: "missing" }] })
      .success,
    false,
  );
  assert.equal(
    researchSchema.safeParse({
      sources: [{ id: saved.id, title: "Essay" }],
      notes: [saved],
    }).success,
    false,
  );
  assert.equal(
    researchSchema.safeParse({
      sources: [{ id: "source_one", title: "Essay" }],
      notes: [{ ...saved, sourceId: "source_one" }],
    }).success,
    true,
  );
});

test("piece backlinks distinguish real links from mentions and scan canvas and nested content", async () => {
  const { researchPieceBacklinks, researchPieceTargets, researchPieceLink } =
    await import("./writing-research-notes");
  const { plainTextToDocument, toCanvasPage } =
    await import("./writing-document");
  const target = "writing_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    from = "writing_bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    section = "section_cccccccc-cccc-cccc-cccc-cccccccccccc";
  const doc = plainTextToDocument("Mention only", "newsreader");
  doc.pages[0].content.content!.push({
    type: "heading",
    attrs: { sectionId: section },
    content: [{ type: "text", text: "A heading" }],
  });
  const linked = plainTextToDocument("See source", "newsreader");
  linked.pages[0].content.content![0].content![0].marks = [
    { type: "link", attrs: { href: researchPieceLink(target, section) } },
  ];
  linked.pages[0] = toCanvasPage(linked.pages[0], linked.pageSize);
  const pieces = [
    { id: target, title: "Target", doc },
    { id: from, title: "From", doc: linked },
  ];
  assert.equal(
    researchPieceTargets(pieces).find((item) => item.sectionId === section)
      ?.href,
    `/doc?entry=${target}#${section}`,
  );
  assert.deepEqual(researchPieceBacklinks(pieces, target), [
    { pieceId: from, title: "From", sections: [section] },
  ]);
  assert.equal(researchPieceLink(target, "not-a-section"), null);
  assert.equal(researchPieceLink("javascript:alert(1)"), null);
});
test("local CSL formatting uses supplied metadata only and never invents invalid dates", async () => {
  const { formatResearchCitation, researchCitationData } =
    await import("./writing-research-notes");
  const source = researchSourceSchema.parse({
    id: "source",
    title: "Real title",
    author: "Ada Writer",
    publicationDate: "2026-02-30",
    url: "https://example.com/original",
  });
  assert.ok(researchCitationData(source).warning);
  assert.equal("issued" in researchCitationData(source).data, false);
  const formatted = await formatResearchCitation(
    { ...source, publicationDate: "2026-02-28" },
    "apa",
  );
  assert.ok(formatted.bibliography.includes("Real title"));
  assert.ok(formatted.bibliography.includes("Ada Writer"));
  assert.ok(formatted.bibliography.includes("2026"));
  assert.ok(formatted.bibliography.includes(source.url));
  assert.equal(formatted.warning, "");
});
test("ambiguous copied heading IDs are not offered as link destinations", async () => {
  const { researchPieceTargets } = await import("./writing-research-notes");
  const { plainTextToDocument } = await import("./writing-document");
  const doc = plainTextToDocument("Body", "newsreader");
  const heading = {
    type: "heading",
    attrs: {
      level: 2,
      sectionId: "section_cccccccc-cccc-cccc-cccc-cccccccccccc",
    },
    content: [{ type: "text", text: "Repeated" }],
  };
  doc.pages[0].content.content!.push(heading, heading);
  assert.equal(
    researchPieceTargets([
      {
        id: "writing_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        title: "Piece",
        doc,
      },
    ]).length,
    1,
  );
});
