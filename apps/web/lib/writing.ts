/**
 * Shared rules for the writing room (/write). Pure functions only, so the
 * browser and the server apply exactly the same limits and counts.
 */

/** The longest entry Missa stores, in characters (roughly 70,000 words). */
export const WRITING_BODY_MAX = 400_000;

/** Entries the writing room lists at once, newest first. */
export const WRITING_LIST_LIMIT = 500;

const ENTRY_ID =
  /^writing_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isWritingEntryId(value: unknown): value is string {
  return typeof value === "string" && ENTRY_ID.test(value);
}

/** Ids are created on the device so an entry written offline keeps its identity. */
export function newWritingEntryId(): string {
  return `writing_${crypto.randomUUID()}`;
}

const WORD = /[\p{L}\p{N}]+(?:['’.\-‐][\p{L}\p{N}]+)*/gu;
const HYPHENS = new Set(["-", "‐"]);
let segmenter: Intl.Segmenter | null | undefined;

/**
 * Counts words the way a reader would. Uses the platform word segmenter when
 * it exists, so languages written without spaces are counted by word rather
 * than by run of characters.
 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  if (segmenter === undefined) {
    segmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? new Intl.Segmenter(undefined, { granularity: "word" })
        : null;
  }
  if (segmenter) {
    // A hyphenated word ("well-known") counts once, as word processors count it.
    let words = 0;
    let afterWord = false;
    let joined = false;
    for (const segment of segmenter.segment(text)) {
      if (segment.isWordLike) {
        if (!joined) words += 1;
        afterWord = true;
        joined = false;
      } else {
        joined = afterWord && HYPHENS.has(segment.segment);
        afterWord = false;
      }
    }
    return words;
  }
  return text.match(WORD)?.length ?? 0;
}

/** The first words of an entry, on one line, for the list of entries. */
export function writingPreview(text: string, length = 80): string {
  const line = text
    .slice(0, length * 4)
    .replace(/\s+/g, " ")
    .trim();
  return line.length > length
    ? `${line.slice(0, length - 1).trimEnd()}…`
    : line;
}

export type WritingSaveRequest = {
  body: string;
  /** The stored revision this text was written on; 0 for an entry not yet saved. */
  baseRevision: number;
};

export function parseWritingSaveRequest(
  value: unknown,
): WritingSaveRequest | { error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Request body must be an object." };
  }
  const body: unknown = Reflect.get(value, "body");
  const baseRevision: unknown = Reflect.get(value, "baseRevision");
  if (typeof body !== "string") return { error: "Body must be text." };
  if (body.length > WRITING_BODY_MAX) {
    return {
      error: `This entry is longer than ${WRITING_BODY_MAX.toLocaleString("en")} characters. Start a new entry to keep writing.`,
    };
  }
  if (
    typeof baseRevision !== "number" ||
    !Number.isSafeInteger(baseRevision) ||
    baseRevision < 0
  ) {
    return { error: "Refresh this entry before saving again." };
  }
  return { body, baseRevision };
}

export type WritingEntrySummary = {
  id: string;
  preview: string;
  wordCount: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type WritingEntry = WritingEntrySummary & { body: string };
