import { z } from "zod";
import type { JsonNode, WritingDocument } from "./writing-document";
import { writingLinkHref, writingSectionId } from "./writing-rich";

export const RESEARCH_SOURCE_MAX = 100;
export const RESEARCH_NOTE_MAX = 200;
export const RESEARCH_SNIPPET_MAX = 20_000;
export const RESEARCH_IMPORT_BYTES_MAX = 80_000;
const contextLength = 80;
const idSchema = z.string().min(1).max(100);
const shortText = z.string().max(500).default("");
const longText = z.string().max(RESEARCH_SNIPPET_MAX).default("");

/** This is a link, never a request to fetch its contents. */
export function safeResearchUrl(value: string): boolean {
  if (!value) return true;
  if (value.trim() !== value || /[\u0000-\u0020\u007f]/.test(value))
    return false;
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export const researchSourceSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(500),
  sourceType: z
    .enum(["webpage", "article-journal", "book", "report"])
    .default("webpage"),
  publicationName: shortText,
  publisher: shortText,
  volume: z.string().max(100).default(""),
  issue: z.string().max(100).default(""),
  url: z
    .string()
    .max(2_000)
    .refine(safeResearchUrl, "Use a complete http or https link.")
    .default(""),
  author: shortText,
  authorFamily: shortText,
  authorGiven: shortText,
  publicationDate: z.string().max(100).default(""),
  page: z.string().max(100).default(""),
  excerpt: longText,
  notes: longText,
  citation: z.string().max(4_000).default(""),
  footnote: z.string().max(4_000).default(""),
});

export const researchNoteSchema = z.object({
  id: idSchema,
  pieceId: idSchema,
  quote: z.string().min(1).max(RESEARCH_SNIPPET_MAX),
  before: z.string().max(contextLength).default(""),
  after: z.string().max(contextLength).default(""),
  body: z.string().trim().min(1).max(RESEARCH_SNIPPET_MAX),
  sourceId: idSchema.nullable().default(null),
});

export const researchSchema = z
  .object({
    version: z.literal(1).default(1),
    sources: z.array(researchSourceSchema).max(RESEARCH_SOURCE_MAX).default([]),
    notes: z.array(researchNoteSchema).max(RESEARCH_NOTE_MAX).default([]),
  })
  .superRefine((state, context) => {
    const ids = [...state.sources, ...state.notes].map((record) => record.id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        message: "Research records need distinct IDs.",
      });
    const sources = new Set(state.sources.map((source) => source.id));
    if (
      state.notes.some(
        (note) => note.sourceId !== null && !sources.has(note.sourceId),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "A linked source is missing.",
      });
    }
    if (JSON.stringify(state).length > 1_000_000)
      context.addIssue({
        code: "custom",
        message: "Research is limited to one million characters.",
      });
  });

export type ResearchSource = z.infer<typeof researchSourceSchema>;
export type ResearchNote = z.infer<typeof researchNoteSchema>;
export type ResearchState = z.infer<typeof researchSchema>;
export const EMPTY_RESEARCH: ResearchState = {
  version: 1,
  sources: [],
  notes: [],
};

export type ResearchAnchor =
  | { status: "anchored"; start: number; end: number }
  | {
      status: "orphaned";
      reason: "other-piece" | "missing" | "ambiguous" | "context-changed";
    };

function occurrences(text: string, quote: string): number[] {
  if (!quote) return [];
  const found: number[] = [];
  for (
    let start = text.indexOf(quote);
    start !== -1;
    start = text.indexOf(quote, start + 1)
  )
    found.push(start);
  return found;
}

