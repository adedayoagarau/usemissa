/**
 * The writing room's document: printed pages, each with its own format.
 * Pure data and functions, shared by the browser and the server.
 *
 * A page's content is ProseMirror JSON (the editor's own format). Every
 * space, tab and line break is kept as typed. A "flow" page holds text that
 * runs from the top margin down; a "canvas" page holds text boxes, each placed
 * where the writer puts it, for concrete and visual poetry.
 */

export type JsonNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: JsonNode[];
};

/** Paper sizes in millimetres. */
export const PAGE_SIZES = {
  a4: { label: "A4", width: 210, height: 297 },
  letter: { label: "US Letter", width: 215.9, height: 279.4 },
  a5: { label: "A5", width: 148, height: 210 },
  chapbook: { label: "Chapbook, 5.5 × 8.5 in", width: 139.7, height: 215.9 },
} as const;
export type PageSizeId = keyof typeof PAGE_SIZES;

export type PageAlign = "left" | "center" | "right" | "justify";
export type PageMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type PageFormat = {
  /** Alignment for lines that do not set their own. */
  align: PageAlign;
  /** Multiple of the text size. */
  lineHeight: number;
  /** In em. */
  letterSpacing: number;
  /** In millimetres. */
  margins: PageMargins;
  /** Overrides the document typeface for this page. */
  typeface?: string;
  /** Overrides the document text size for this page, in points. */
  textSize?: number;
};

/** A box of text on a canvas page, placed in millimetres from the page's top left corner. */
export type CanvasBlock = {
  id: string;
  x: number;
  y: number;
  /** In millimetres; the text wraps inside it. */
  width: number;
  /** In degrees, clockwise. */
  rotation: number;
  content: JsonNode;
};

/**
 * One page. A flow page keeps its text in `content`; a canvas page keeps it
 * in `blocks` and leaves `content` empty.
 */
export type FlowPage = {
  id: string;
  kind: "flow" | "canvas";
  format: PageFormat;
  content: JsonNode;
  blocks?: CanvasBlock[];
  /**
   * The page holds text that flowed on from the page before it. Text moves
   * back and forth between such pages as it is written; a page the writer
   * adds is never merged into another.
   */
  continues?: boolean;
};

export type WritingDocument = {
  version: 1;
  pageSize: PageSizeId;
  typeface: string;
  /** In points, as printed. */
  textSize: number;
  pages: FlowPage[];
};

export const LINE_HEIGHTS = [1, 1.15, 1.5, 2, 2.5, 3] as const;
export const LETTER_SPACINGS = [-0.02, 0, 0.05, 0.1, 0.2, 0.35, 0.5] as const;
export const TEXT_SIZES = [9, 10, 11, 12, 13, 14, 16, 18, 20, 24] as const;
export const MARGIN_PRESETS = {
  narrow: { label: "Narrow", value: 12.7 },
  normal: { label: "Normal", value: 25.4 },
  wide: { label: "Wide", value: 38.1 },
} as const;

export const WRITING_DOCUMENT_MAX = 2_000_000;
export const CANVAS_BLOCKS_MAX = 200;
const BLOCK_ID = /^block_[0-9a-z]{6,40}$/;

export function newBlockId(): string {
  return `block_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

const EMPTY_DOC: JsonNode = { type: "doc", content: [{ type: "paragraph" }] };

/** The order a reader meets a canvas page's boxes: top to bottom, then left to right. */
export function readingOrder(blocks: CanvasBlock[]): CanvasBlock[] {
  return [...blocks].sort((a, b) =>
    Math.abs(a.y - b.y) < 2 ? a.x - b.x : a.y - b.y,
  );
}

/** Turns a page into a canvas: its text becomes one box inside its margins. */
export function toCanvasPage(page: FlowPage, pageSize: PageSizeId): FlowPage {
  if (page.kind === "canvas") return page;
  const size = PAGE_SIZES[pageSize];
  const { margins } = page.format;
  return {
    id: page.id,
    kind: "canvas",
    format: page.format,
    content: EMPTY_DOC,
    blocks: [
      {
        id: newBlockId(),
        x: margins.left,
        y: margins.top,
        width: Math.max(20, size.width - margins.left - margins.right),
        rotation: 0,
        content: page.content,
      },
    ],
  };
}

/** Turns a canvas page back into flowing text, its boxes in reading order. */
export function toFlowPage(page: FlowPage): FlowPage {
  if (page.kind === "flow") return page;
  const content = readingOrder(page.blocks ?? []).flatMap(
    (block) => block.content.content ?? [],
  );
  return {
    id: page.id,
    kind: "flow",
    format: page.format,
    content: {
      type: "doc",
      content: content.length ? content : [{ type: "paragraph" }],
    },
  };
}

/** A new text box on a canvas page. */
export function newCanvasBlock(
  x: number,
  y: number,
  width: number,
): CanvasBlock {
  return { id: newBlockId(), x, y, width, rotation: 0, content: EMPTY_DOC };
}
export const WRITING_PAGES_MAX = 500;
const PAGE_ID = /^page_[0-9a-z]{6,40}$/;

export function newPageId(): string {
  return `page_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export function defaultPageFormat(): PageFormat {
  const margin = MARGIN_PRESETS.normal.value;
  return {
    align: "left",
    lineHeight: 1.5,
    letterSpacing: 0,
    margins: { top: margin, right: margin, bottom: margin, left: margin },
  };
}

export function emptyPage(format: PageFormat = defaultPageFormat()): FlowPage {
  return {
    id: newPageId(),
    kind: "flow",
    format: { ...format, margins: { ...format.margins } },
    content: { type: "doc", content: [{ type: "paragraph" }] },
  };
}

export function newDocument(
  typeface: string,
  pageSize: PageSizeId = "a4",
): WritingDocument {
  return { version: 1, pageSize, typeface, textSize: 12, pages: [emptyPage()] };
}

/** Plain text kept exactly: each line becomes a paragraph, spaces and tabs untouched. */
export function plainTextToDocument(
  text: string,
  typeface: string,
): WritingDocument {
  const document = newDocument(typeface);
  document.pages[0]!.content = {
    type: "doc",
    content: text
      .split("\n")
      .map((line) =>
        line
          ? { type: "paragraph", content: [{ type: "text", text: line }] }
          : { type: "paragraph" },
      ),
  };
  return document;
}

const BLOCKS = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "bulletList",
  "orderedList",
  "horizontalRule",
]);

