import test from "node:test";
import assert from "node:assert/strict";
import { humanReplacementTransaction, anchorIsCurrent, emptyRevisionTools, parseRevisionTools, revisionToolsKey } from "./writing-revision-tools";
test("anchors refuse edits even when a duplicate passage still matches", () => {
 const anchor = { source: "p", from: 1, to: 5, original: "same", signature: "before" };
 assert.equal(anchorIsCurrent(anchor, "after", "same"), false);
 assert.equal(anchorIsCurrent(anchor, "before", "changed"), false);
 assert.equal(anchorIsCurrent(anchor, "before", "same"), true);
});
test("revision storage separates account and piece without ambiguous separators", () => {
 assert.notEqual(revisionToolsKey("a:b", "c"), revisionToolsKey("a", "b:c"));
});
test("backup validation preserves revisions and rejects malformed ranges", () => {
 assert.deepEqual(parseRevisionTools(JSON.stringify(emptyRevisionTools())), emptyRevisionTools());
 assert.throws(() => parseRevisionTools('{"version":1,"suggestions":[{}],"comments":[],"cuttings":[]}'));
});
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
test("accepted replacement transaction preserves surrounding rich text and blocks", () => {
 const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {} }, marks: { strong: {} } });
 const doc = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("Before ", [schema.mark("strong")]), schema.text("old"), schema.text(" after")]), schema.node("paragraph", null, schema.text("Other page"))]);
 const state = EditorState.create({ schema, doc });
 const result = state.apply(humanReplacementTransaction(state, 8, 11, "new"));
 assert.equal(result.doc.textContent, "Before new afterOther page");
 assert.equal(result.doc.firstChild?.firstChild?.marks[0]?.type.name, "strong");
 assert.equal(result.doc.child(1).textContent, "Other page");
});

test("whole paragraph suggestion retains original inline style", () => {
 const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {} }, marks: { strong: {} } });
 const doc = schema.node("doc", null, schema.node("paragraph", null, schema.text("old", [schema.mark("strong")])));
 const state = EditorState.create({ schema, doc });
 const result = state.apply(humanReplacementTransaction(state, 0, doc.content.size, "new"));
 assert.equal(result.doc.firstChild?.firstChild?.marks[0]?.type.name, "strong");
});
import { comparePassage } from "./writing-revision-tools";
import { Slice } from "@tiptap/pm/model";
test("passage comparison separates insertion deletion and unchanged context", () => {
 assert.deepEqual(comparePassage("The old ending", "The new ending"), { prefix: "The ", removed: "old", added: "new", suffix: " ending" });
 assert.deepEqual(comparePassage("", "Added"), { prefix: "", removed: "", added: "Added", suffix: "" });
 assert.deepEqual(comparePassage("Deleted", ""), { prefix: "", removed: "Deleted", added: "", suffix: "" });
});
test("rich cuttings retain inline style after JSON backup round trip", () => {
 const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {} }, marks: { strong: {} } });
 const doc = schema.node("doc", null, schema.node("paragraph", null, schema.text("kept", [schema.mark("strong")])));
 const data = emptyRevisionTools();
 data.cuttings.push({ id: "cut", text: "kept", createdAt: "now", richSlice: doc.slice(1, 5).toJSON() });
 const saved = parseRevisionTools(JSON.stringify(data));
 const slice = Slice.fromJSON(schema, saved.cuttings[0].richSlice);
 assert.equal(slice.content.firstChild?.marks[0]?.type.name, "strong");
});