/** Never use approximate matches or an old offset to move a note. */
export function locateResearchAnchor(
  note: ResearchNote,
  pieceId: string,
  text: string,
): ResearchAnchor {
  if (note.pieceId !== pieceId)
    return { status: "orphaned", reason: "other-piece" };
  const found = occurrences(text, note.quote);
  if (!found.length) return { status: "orphaned", reason: "missing" };
  if (found.length === 1)
    return {
      status: "anchored",
      start: found[0]!,
      end: found[0]! + note.quote.length,
    };
  const contextual = found.filter(
    (start) =>
      (note.before.length > 0 || note.after.length > 0) &&
      text.slice(Math.max(0, start - note.before.length), start) ===
        note.before &&
      text.slice(
        start + note.quote.length,
        start + note.quote.length + note.after.length,
      ) === note.after,
  );
  if (contextual.length === 1)
    return {
      status: "anchored",
      start: contextual[0]!,
      end: contextual[0]! + note.quote.length,
    };
  return {
    status: "orphaned",
    reason:
      contextual.length > 1 || (!note.before && !note.after)
        ? "ambiguous"
        : "context-changed",
  };
}

/** Without a selection offset, repeated text cannot identify its intended occurrence. */
export function createResearchAnchor(
  pieceId: string,
  quote: string,
  text: string,
): Pick<ResearchNote, "pieceId" | "quote" | "before" | "after"> | null {
  if (!pieceId || !quote || quote.length > RESEARCH_SNIPPET_MAX) return null;
  const found = occurrences(text, quote);
  if (found.length !== 1) return null;
  const start = found[0]!;
  return {
    pieceId,
    quote,
    before: text.slice(Math.max(0, start - contextLength), start),
    after: text.slice(
      start + quote.length,
      start + quote.length + contextLength,
    ),
  };
}

export function researchRecordId(): string {
  return `research_${crypto.randomUUID()}`;
}

export type ResearchPiece = {
  id: string;
  title: string;
  doc?: WritingDocument;
};
export type PieceLinkTarget = {
  pieceId: string;
  sectionId?: string;
  label: string;
  href: string;
};
export function researchPieceLink(
  pieceId: string,
  sectionId?: string,
): string | null {
  if (sectionId !== undefined && !writingSectionId(sectionId)) return null;
  return writingLinkHref(
    `/doc?entry=${pieceId}${sectionId ? `#${sectionId}` : ""}`,
  );
}
function researchNodes(doc: WritingDocument): JsonNode[] {
  return doc.pages.flatMap((page) =>
    page.kind === "canvas"
      ? (page.blocks ?? []).map((block) => block.content)
      : [page.content],
  );
}
function walkResearchNodes(nodes: JsonNode[], visit: (node: JsonNode) => void) {
  for (const node of nodes) {
    visit(node);
    if (node.content) walkResearchNodes(node.content, visit);
  }
}
function researchNodeText(node: JsonNode): string {
  return node.text ?? (node.content ?? []).map(researchNodeText).join("");
}
export function researchPieceTargets(
  pieces: ResearchPiece[],
): PieceLinkTarget[] {
  return pieces.flatMap((piece) => {
    const href = researchPieceLink(piece.id);
    if (!href) return [];
    const targets: PieceLinkTarget[] = [
      { pieceId: piece.id, label: piece.title || "Untitled piece", href },
    ];
    const sectionCounts = new Map<string, number>();
    if (piece.doc)
      walkResearchNodes(researchNodes(piece.doc), (node) => {
        const sectionId =
          node.type === "heading"
            ? writingSectionId(node.attrs?.sectionId)
            : null;
        if (sectionId)
          sectionCounts.set(sectionId, (sectionCounts.get(sectionId) ?? 0) + 1);
      });
    if (piece.doc)
      walkResearchNodes(researchNodes(piece.doc), (node) => {
        const sectionId =
          node.type === "heading"
            ? writingSectionId(node.attrs?.sectionId)
            : null;
        if (!sectionId || sectionCounts.get(sectionId) !== 1) return;
        const sectionHref = researchPieceLink(piece.id, sectionId);
        if (sectionHref)
          targets.push({
            pieceId: piece.id,
            sectionId,
            label: `${piece.title || "Untitled piece"} · ${researchNodeText(node) || "Untitled heading"}`,
            href: sectionHref,
          });
      });
    return targets;
  });
}
/** Backlinks reflect saved link marks, never textual mentions or external lookalike URLs. */
export function researchPieceBacklinks(
  pieces: ResearchPiece[],
  targetId: string,
): { pieceId: string; title: string; sections: string[] }[] {
  return pieces.flatMap((piece) => {
    if (!piece.doc || piece.id === targetId) return [];
    const sections = new Set<string>();
    let found = false;
    walkResearchNodes(researchNodes(piece.doc), (node) => {
      for (const mark of node.marks ?? []) {
        if (mark.type !== "link") continue;
        const href = writingLinkHref(mark.attrs?.href);
        if (!href?.startsWith("/doc?entry=")) continue;
        const url = new URL(href, "https://missa.invalid");
        if (url.searchParams.get("entry") !== targetId) continue;
        found = true;
        if (url.hash) sections.add(url.hash.slice(1));
      }
    });
    return found
      ? [
          {
            pieceId: piece.id,
            title: piece.title || "Untitled piece",
            sections: [...sections],
          },
        ]
      : [];
  });
}
export const RESEARCH_CITATION_STYLES = [
  { id: "apa", label: "APA" },
  { id: "harvard1", label: "Harvard" },
] as const;
export type ResearchCitationStyle =
  (typeof RESEARCH_CITATION_STYLES)[number]["id"];
