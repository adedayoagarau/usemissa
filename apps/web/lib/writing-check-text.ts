import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export type CheckText = { text: string; positions: number[] };
type TextBlock = { text: string; positions: number[]; separators: number[] };
type ExtractedCheckText = CheckText & { separators: number[] };

/**
 * Flattens a ProseMirror document for spelling and grammar checks. Offsets in
 * `positions` are UTF-16 boundaries, matching JavaScript strings and the
 * positions accepted by ProseMirror transactions.
 */
function extractWithSeparators(doc: ProseMirrorNode): ExtractedCheckText {
  const blocks: TextBlock[] = [];

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;

    let text = "";
    const positions = [pos + 1];
    const separators: number[] = [];
    node.forEach((child, offset) => {
      const start = pos + 1 + offset;
      if (
        child.isText &&
        !child.marks.some((mark) => mark.type.name === "writingDeletion")
      ) {
        const value = child.text ?? "";
        text += value;
        for (let index = 1; index <= value.length; index += 1)
          positions.push(start + index);
      } else {
        // A deletion, hard break or inline atom separates checkable ranges.
        // Preserved tracked text is never offered to the checker; replacements
        // cannot cross it and accidentally destroy revision history.
        // but checker ranges may not consume that synthetic character.
        separators.push(text.length);
        text += "\n";
        positions.push(start + child.nodeSize);
      }
    });
    blocks.push({ text, positions, separators });
    return false;
  });

  if (blocks.length === 0) return { text: "", positions: [0], separators: [] };

  let text = blocks[0]!.text;
  const positions = [...blocks[0]!.positions];
  const separators = [...blocks[0]!.separators];

  for (let index = 1; index < blocks.length; index += 1) {
    const block = blocks[index]!;
    separators.push(text.length);
    text += "\n";
    positions.push(block.positions[0]!);
    const offset = text.length;
    text += block.text;
    positions.push(...block.positions.slice(1));
    separators.push(...block.separators.map((at) => offset + at));
  }

  return { text, positions, separators };
}

export function extractCheckText(doc: ProseMirrorNode): CheckText {
  const { text, positions } = extractWithSeparators(doc);
  return { text, positions };
}

/**
 * Resolves a checker range against the current document. A stale snapshot,
 * invalid UTF-16 boundary, or range consuming a generated line boundary is
 * rejected so a caller can safely apply the result as one editor transaction.
 */
export function checkRange(
  doc: ProseMirrorNode,
  snapshotText: string,
  start: number,
  end: number,
): { from: number; to: number } | null {
  const extracted = extractWithSeparators(doc);
  if (snapshotText !== extracted.text) return null;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    end > extracted.text.length
  )
    return null;

  const splitsSurrogate = (offset: number) =>
    offset > 0 &&
    offset < extracted.text.length &&
    /[\uD800-\uDBFF]/.test(extracted.text[offset - 1]!) &&
    /[\uDC00-\uDFFF]/.test(extracted.text[offset]!);
  if (splitsSurrogate(start) || splitsSurrogate(end)) return null;

  if (extracted.separators.some((at) => start < at + 1 && end > at))
    return null;

  const from = extracted.positions[start];
  const to = extracted.positions[end];
  if (from === undefined || to === undefined || from > to) return null;
  return { from, to };
}
