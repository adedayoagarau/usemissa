import {
  documentText,
  newDocument,
  parseWritingDocument,
  plainTextToDocument,
  type FlowPage,
  type JsonNode,
  type PageSizeId,
  type WritingDocument,
} from "./writing-document.ts";
import { isWritingEntryId, WRITING_TITLE_MAX } from "./writing.ts";
import {
  parseCard,
  type PieceCard,
  type ProjectPlan,
} from "./writing-cards.ts";

/**
 * Projects in the writing room: pieces gathered into one body of work, in an
 * order the writer sets. Pure data and functions, shared by the browser and
 * the server.
 */

export const PROJECT_TEMPLATES = {
  blank: { label: "Blank", note: "Start empty.", pieces: [] },
  poetry: {
    label: "Poetry collection",
    note: "One piece per poem.",
    pieces: ["Untitled poem"],
  },
  story: {
    label: "Short story",
    note: "A draft and a place for notes.",
    pieces: ["Draft", "Notes"],
  },
  novel: {
    label: "Novel",
    note: "Chapters, characters and notes.",
    pieces: ["Chapter 1", "Chapter 2", "Chapter 3", "Characters", "Notes"],
  },
  application: {
    label: "Application",
    note: "The usual parts of a grant or residency application.",
    pieces: [
      "Artist statement",
      "Project description",
      "Bio",
      "Work sample notes",
    ],
  },
  essay: {
    label: "Essay",
    note: "A draft and its sources.",
    pieces: ["Draft", "Sources and notes"],
  },
} as const satisfies Record<
  string,
  { label: string; note: string; pieces: readonly string[] }
>;
export type ProjectTemplateId = keyof typeof PROJECT_TEMPLATES;

export const PIECE_STATUSES = {
  "": "No status",
  idea: "Idea",
  draft: "First draft",
  revised: "Revised",
  final: "Final",
} as const;
export type PieceStatus = keyof typeof PIECE_STATUSES;

export const PIECE_SYNOPSIS_MAX = 1_000;
export const PROJECTS_MAX = 200;

const PROJECT_ID =
  /^project_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isWritingProjectId(value: unknown): value is string {
  return typeof value === "string" && PROJECT_ID.test(value);
}

/** Ids are created on the device, like entry ids, so a retried create is harmless. */
export function newWritingProjectId(): string {
  return `project_${crypto.randomUUID()}`;
}

export function isProjectTemplate(value: unknown): value is ProjectTemplateId {
  return typeof value === "string" && Object.hasOwn(PROJECT_TEMPLATES, value);
}

export function isPieceStatus(value: unknown): value is PieceStatus {
  return typeof value === "string" && Object.hasOwn(PIECE_STATUSES, value);
}

export type WritingProject = {
  id: string;
  title: string;
  template: ProjectTemplateId;
  /** The planner's plotlines for this project. */
  plan: ProjectPlan;
  createdAt: string;
  updatedAt: string;
};

function field(value: unknown, name: string): unknown {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Reflect.get(value, name)
    : undefined;
}

export function parseProjectCreate(
  value: unknown,
):
  | { id: string; title: string; template: ProjectTemplateId }
  | { error: string } {
  const id = field(value, "id");
  const title = field(value, "title") ?? "";
  const template = field(value, "template") ?? "blank";
  if (!isWritingProjectId(id)) return { error: "Project id is not valid." };
  if (typeof title !== "string" || title.length > WRITING_TITLE_MAX) {
    return { error: `Titles can be up to ${WRITING_TITLE_MAX} characters.` };
  }
  if (!isProjectTemplate(template)) return { error: "Choose a template." };
  return { id, title, template };
}

export function parseProjectTitle(
  value: unknown,
): { title: string } | { error: string } {
  const title = field(value, "title");
  if (typeof title !== "string" || title.length > WRITING_TITLE_MAX) {
    return { error: `Titles can be up to ${WRITING_TITLE_MAX} characters.` };
  }
  return { title };
}

/** The order of a project's pieces: every id once, at most one project's worth. */
export function parsePieceOrder(
  value: unknown,
): { entryIds: string[] } | { error: string } {
  const ids = field(value, "entryIds");
  if (
    !Array.isArray(ids) ||
    ids.length > 500 ||
    !ids.every(isWritingEntryId) ||
    new Set(ids).size !== ids.length
  ) {
    return { error: "The order of pieces could not be read." };
  }
  return { entryIds: ids as string[] };
}

export type PieceChange = {
  /** A project id, null for a loose piece, undefined to leave it where it is. */
  projectId?: string | null;
  synopsis?: string;
  status?: PieceStatus;
  /** The call the piece is written for; null to clear it. */
  callId?: string | null;
  /** The planner's index card, replaced whole. */
  card?: PieceCard;
};