/** Dates and names come only from the writer. No network metadata lookup is performed. */
export function researchCitationData(source: ResearchSource) {
  const date = source.publicationDate.trim();
  let issued: { "date-parts": [number[]] } | undefined;
  if (/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(date)) {
    const parts = date.split("-").map(Number);
    const [year, month = 1, day = 1] = parts;
    const check = new Date(0);
    check.setUTCFullYear(year, month - 1, day);
    check.setUTCHours(0, 0, 0, 0);
    if (
      check.getUTCFullYear() === year &&
      check.getUTCMonth() === month - 1 &&
      check.getUTCDate() === day
    )
      issued = { "date-parts": [parts] };
  }
  return {
    data: {
      id: source.id,
      type: source.sourceType,
      title: source.title,
      ...(source.authorFamily.trim()
        ? {
            author: [
              {
                family: source.authorFamily.trim(),
                ...(source.authorGiven.trim()
                  ? { given: source.authorGiven.trim() }
                  : {}),
              },
            ],
          }
        : source.author.trim()
          ? { author: [{ literal: source.author.trim() }] }
          : {}),
      ...(issued ? { issued } : {}),
      ...(source.url ? { URL: source.url } : {}),
      ...(source.publicationName
        ? { "container-title": source.publicationName }
        : {}),
      ...(source.publisher ? { publisher: source.publisher } : {}),
      ...(source.volume ? { volume: source.volume } : {}),
      ...(source.issue ? { issue: source.issue } : {}),
      ...(source.page ? { page: source.page } : {}),
    },
    warning:
      date && !issued
        ? "Publication date was left out. Use YYYY, YYYY-MM or YYYY-MM-DD to format it."
        : "",
  };
}
export async function formatResearchCitation(
  source: ResearchSource,
  style: ResearchCitationStyle,
) {
  if (!RESEARCH_CITATION_STYLES.some((option) => option.id === style))
    throw new Error("Choose a citation style.");
  const [{ Cite }] = await Promise.all([
    import("@citation-js/core"),
    import("@citation-js/plugin-csl"),
  ]);
  const prepared = researchCitationData(source);
  const cite = new Cite([prepared.data]);
  const bibliography = String(
    cite.format("bibliography", {
      format: "text",
      style,
      lang: "en-US",
    }),
  ).trim();
  const citation = String(
    cite.format("citation", {
      format: "text",
      style,
      lang: "en-US",
      entry: [source.id],
      citationsPre: [],
      citationsPost: [],
    }),
  ).trim();
  return { bibliography, citation, warning: prepared.warning };
}
