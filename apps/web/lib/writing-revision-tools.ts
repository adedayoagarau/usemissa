export type PassageAnchor = { source: string; from: number; to: number; original: string; signature: string };
export type HumanSuggestion = { id: string; anchor: PassageAnchor; replacement: string };
export type PrivateRevisionComment = { id: string; anchor: PassageAnchor; text: string; kind?: "Verify this" | "Revisit" | "Keep this passage"; resolved: boolean };
export type Cutting = { id: string; text: string; createdAt: string; richSlice?: Record<string, unknown> };
export type RevisionToolsState = { version: 1; suggestions: HumanSuggestion[]; comments: PrivateRevisionComment[]; cuttings: Cutting[] };
export const emptyRevisionTools = (): RevisionToolsState => ({ version: 1, suggestions: [], comments: [], cuttings: [] });
export function revisionToolsKey(accountId: string, documentId: string) {
  return `missa:revision-tools:${encodeURIComponent(accountId)}:${encodeURIComponent(documentId)}`;
}
export function anchorIsCurrent(anchor: PassageAnchor, signature: string, text: string) {
  return anchor.signature === signature && anchor.original === text;
}
export function parseRevisionTools(raw: string): RevisionToolsState {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error("Invalid revision backup");
  const state = value as RevisionToolsState;
  const anchorValid = (a: PassageAnchor) => a && typeof a.source === "string" && Number.isInteger(a.from) && a.from >= 0 && Number.isInteger(a.to) && a.to >= a.from && typeof a.original === "string" && typeof a.signature === "string";
  if (state.version !== 1 || !Array.isArray(state.suggestions) || !Array.isArray(state.comments) || !Array.isArray(state.cuttings) ||
    !state.suggestions.every(s => typeof s.id === "string" && anchorValid(s.anchor) && typeof s.replacement === "string") ||
    !state.comments.every(c => typeof c.id === "string" && anchorValid(c.anchor) && typeof c.text === "string" && typeof c.resolved === "boolean" && (c.kind === undefined || ["Verify this", "Revisit", "Keep this passage"].includes(c.kind))) ||
    !state.cuttings.every(c => typeof c.id === "string" && typeof c.text === "string" && typeof c.createdAt === "string" && (c.richSlice === undefined || (c.richSlice !== null && typeof c.richSlice === "object" && !Array.isArray(c.richSlice))))) throw new Error("Invalid revision backup");
  return state;
}

import type { EditorState } from "@tiptap/pm/state";
import type { Mark } from "@tiptap/pm/model";
/** Preserve the selected text's first inline style even when selection includes paragraph boundaries. */
export function humanReplacementTransaction(state: EditorState, from: number, to: number, replacement: string) {
 let marks: readonly Mark[] = state.storedMarks ?? state.doc.resolve(from).marks();
 let found = false;
 state.doc.nodesBetween(from, to, node => {
  if (node.isText && !found) { marks = node.marks; found = true; }
 });
 return replacement ? state.tr.replaceWith(from, to, state.schema.text(replacement, marks)) : state.tr.delete(from, to);
}

/** Simple passage comparison keeps the unchanged prefix/suffix readable. */
export function comparePassage(before: string, after: string) {
 let start = 0;
 while (start < before.length && start < after.length && before[start] === after[start]) start++;
 let end = 0;
 while (end < before.length - start && end < after.length - start && before[before.length - end - 1] === after[after.length - end - 1]) end++;
 return { prefix: before.slice(0, start), removed: before.slice(start, before.length - end), added: after.slice(start, after.length - end), suffix: end ? before.slice(-end) : "" };
}