export function isCallId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

export function parsePieceChange(
  value: unknown,
): PieceChange | { error: string } {
  const change: PieceChange = {};
  const projectId = field(value, "projectId");
  const synopsis = field(value, "synopsis");
  const status = field(value, "status");
  const callId = field(value, "callId");
  const card = field(value, "card");
  if (card !== undefined) {
    const parsed = parseCard(card);
    if ("error" in parsed) return parsed;
    change.card = parsed;
  }
  if (callId !== undefined) {
    if (callId !== null && !isCallId(callId))
      return { error: "Call not found." };
    change.callId = callId;
  }
  if (projectId !== undefined) {
    if (projectId !== null && !isWritingProjectId(projectId)) {
      return { error: "Project not found." };
    }
    change.projectId = projectId;
  }
  if (synopsis !== undefined) {
    if (typeof synopsis !== "string" || synopsis.length > PIECE_SYNOPSIS_MAX) {
      return {
        error: `A synopsis can be up to ${PIECE_SYNOPSIS_MAX.toLocaleString("en")} characters.`,
      };
    }
    change.synopsis = synopsis;
  }
  if (status !== undefined) {
    if (!isPieceStatus(status)) return { error: "Choose a status." };
    change.status = status;
  }
  if (!Object.keys(change).length) return { error: "Nothing to change." };
  return change;
}

export type CompileOptions = {
  pageSize: PageSizeId;
  /** A first page with the project's title. */
  titlePage: boolean;
  /** Each piece's title as a heading at the top of its first page. */
  pieceTitles: boolean;
};

export type CompilePiece = {
  title: string;
  body: string;
  document: string | null;
};

function headingPage(page: FlowPage, title: string): FlowPage {
  const heading: JsonNode = {
    type: "heading",
    attrs: { level: 1, textAlign: null },
    content: [{ type: "text", text: title }],
  };
  return {
    ...page,
    content: {
      ...page.content,
      content: [heading, ...(page.content.content ?? [])],
    },
  };
}

/**
 * Joins a project's pieces, in order, into one printable document. Every
 * piece keeps its pages and each page keeps its own format; only the paper
 * size is set for the whole compiled manuscript.
 */
export function compileProject(
  projectTitle: string,
  pieces: CompilePiece[],
  options: CompileOptions,
  typeface: string,
): WritingDocument {
  const compiled = newDocument(typeface, options.pageSize);
  const pages: FlowPage[] = [];
  const used = new Set<string>();
  const unique = (page: FlowPage): FlowPage => {
    // A piece copied from another keeps its page ids; ids must stay unique here.
    if (!used.has(page.id)) {
      used.add(page.id);
      return page;
    }
    const id = `page_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
    used.add(id);
    return { ...page, id };
  };
  if (options.titlePage && projectTitle.trim()) {
    const cover = newDocument(typeface).pages[0]!;
    pages.push(
      unique({
        ...cover,
        format: {
          ...cover.format,
          align: "center",
          margins: { ...cover.format.margins, top: 80 },
        },
        content: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1, textAlign: "center" },
              content: [{ type: "text", text: projectTitle.trim() }],
            },
          ],
        },
      }),
    );
  }
  for (const piece of pieces) {
    const document =
      (piece.document ? parseWritingDocument(piece.document) : null) ??
      plainTextToDocument(piece.body, typeface);
    document.pages.forEach((page, index) => {
      // A page without its own face or size keeps the piece's.
      const kept: FlowPage = {
        ...page,
        format: {
          ...page.format,
          typeface: page.format.typeface ?? document.typeface,
          textSize: page.format.textSize ?? document.textSize,
        },
      };
      pages.push(
        unique(
          index === 0 &&
            kept.kind === "flow" &&
            options.pieceTitles &&
            piece.title.trim()
            ? headingPage(kept, piece.title.trim())
            : kept,
        ),
      );
    });
  }
  if (pages.length) compiled.pages = pages.slice(0, 500);
  return compiled;
}

/** The compiled manuscript as plain text, pieces separated by a scene break. */
export function compileProjectText(
  projectTitle: string,
  pieces: CompilePiece[],
  options: Pick<CompileOptions, "titlePage" | "pieceTitles">,
): string {
  const parts = pieces.map((piece) => {
    const text = piece.document
      ? (() => {
          const document = parseWritingDocument(piece.document);
          return document ? documentText(document) : piece.body;
        })()
      : piece.body;
    return options.pieceTitles && piece.title.trim()
      ? `${piece.title.trim()}\n\n${text}`
      : text;
  });
  const head =
    options.titlePage && projectTitle.trim()
      ? `${projectTitle.trim()}\n\n\n`
      : "";
  return `${head}${parts.join("\n\n* * *\n\n")}\n`;
}
