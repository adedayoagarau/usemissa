import { Extension, Mark, mergeAttributes, type Editor } from "@tiptap/core";
import { Fragment, Slice, type Node as ProseNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { isHistoryTransaction, closeHistory } from "@tiptap/pm/history";

export const INSERTION = "writingInsertion";
export const DELETION = "writingDeletion";
const HANDLED = "writingTrackedChangesHandled";
export type TrackedView = "changes" | "original" | "proposed";
export type TrackedSpan = { from: number; to: number; kind: "insertion" | "deletion"; text: string };
export type TrackedChange = { id: string; spans: TrackedSpan[]; inserted: string; deleted: string };
export type TrackingState = { enabled: boolean; view: TrackedView; warning: string };
export const writingTrackingKey = new PluginKey<TrackingState>("writingTrackedChanges");

function trackingMark(name: string, tag: "ins" | "del") {
 return Mark.create({
  name, inclusive: false, excludes: "",
  addAttributes: () => ({ id: { default: null, parseHTML: element => element.getAttribute("data-writing-change-id"), renderHTML: attrs => ({ "data-writing-change-id": attrs.id }) } }),
  parseHTML: () => [{ tag: `${tag}[data-writing-change-id]` }],
  renderHTML: ({ HTMLAttributes }) => [tag, mergeAttributes(HTMLAttributes, { "data-writing-tracked": name, class: "no-underline" }), 0],
 });
}
export const WritingInsertion = trackingMark(INSERTION, "ins");
export const WritingDeletion = trackingMark(DELETION, "del");

export function trackedChanges(doc: ProseNode): TrackedChange[] {
 const changes = new Map<string, TrackedChange>();
 doc.descendants((node, pos) => {
  if (!node.isText) return;
  for (const mark of node.marks) {
   if (mark.type.name !== INSERTION && mark.type.name !== DELETION) continue;
   const id = String(mark.attrs.id ?? ""); if (!id) continue;
   const kind = mark.type.name === INSERTION ? "insertion" : "deletion";
   const change = changes.get(id) ?? { id, spans: [], inserted: "", deleted: "" };
   change.spans.push({ from: pos, to: pos + node.nodeSize, kind, text: node.text ?? "" });
   if (kind === "insertion") change.inserted += node.text; else change.deleted += node.text;
   changes.set(id, change);
  }
 });
 return [...changes.values()];
}

/** Clean text ignores only the requested review layer, leaving the persisted rich document intact. */
export function trackedReadingText(doc: ProseNode, view: "original" | "proposed") {
 const omit = view === "original" ? INSERTION : DELETION;
 const paragraphs: string[] = [];
 doc.descendants(node => {
  if (!node.isTextblock) return;
  let text = "";
  node.descendants(child => { if (child.isText && !child.marks.some(mark => mark.type.name === omit)) text += child.text; else if (child.type.name === "hardBreak") text += "\n"; });
  paragraphs.push(text); return false;
 });
 return paragraphs.join("\n");
}

function originalFragment(fragment: Fragment): Fragment {
 const nodes: ProseNode[] = [];
 fragment.forEach(node => {
  if (node.isText && node.marks.some(mark => mark.type.name === INSERTION)) return;
  nodes.push(node.isLeaf ? node : node.copy(originalFragment(node.content)));
 });
 return Fragment.fromArray(nodes);
}

/** Retained rich deletions and marked insertions are appended into the same history event as typing. */
export function trackTransactions(transactions: readonly Transaction[], oldState: EditorState, newState: EditorState): Transaction | null {
 const tracking = writingTrackingKey.getState(newState);
 if (!tracking?.enabled || !transactions.some(tr => tr.docChanged) || transactions.some(tr => tr.getMeta(HANDLED) || tr.getMeta("addToHistory") === false || isHistoryTransaction(tr))) return null;
 // Formatting changes and editor-driven pagination carry no typed text delta.
 const start = oldState.doc.content.findDiffStart(newState.doc.content);
 if (start === null) return null;
 const end = oldState.doc.content.findDiffEnd(newState.doc.content);
 if (!end) return null;
 let oldEnd = end.a, newEnd = end.b;
 const overlap = start - Math.min(oldEnd, newEnd);
 if (overlap > 0) { oldEnd += overlap; newEnd += overlap; }
 const oldSlice = oldState.doc.slice(start, oldEnd);
 const newSlice = newState.doc.slice(start, newEnd);
 if (oldSlice.content.textBetween(0, oldSlice.content.size, "\n") === newSlice.content.textBetween(0, newSlice.content.size, "\n")) return null;
 // Moving/removing whole blocks requires node-level revision semantics; keep the user's edit intact.
 const oldFrom = oldState.doc.resolve(start), oldTo = oldState.doc.resolve(oldEnd);
 if (oldEnd > start && (!oldFrom.sameParent(oldTo) || !oldFrom.parent.isTextblock)) {
  return newState.tr.setMeta(writingTrackingKey, { warning: "This block change was saved directly. Text changes within a paragraph are tracked." }).setMeta(HANDLED, true).setMeta("addToHistory", false);
 }
 const insertion = newState.schema.marks[INSERTION], deletion = newState.schema.marks[DELETION];
 if (!insertion || !deletion) return null;
 const nearby = oldFrom.marks().find(mark => mark.type.name === INSERTION) ?? oldFrom.nodeBefore?.marks.find(mark => mark.type.name === INSERTION) ?? oldTo.nodeAfter?.marks.find(mark => mark.type.name === DELETION);
 const id = String(nearby?.attrs.id ?? crypto.randomUUID());
 const retained = originalFragment(oldSlice.content);
 const tr = newState.tr;
 if (newEnd > start) tr.addMark(start, newEnd, insertion.create({ id }));
 if (retained.size) {
  // Preserve inline styles and existing deletion IDs; newly removed original text receives this change ID.
  const marked: ProseNode[] = [];
  retained.forEach(node => marked.push(node.isText && !node.marks.some(mark => mark.type.name === DELETION) ? node.mark([...node.marks, deletion.create({ id })]) : node));
  tr.replaceRange(start, start, new Slice(Fragment.fromArray(marked), oldSlice.openStart, oldSlice.openEnd));
  if (newEnd === start && newState.selection.empty) tr.setSelection(TextSelection.create(tr.doc, start));
 }
 return tr.docChanged ? tr.setMeta(HANDLED, true) : null;
}

export function createWritingTrackingPlugin() {
 return new Plugin<TrackingState>({
  key: writingTrackingKey,
  state: { init: () => ({ enabled: false, view: "changes", warning: "" }), apply: (tr, value) => ({ ...value, ...(tr.getMeta(writingTrackingKey) ?? {}) }) },
  appendTransaction: trackTransactions,
  props: { decorations(state) {
   const tracking = writingTrackingKey.getState(state)!;
   const decorations: Decoration[] = [];
   state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
     if (mark.type.name !== INSERTION && mark.type.name !== DELETION) continue;
     const hidden = tracking.view === "original" && mark.type.name === INSERTION || tracking.view === "proposed" && mark.type.name === DELETION;
     decorations.push(Decoration.inline(pos, pos + node.nodeSize, { class: hidden ? "hidden" : tracking.view === "changes" ? mark.type.name === INSERTION ? "text-primary underline" : "text-destructive line-through" : "no-underline", "data-writing-review-layer": hidden ? "hidden" : "visible" }));
    }
   });
   return DecorationSet.create(state.doc, decorations);
  } },
 });
}
export function trackedDeleteTransaction(state: EditorState, direction: -1 | 1): Transaction | null {
 if (!writingTrackingKey.getState(state)?.enabled || !state.selection.empty) return null;
 let position = state.selection.from;
 let skipped = false;
 while (true) {
  const resolved = state.doc.resolve(position);
  const node = direction === 1 ? resolved.nodeAfter : resolved.nodeBefore;
  if (!node?.isText || !node.marks.some(mark => mark.type.name === DELETION)) break;
  position += direction * node.nodeSize; skipped = true;
 }
 if (!skipped) return null;
 const resolved = state.doc.resolve(position);
 const node = direction === 1 ? resolved.nodeAfter : resolved.nodeBefore;
 if (!node?.isText) return null;
 const characters = Array.from(node.text!);
 const length = (direction === 1 ? characters[0] : characters[characters.length - 1]).length;
 const from = direction === 1 ? position : position - length;
 const to = direction === 1 ? position + length : position;
 const tr = state.tr.delete(from, to);
 return tr.setSelection(TextSelection.create(tr.doc, from));
}
export const WritingTrackedChanges = Extension.create({
 name: "writingTrackedChanges",
 addProseMirrorPlugins: () => [createWritingTrackingPlugin()],
 addKeyboardShortcuts() {
  const remove = (direction: -1 | 1) => { const tr = trackedDeleteTransaction(this.editor.state, direction); if (!tr) return false; this.editor.view.dispatch(tr); return true; };
  return { Backspace: () => remove(-1), Delete: () => remove(1) };
 },
});
const readingEditable = new WeakMap<Editor, boolean>();
export function setWritingTracking(editor: Editor, patch: Partial<TrackingState>) {
 if (editor.isDestroyed) return;
 const current = writingTrackingKey.getState(editor.state);
 if (!current || Object.entries(patch).every(([key, value]) => current[key as keyof TrackingState] === value)) return;
 if (patch.view && patch.view !== "changes") {
  if (!readingEditable.has(editor)) readingEditable.set(editor, editor.isEditable);
  editor.setEditable(false, false);
 } else if (patch.view === "changes" && readingEditable.has(editor)) {
  editor.setEditable(readingEditable.get(editor)!, false); readingEditable.delete(editor);
 }
 editor.view.dispatch(editor.state.tr.setMeta(writingTrackingKey, patch).setMeta("addToHistory", false));
}
export function trackedReviewTransaction(state: EditorState, id: string, action: "accept" | "reject") {
 const change = trackedChanges(state.doc).find(item => item.id === id);
 if (!change) return null;
 const tr = closeHistory(state.tr).setMeta(HANDLED, true);
 for (const span of [...change.spans].sort((a, b) => b.from - a.from)) {
  const remove = action === "accept" ? span.kind === "deletion" : span.kind === "insertion";
  if (remove) tr.delete(span.from, span.to);
  else tr.removeMark(span.from, span.to, state.schema.marks[span.kind === "insertion" ? INSERTION : DELETION]);
 }
 return tr;
}
export function reviewTrackedChange(editor: Editor, id: string, action: "accept" | "reject") {
 const tr = trackedReviewTransaction(editor.state, id, action);
 if (!tr) return false;
 editor.view.dispatch(tr); return true;
}
/** A recovered cutting becomes ordinary rich text when inserted again. */
export function untrackedSlice(slice: Slice): Slice {
 function clean(fragment: Fragment): Fragment {
  const nodes: ProseNode[] = [];
  fragment.forEach(node => {
   const content = node.isLeaf ? node : node.copy(clean(node.content));
   nodes.push(content.mark(content.marks.filter(mark => mark.type.name !== INSERTION && mark.type.name !== DELETION)));
  });
  return Fragment.fromArray(nodes);
 }
 return new Slice(clean(slice.content), slice.openStart, slice.openEnd);
}
