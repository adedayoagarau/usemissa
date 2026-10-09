import test from "node:test";
import assert from "node:assert/strict";
import { Fragment, Slice, Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { history, undo, redo } from "@tiptap/pm/history";
import { trackedReviewTransaction, untrackedSlice, createWritingTrackingPlugin, writingTrackingKey, trackedChanges, trackedReadingText, INSERTION, DELETION } from "./writing-tracked-changes";
const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {} }, marks: { strong: {}, [INSERTION]: { attrs: { id: {} }, inclusive: false, excludes: "" }, [DELETION]: { attrs: { id: {} }, inclusive: false, excludes: "" } } });
function state(text = "A sentence.") { let s = EditorState.create({ schema, doc: schema.node("doc", null, schema.node("paragraph", null, schema.text(text, [schema.mark("strong")]))), plugins: [history(), createWritingTrackingPlugin()] }); s = s.applyTransaction(s.tr.setMeta(writingTrackingKey, { enabled: true })).state; return s; }
function apply(s: EditorState, text: string, from: number, to = from) { return s.applyTransaction(s.tr.insertText(text, from, to)).state; }
test("typing coalesces insertions and clean original/proposed readings remain correct", () => {
 let s = state(); s = apply(s, "new ", 3); s = apply(s, "word ", 7);
 assert.equal(trackedChanges(s.doc).length, 1);
 assert.equal(trackedChanges(s.doc)[0].inserted, "new word ");
 assert.equal(trackedReadingText(s.doc, "original"), "A sentence.");
 assert.equal(trackedReadingText(s.doc, "proposed"), "A new word sentence.");
});
test("replacement keeps removed rich text and typing deletion cancels inserted text", () => {
 let s = state(); s = apply(s, "topic", 3, 11);
 const change = trackedChanges(s.doc)[0];
 assert.equal(change.deleted, "sentence"); assert.equal(change.inserted, "topic");
 assert.equal(trackedReadingText(s.doc, "proposed"), "A topic.");
 assert.equal(trackedReadingText(s.doc, "original"), "A sentence.");
 assert.equal(s.doc.firstChild?.firstChild?.marks[0].type.name, "strong");
 const insertion = change.spans.find(span => span.kind === "insertion")!;
 s = apply(s, "", insertion.from, insertion.to);
 assert.equal(trackedReadingText(s.doc, "proposed"), "A .");
 assert.equal(trackedChanges(s.doc)[0].deleted, "sentence");
});
test("backspace across original letters accumulates recoverable deletions without swallowing typing", () => {
 let s = state("abc"); s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 4)));
 s = apply(s, "", 3, 4); assert.equal(s.selection.from, 3);
 s = apply(s, "", 2, 3);
 assert.equal(trackedReadingText(s.doc, "original"), "abc");
 assert.equal(trackedReadingText(s.doc, "proposed"), "a");
 assert.equal(trackedChanges(s.doc).length, 1);
});
test("history undo/redo restores exact rich tracked state without tracking history again", () => {
 let s = state(); s = apply(s, "hello ", 3); const tracked = s.doc.toJSON();
 assert.equal(undo(s, tr => { s = s.applyTransaction(tr).state; }), true);
 assert.equal(trackedChanges(s.doc).length, 0);
 assert.equal(redo(s, tr => { s = s.applyTransaction(tr).state; }), true);
 assert.deepEqual(s.doc.toJSON(), tracked);
});
test("marks survive JSON reload; structural deletions retain user's live edit and explain limitation", () => {
 let s = state(); s = apply(s, "word", 3);
 const reopened = schema.nodeFromJSON(JSON.parse(JSON.stringify(s.doc.toJSON())));
 assert.equal(trackedReadingText(reopened, "original"), "A sentence.");
 assert.equal(trackedChanges(reopened).length, 1);
 s = EditorState.create({ schema, doc: schema.node("doc", null, [schema.node("paragraph", null, schema.text("first")), schema.node("paragraph", null, schema.text("second"))]), plugins: [createWritingTrackingPlugin()] });
 s = s.apply(s.tr.setMeta(writingTrackingKey, { enabled: true }));
 s = s.applyTransaction(s.tr.delete(3, 10)).state;
 assert.match(writingTrackingKey.getState(s)!.warning, /block change/);
});
test("multi paragraph pasted text is preserved with insertions across both text blocks", () => {
 let s = state("ab");
 const slice = new Slice(Fragment.fromArray([schema.node("paragraph", null, schema.text("one")), schema.node("paragraph", null, schema.text("two"))]), 1, 1);
 s = s.applyTransaction(s.tr.replaceRange(2, 2, slice)).state;
 assert.equal(trackedReadingText(s.doc, "proposed"), "aone\ntwob");
 assert.equal(trackedChanges(s.doc)[0].inserted, "onetwo");
});
test("composition replacement preserves final composed text and a single tracked insertion", () => {
 let s = state("ab");
 s = s.applyTransaction(s.tr.insertText("n", 2).setMeta("composition", 1)).state;
 s = s.applyTransaction(s.tr.insertText("に", 2, 3).setMeta("composition", 1)).state;
 s = s.applyTransaction(s.tr.insertText("日本", 2, 3).setMeta("composition", 1)).state;
 assert.equal(trackedReadingText(s.doc, "proposed"), "a日本b");
 assert.equal(trackedReadingText(s.doc, "original"), "ab");
 assert.equal(trackedChanges(s.doc).length, 1);
});

test("individual accept/reject preserves rich surrounding text and acceptance can be undone", () => {
 let s = state(); s = apply(s, "topic", 3, 11);
 const id = trackedChanges(s.doc)[0].id;
 const reject = s.applyTransaction(trackedReviewTransaction(s, id, "reject")!).state;
 assert.equal(trackedReadingText(reject.doc, "proposed"), "A sentence.");
 assert.equal(trackedChanges(reject.doc).length, 0);
 s = s.applyTransaction(trackedReviewTransaction(s, id, "accept")!).state;
 assert.equal(trackedReadingText(s.doc, "proposed"), "A topic.");
 assert.equal(trackedChanges(s.doc).length, 0);
 assert.equal(undo(s, tr => { s = s.applyTransaction(tr).state; }), true);
 assert.equal(trackedChanges(s.doc)[0].id, id);
});
test("recovering removed rich text clears tracked layer but retains bold", () => {
 let s = state(); s = apply(s, "", 3, 11);
 const span = trackedChanges(s.doc)[0].spans[0];
 const slice = untrackedSlice(s.doc.slice(span.from, span.to));
 assert.equal(slice.content.firstChild!.marks.some(mark => [INSERTION, DELETION].includes(mark.type.name)), false);
 assert.equal(slice.content.firstChild!.marks[0].type.name, "strong");
});
import { trackedDeleteTransaction } from "./writing-tracked-changes";
test("forward delete skips retained deletion text and continues through original characters", () => {
 let s = state("abc"); s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1)));
 s = apply(s, "", 1, 2);
 const tr = trackedDeleteTransaction(s, 1); assert.ok(tr);
 s = s.applyTransaction(tr).state;
 assert.equal(trackedReadingText(s.doc, "original"), "abc");
 assert.equal(trackedReadingText(s.doc, "proposed"), "c");
});
