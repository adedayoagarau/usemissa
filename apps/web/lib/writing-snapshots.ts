import { parseWritingDocument } from "./writing-document.ts";
import { WRITING_BODY_MAX, WRITING_TITLE_MAX } from "./writing.ts";

/**
 * Snapshots in the writing room: a piece as it stood at a moment the writer
 * chose. Pure data and functions, shared by the browser and the server.
 */

export const SNAPSHOTS_PER_PIECE = 100;
export const SNAPSHOT_NAME_MAX = 120;

const SNAPSHOT_ID =
  /^snapshot_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isWritingSnapshotId(value: unknown): value is string {
  return typeof value === "string" && SNAPSHOT_ID.test(value);
}

export function newWritingSnapshotId(): string {
  return `snapshot_${crypto.randomUUID()}`;
}

export type WritingSnapshotSummary = {
  id: string;
  name: string;
  title: string;
  wordCount: number;
  createdAt: string;
};

export type WritingSnapshot = WritingSnapshotSummary & {
  body: string;
  document: string | null;
};

export type SnapshotRequest = {
  id: string;
  name: string;
  title: string;
  body: string;
  document: string | null;
};

function field(value: unknown, name: string): unknown {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Reflect.get(value, name)
    : undefined;
}

export function parseSnapshotRequest(
  value: unknown,
): SnapshotRequest | { error: string } {
  const id = field(value, "id");
  const name = field(value, "name") ?? "";
  const title = field(value, "title") ?? "";
  const body = field(value, "body");
  const document = field(value, "document") ?? null;
  if (!isWritingSnapshotId(id)) return { error: "Snapshot id is not valid." };
  if (typeof name !== "string" || name.length > SNAPSHOT_NAME_MAX) {
    return {
      error: `A snapshot name can be up to ${SNAPSHOT_NAME_MAX} characters.`,
    };
  }
  if (typeof title !== "string" || title.length > WRITING_TITLE_MAX) {
    return { error: `Titles can be up to ${WRITING_TITLE_MAX} characters.` };
  }
  if (typeof body !== "string" || body.length > WRITING_BODY_MAX) {
    return { error: "This piece is too long to keep as a snapshot." };
  }
  if (
    document !== null &&
    (typeof document !== "string" || !parseWritingDocument(document))
  ) {
    return { error: "This piece's pages could not be read." };
  }
  return {
    id,
    name: name.trim(),
    title,
    body,
    document: document as string | null,
  };
}

export type DiffLine = {
  kind: "same" | "removed" | "added";
  text: string;
};

/** Lines compared above this many line pairs are shown whole, without marking changes. */
const DIFF_CELLS_MAX = 4_000_000;

/**
 * Compares two texts line by line, the way a poem or a draft is read: lines
 * only in the snapshot are "removed", lines only in the current text are
 * "added". Returns null when the texts are too long to compare here.
 */
export function diffLines(before: string, after: string): DiffLine[] | null {
  const a = before.split("\n");
  const b = after.split("\n");
  // Lines the two texts share at either end need no comparing.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start])
    start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  if (midA.length * midB.length > DIFF_CELLS_MAX) return null;

  // Longest common subsequence, filled from the end.
  const width = midB.length + 1;
  const table = new Uint32Array((midA.length + 1) * width);
  for (let i = midA.length - 1; i >= 0; i -= 1) {
    for (let j = midB.length - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        midA[i] === midB[j]
          ? table[(i + 1) * width + j + 1]! + 1
          : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!);
    }
  }
  const lines: DiffLine[] = a
    .slice(0, start)
    .map((text) => ({ kind: "same" as const, text }));
  let i = 0;
  let j = 0;
  while (i < midA.length && j < midB.length) {
    if (midA[i] === midB[j]) {
      lines.push({ kind: "same", text: midA[i]! });
      i += 1;
      j += 1;
    } else if (table[(i + 1) * width + j]! >= table[i * width + j + 1]!) {
      lines.push({ kind: "removed", text: midA[i]! });
      i += 1;
    } else {
      lines.push({ kind: "added", text: midB[j]! });
      j += 1;
    }
  }
  for (; i < midA.length; i += 1)
    lines.push({ kind: "removed", text: midA[i]! });
  for (; j < midB.length; j += 1) lines.push({ kind: "added", text: midB[j]! });
  for (const text of a.slice(endA)) lines.push({ kind: "same", text });
  return lines;
}
