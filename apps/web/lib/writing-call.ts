import {
  preSubmitChecks,
  type PreSubmitCheck,
  type PreSubmitInput,
} from "./pre-submit-check.ts";
import { countWords } from "./writing.ts";

/**
 * Writing for a call: the call's limits and requirements checked against the
 * open piece, in the browser. The piece's text is never sent anywhere for
 * this; only the call's details come from the account.
 */

export type WritingCallPiece = {
  id: string;
  title: string;
  /** The piece's plain text, every page in order. */
  text: string;
  /** Printed pages, as the writer laid them out. */
  pages: number;
};

const note = (confidence: string) =>
  confidence === "confirmed"
    ? ""
    : " This limit comes from the listing; confirm it in the guidelines.";

/**
 * Checks for one piece. Word and page limits are measured on the piece itself,
 * with the writing room's own word count and its real pages. The required
 * materials and the anonymous-reading name check are Missa's pre-submit check,
 * run on this piece.
 */
export function writingCallChecks(
  input: PreSubmitInput,
  piece: WritingCallPiece,
): PreSubmitCheck[] {
  const checks: PreSubmitCheck[] = [];
  const words = countWords(piece.text);

  if (input.wordLimit) {
    const { max, confidence } = input.wordLimit;
    checks.push({
      id: "word-limit",
      label: `Word limit · ${max.toLocaleString("en")}`,
      status: words > max ? "attention" : "passed",
      detail:
        words > max
          ? `This piece has ${words.toLocaleString("en")} words, ${(words - max).toLocaleString("en")} over.${note(confidence)}`
          : `This piece has ${words.toLocaleString("en")} words.${note(confidence)}`,
    });
  }

  if (input.pageLimit) {
    const { max, confidence } = input.pageLimit;
    checks.push({
      id: "page-limit",
      label: `Page limit · ${max.toLocaleString("en")}`,
      status: piece.pages > max ? "attention" : "passed",
      detail: `This piece is ${piece.pages} printed ${piece.pages === 1 ? "page" : "pages"} at its paper size${piece.pages > max ? `, ${piece.pages - max} over` : ""}. The call may count pages differently; check its format rules.${note(confidence)}`,
    });
  }

  const shared = preSubmitChecks({
    ...input,
    wordLimit: undefined,
    pageLimit: undefined,
    materials: [
      {
        kind: "answer",
        id: piece.id,
        title: piece.title || "This piece",
        text: piece.text,
      },
    ],
  });
  for (const check of shared)
    if (check.id === "materials" || check.id === "anonymity")
      checks.push(check);
  return checks;
}

/** Words against the call's limit, for the footer: null when the call states none. */
export function wordMeter(
  input: Pick<PreSubmitInput, "wordLimit"> | null,
  words: number,
): { label: string; over: boolean } | null {
  if (!input?.wordLimit) return null;
  const { max } = input.wordLimit;
  return {
    label: `${words.toLocaleString()} / ${max.toLocaleString()} words`,
    over: words > max,
  };
}
