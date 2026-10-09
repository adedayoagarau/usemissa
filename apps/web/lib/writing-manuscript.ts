import {
  readingOrder,
  type JsonNode,
  type WritingDocument,
} from "./writing-document.ts";

export type ManuscriptPiece = {
  id: string;
  title: string;
  doc: WritingDocument;
};
export type ManuscriptHeading = {
  pieceId: string;
  editorKey: string;
  label: string;
  level: number;
  position: number;
};

/** Search projection only: never persist these namespaced page ids. */
export function manuscriptSearchDocument(
  pieces: ManuscriptPiece[],
): WritingDocument | null {
  const first = pieces[0];
  if (!first) return null;
  return {
    ...first.doc,
    pages: pieces.flatMap((piece) =>
      piece.doc.pages.map((page) => ({
        ...page,
        id: `${piece.id}/${page.id}`,
      })),
    ),
  };
}

function nodeSize(node: JsonNode): number {
  if (node.type === "text") return node.text?.length ?? 0;
  if (
    node.type === "hardBreak" ||
    node.type === "horizontalRule" ||
    node.type === "image"
  )
    return 1;
  return (
    2 + (node.content ?? []).reduce((size, child) => size + nodeSize(child), 0)
  );
}

function text(node: JsonNode): string {
  return node.text ?? (node.content ?? []).map(text).join("");
}

/** Heading positions use ProseMirror offsets, including marks, breaks and lists. */
export function manuscriptHeadings(
  pieces: ManuscriptPiece[],
): ManuscriptHeading[] {
  const headings: ManuscriptHeading[] = [];
  for (const piece of pieces) {
    for (const page of piece.doc.pages) {
      const contents =
        page.kind === "canvas"
          ? readingOrder(page.blocks ?? []).map((block) => ({
              key: `${page.id}/${block.id}`,
              node: block.content,
            }))
          : [{ key: page.id, node: page.content }];
      for (const { key, node } of contents) {
        const walk = (parent: JsonNode, start: number) => {
          let position = start;
          for (const child of parent.content ?? []) {
            if (child.type === "heading" && text(child).trim())
              headings.push({
                pieceId: piece.id,
                editorKey: key,
                label: text(child),
                level: Number(child.attrs?.level) || 1,
                position: position + 1,
              });
            if (child.content) walk(child, position + 1);
            position += nodeSize(child);
          }
        };
        walk(node, 0);
      }
    }
  }
  return headings;
}

/** Update manuscript drafts without dropping supporting research from the project. */
export function mergeManuscriptPieces(all: ManuscriptPiece[], edited: ManuscriptPiece[]): ManuscriptPiece[] {
  const updates = new Map(edited.map((piece) => [piece.id, piece]));
  const known = new Set(all.map((piece) => piece.id));
  return [...all.map((piece) => updates.get(piece.id) ?? piece), ...edited.filter((piece) => !known.has(piece.id))];
}