function nodeText(node: JsonNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const children = node.content ?? [];
  if (children.some((child) => BLOCKS.has(child.type))) {
    return children.map(nodeText).join("\n");
  }
  return children.map(nodeText).join("");
}

/**
 * The words of every page, in order, for counting, previews and plain-text
 * export. A page break the text flowed across adds nothing; a page the writer
 * added starts after a blank line.
 */
export function documentText(document: WritingDocument): string {
  return document.pages
    .map(
      (page, index) =>
        (index === 0 ? "" : page.continues ? "\n" : "\n\n") +
        (page.kind === "canvas"
          ? readingOrder(page.blocks ?? [])
              .map((block) => nodeText(block.content))
              .join("\n")
          : nodeText(page.content)),
    )
    .join("");
}

/** The pages a page's text flows across: the page that starts it and every page that continues it. */
export function flowChain(pages: FlowPage[], index: number): number[] {
  let start = index;
  while (start > 0 && pages[start]?.continues) start -= 1;
  const chain = [start];
  while (pages[chain.at(-1)! + 1]?.continues) chain.push(chain.at(-1)! + 1);
  return chain;
}

function finite(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function validNode(value: unknown, depth = 0): value is JsonNode {
  if (depth > 40 || !value || typeof value !== "object" || Array.isArray(value))
    return false;
  const node = value as JsonNode;
  if (typeof node.type !== "string" || node.type.length > 40) return false;
  if (node.text !== undefined && typeof node.text !== "string") return false;
  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) return false;
    return node.content.every((child) => validNode(child, depth + 1));
  }
  return true;
}

function validFormat(value: unknown): value is PageFormat {
  if (!value || typeof value !== "object") return false;
  const format = value as PageFormat;
  const margins = format.margins;
  return (
    ["left", "center", "right", "justify"].includes(format.align) &&
    finite(format.lineHeight, 0.8, 4) &&
    finite(format.letterSpacing, -0.1, 1) &&
    !!margins &&
    [margins.top, margins.right, margins.bottom, margins.left].every((margin) =>
      finite(margin, 0, 80),
    ) &&
    (format.typeface === undefined ||
      (typeof format.typeface === "string" && format.typeface.length <= 60)) &&
    (format.textSize === undefined || finite(format.textSize, 6, 72))
  );
}

/** Checks a document from storage or the network. Returns null when it is not a writing document. */
export function parseWritingDocument(value: unknown): WritingDocument | null {
  let parsed = value;
  if (typeof value === "string") {
    if (value.length > WRITING_DOCUMENT_MAX) return null;
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const document = parsed as WritingDocument;
  if (document.version !== 1) return null;
  if (!(document.pageSize in PAGE_SIZES)) return null;
  if (typeof document.typeface !== "string" || document.typeface.length > 60)
    return null;
  if (!finite(document.textSize, 6, 72)) return null;
  if (
    !Array.isArray(document.pages) ||
    document.pages.length < 1 ||
    document.pages.length > WRITING_PAGES_MAX
  ) {
    return null;
  }
  const ids = new Set<string>();
  for (const page of document.pages) {
    if (
      !page ||
      typeof page !== "object" ||
      (page.kind !== "flow" && page.kind !== "canvas")
    )
      return null;
    if (page.continues !== undefined && typeof page.continues !== "boolean")
      return null;
    if (
      typeof page.id !== "string" ||
      !PAGE_ID.test(page.id) ||
      ids.has(page.id)
    )
      return null;
    ids.add(page.id);
    if (!validFormat(page.format)) return null;
    if (!validNode(page.content) || page.content.type !== "doc") return null;
    if (page.kind === "canvas") {
      if (page.continues) return null;
      if (!Array.isArray(page.blocks) || page.blocks.length > CANVAS_BLOCKS_MAX)
        return null;
      const blockIds = new Set<string>();
      for (const block of page.blocks) {
        if (
          !block ||
          typeof block !== "object" ||
          typeof block.id !== "string" ||
          !BLOCK_ID.test(block.id) ||
          blockIds.has(block.id) ||
          !finite(block.x, -100, 500) ||
          !finite(block.y, -100, 500) ||
          !finite(block.width, 5, 500) ||
          !finite(block.rotation, -360, 360) ||
          !validNode(block.content) ||
          block.content.type !== "doc"
        )
          return null;
        blockIds.add(block.id);
      }
    } else if (page.blocks !== undefined) return null;
  }
  return document;
}

/** Serialises a document the same way every time, so equal documents are equal strings. */
export function serializeDocument(document: WritingDocument): string {
  return JSON.stringify(document);
}
