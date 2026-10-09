"use client";
import { useEffect, useId, useState } from "react";
import { Slice } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { untrackedSlice, trackedChanges, setWritingTracking, reviewTrackedChange, writingTrackingKey, type TrackedView } from "@/lib/writing-tracked-changes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { PageEditors } from "./writing-pages";
import { comparePassage, humanReplacementTransaction, anchorIsCurrent, emptyRevisionTools, parseRevisionTools, revisionToolsKey, type PassageAnchor, type RevisionToolsState } from "@/lib/writing-revision-tools";

/** Human-authored revisions, held apart from the clean original until accepted. */
export function WritingRevisionTools({ accountId, documentId, editor, editors, readOnly, onClose, trackingEnabled, onTrackingChange }: {
 accountId: string; documentId: string; editor: Editor | null; editors: PageEditors; readOnly: boolean; onClose: () => void; trackingEnabled?: boolean; onTrackingChange?: (enabled: boolean) => void;
}) {
 const fieldId = useId();
 const [trackingRefresh, refreshTracking] = useState(0);
 const [localTracking, setLocalTracking] = useState(() => editor ? writingTrackingKey.getState(editor.state)?.enabled ?? false : false);
 const [trackedView, setTrackedView] = useState<TrackedView>("changes");
 const tracking = trackingEnabled ?? localTracking;
 useEffect(() => {
  const update = () => refreshTracking(value => value + 1);
  for (const current of editors.values()) current.on("transaction", update);
  return () => { for (const current of editors.values()) { current.off("transaction", update); if (!current.isDestroyed) setWritingTracking(current, { view: "changes" }); } };
 }, [editors]);
 const automatic = [...editors].flatMap(([source, current]) => current.isDestroyed ? [] : trackedChanges(current.state.doc).map(change => ({ source, editor: current, change })));
 // The counter triggers a fresh projection of durable marks whenever an editor changes.
 void trackingRefresh;
 function trackingToggle(enabled: boolean) {
  setLocalTracking(enabled); onTrackingChange?.(enabled);
  for (const current of editors.values()) if (!current.isDestroyed) setWritingTracking(current, { enabled });
 }
 function viewTracking(view: TrackedView) {
  setTrackedView(view);
  for (const current of editors.values()) if (!current.isDestroyed) setWritingTracking(current, { view });
 }
 function reviewAutomatic(current: Editor, id: string, action: "accept" | "reject") {
  const change = trackedChanges(current.state.doc).find(item => item.id === id);
  if (!change || readOnly) return;
  if (action === "accept" && change.deleted) {
   const cuttings = change.spans.filter(span => span.kind === "deletion").map(span => ({ id: crypto.randomUUID(), text: span.text, createdAt: new Date().toISOString(), richSlice: untrackedSlice(current.state.doc.slice(span.from, span.to)).toJSON() }));
   const next = { ...state, cuttings: [...state.cuttings, ...cuttings] };
   try { localStorage.setItem(key, JSON.stringify(next)); }
   catch { setError("The removed text could not be saved as a cutting. This change has not been accepted."); return; }
   setState(next);
  }
  reviewTrackedChange(current, id, action);
 }

 const key = revisionToolsKey(accountId, documentId);
 const [loaded] = useState(() => {
  let originalRaw: string | null = null;
  try {
   originalRaw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
   return { state: originalRaw ? parseRevisionTools(originalRaw) : emptyRevisionTools(), error: "", originalRaw };
  } catch {
   return { state: emptyRevisionTools(), error: "Revision notes could not be loaded. Existing saved notes will be kept. Download a backup before closing.", originalRaw };
  }
 });
 const [state, setState] = useState<RevisionToolsState>(loaded.state);
 const [error, setError] = useState(loaded.error);
 const ready = !loaded.error;
 const [showResolved, setShowResolved] = useState(false);
 const [commentIndex, setCommentIndex] = useState(0);
 const [draft, setDraft] = useState("");
 const [selection, setSelection] = useState<PassageAnchor | null>(() => {
  if (!editor || editor.isDestroyed) return null;
  const source = [...editors].find(([, candidate]) => candidate === editor)?.[0];
  if (!source) return null;
  const { from, to } = editor.state.selection;
  return { source, from, to, original: editor.state.doc.textBetween(from, to, "\n"), signature: JSON.stringify(editor.getJSON()) };
 });
 function persist(next: RevisionToolsState) {
  if (!ready) { setError("Saved revision notes could not be read. Download a backup before making changes."); return; }
  setState(next);
  try { localStorage.setItem(key, JSON.stringify(next)); setError(""); }
  catch { setError("These revisions are only in memory. Download a backup before closing."); }
 }
 function target(anchor: PassageAnchor) {
  const current = editors.get(anchor.source);
  if (!current || current.isDestroyed || anchor.to > current.state.doc.content.size) return null;
  return anchorIsCurrent(anchor, JSON.stringify(current.getJSON()), current.state.doc.textBetween(anchor.from, anchor.to, "\n")) ? current : null;
 }
 function navigate(anchor: PassageAnchor) {
  const current = target(anchor);
  if (!current) { setError("This passage has changed. Select it again to make a new revision."); return; }
  current.chain().focus().setTextSelection({ from: anchor.from, to: anchor.to }).run();
  current.view.dom.scrollIntoView({ block: "center" });
 }
 function add(kind: "suggestion" | "comment", marking?: "Verify this" | "Revisit" | "Keep this passage") {
  if (!selection || readOnly || !ready || (kind === "comment" && !draft.trim() && !marking)) return;
  if (!target(selection)) { setError("This passage has changed. Close revisions and select it again."); return; }
  const id = crypto.randomUUID();
  persist(kind === "suggestion" ? { ...state, suggestions: [...state.suggestions, { id, anchor: selection, replacement: draft }] } : { ...state, comments: [...state.comments, { id, anchor: selection, text: draft.trim() || marking || "", kind: marking, resolved: false }] });
  setDraft("");
 }
 function keepCutting() {
  if (!selection?.original || readOnly || !ready) return;
  const current = target(selection);
  if (!current) { setError("This passage has changed. Select it again before cutting."); return; }
  const next = { ...state, cuttings: [...state.cuttings, { id: crypto.randomUUID(), text: selection.original, createdAt: new Date().toISOString(), richSlice: current.state.doc.slice(selection.from, selection.to).toJSON() }] };
  // Preserve the cutting before deleting any document content.
  try { localStorage.setItem(key, JSON.stringify(next)); }
  catch { setError("The cutting could not be saved. Your passage has been kept in the document."); return; }
  setState(next);
  current.view.dispatch(current.state.tr.delete(selection.from, selection.to).setMeta("writingTrackedChangesHandled", true));
  setSelection(null);
 }
 function backup() {
  const recovery = loaded.error ? { recoveryVersion: 1, originalRaw: loaded.originalRaw, currentState: state } : state;
  const url = URL.createObjectURL(new Blob([JSON.stringify(recovery, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = "missa-revision-notes.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
 }
 return <Sheet open onOpenChange={open => { if (!open) { for (const current of editors.values()) if (!current.isDestroyed) setWritingTracking(current, { view: "changes" }); onClose(); } }}>
  <SheetContent className="overflow-y-auto">
   <SheetHeader><SheetTitle>Revise</SheetTitle><SheetDescription>Explicit suggestions, cuttings and private comments stay on this device. Your original stays clean until you accept a suggestion.</SheetDescription></SheetHeader>
   {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
   <Button variant="outline" onClick={backup}>Download revision backup</Button>
   <section className="space-y-3"><h3 className="font-medium">Track changes</h3>
    <Button variant={tracking ? "default" : "outline"} aria-pressed={tracking} disabled={readOnly} onClick={() => trackingToggle(!tracking)}>{tracking ? "Tracking on" : "Track typing"}</Button>
    <p className="text-sm text-muted-foreground">Track text you type, paste or remove within a paragraph. Paragraph splits and merges, block moves and formatting changes save directly.</p>
    <div className="flex flex-wrap gap-2">{(["changes", "original", "proposed"] as const).map(view => <Button size="sm" variant="outline" key={view} aria-pressed={trackedView === view} onClick={() => viewTracking(view)}>{view === "changes" ? "Show changes" : view === "original" ? "Read original" : "Read proposed"}</Button>)}</div>
    {[...editors.values()].map((current, index) => { const warning = current.isDestroyed ? "" : writingTrackingKey.getState(current.state)?.warning; return warning ? <p key={index} role="status" className="text-sm text-muted-foreground">{warning}</p> : null; })}
    {!automatic.length && <p className="text-sm text-muted-foreground">No tracked typing yet.</p>}
    {automatic.map(({ source, editor: current, change }) => <article key={`${source}:${change.id}`} className="space-y-2 border-t pt-3"><p className="whitespace-pre-wrap break-words text-sm"><del className="text-destructive">{change.deleted}</del><ins className="text-primary">{change.inserted}</ins></p><div className="flex gap-2"><Button size="sm" disabled={readOnly || !ready} onClick={() => reviewAutomatic(current, change.id, "accept")}>Accept tracked change</Button><Button size="sm" variant="outline" disabled={readOnly} onClick={() => reviewAutomatic(current, change.id, "reject")}>Reject tracked change</Button></div></article>)}
   </section>
   <section className="space-y-3"><h3 className="font-medium">Selected passage</h3>
    <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{selection?.original || "Select a passage in your piece, then open Revise. A cursor position can also hold an insertion suggestion."}</p>
    <Label htmlFor={fieldId}>Your replacement or comment</Label><Textarea id={fieldId} value={draft} onChange={event => setDraft(event.target.value)} disabled={readOnly || !ready || !selection} />
    <div className="flex flex-wrap gap-2"><Button size="sm" disabled={readOnly || !ready || !selection} onClick={() => add("suggestion")}>{selection?.from === selection?.to ? "Suggest insertion here" : draft ? "Suggest replacement" : "Suggest deletion"}</Button><Button variant="outline" size="sm" disabled={readOnly || !ready || !selection || !draft.trim()} onClick={() => add("comment")}>Add comment</Button><Button variant="outline" size="sm" disabled={readOnly || !ready || !selection?.original} onClick={keepCutting}>Cut and keep</Button></div>
    <div className="flex flex-wrap gap-2">{(["Verify this", "Revisit", "Keep this passage"] as const).map(marking => <Button key={marking} size="sm" variant="outline" disabled={readOnly || !ready || !selection} onClick={() => add("comment", marking)}>{marking}</Button>)}</div>
   </section>
   <section className="space-y-3"><h3 className="font-medium">Suggestions ({state.suggestions.length})</h3>{!state.suggestions.length && <p className="text-sm text-muted-foreground">No suggestions yet.</p>}
    {state.suggestions.map(s => {
     const difference = comparePassage(s.anchor.original, s.replacement);
     return <article key={s.id} className="space-y-2 border-t pt-3">
      <p className="text-xs text-muted-foreground">Passage comparison</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><div><p className="text-xs font-medium">Before</p><p className="whitespace-pre-wrap break-words text-sm">{s.anchor.original || "Insertion point"}</p></div><div><p className="text-xs font-medium">After</p><p className="whitespace-pre-wrap break-words text-sm">{s.replacement || "Remove this passage"}</p></div></div>
      <p className="whitespace-pre-wrap break-words text-sm" aria-label="Proposed changes">{difference.prefix}<del className="text-destructive">{difference.removed}</del><ins className="text-primary">{difference.added}</ins>{difference.suffix}</p>
      <div className="flex gap-2"><Button size="sm" disabled={readOnly || !ready} onClick={() => {
       const current = target(s.anchor); if (!current) { setError("This passage has changed. Reject this suggestion and select the passage again."); return; }
       const next = { ...state, suggestions: state.suggestions.filter(item => item.id !== s.id), cuttings: s.anchor.original ? [...state.cuttings, { id: crypto.randomUUID(), text: s.anchor.original, createdAt: new Date().toISOString(), richSlice: current.state.doc.slice(s.anchor.from, s.anchor.to).toJSON() }] : state.cuttings };
       // Do not remove original text until its recoverable rich cutting is durable.
       try { localStorage.setItem(key, JSON.stringify(next)); }
       catch { setError("The original passage could not be saved as a cutting. Your suggestion has not been applied."); return; }
       current.view.dispatch(humanReplacementTransaction(current.state, s.anchor.from, s.anchor.to, s.replacement).setMeta("writingTrackedChangesHandled", true));
       setState(next); setError("");
      }}>Accept</Button><Button size="sm" variant="outline" disabled={readOnly || !ready} onClick={() => persist({ ...state, suggestions: state.suggestions.filter(item => item.id !== s.id) })}>Reject</Button><Button size="sm" variant="ghost" onClick={() => navigate(s.anchor)}>Find passage</Button></div></article>;
    })}
   </section>
   <section className="space-y-3"><h3 className="font-medium">Private comments</h3><div className="flex gap-2"><Button size="sm" variant="outline" aria-pressed={!showResolved} onClick={() => setShowResolved(!showResolved)}>{showResolved ? "Show unresolved" : "Unresolved only"}</Button><Button size="sm" variant="ghost" disabled={!state.comments.some(c => !c.resolved)} onClick={() => { const comments = state.comments.filter(c => !c.resolved); const next = commentIndex % comments.length; setCommentIndex(next + 1); navigate(comments[next].anchor); }}>Next unresolved</Button></div>{!state.comments.some(c => !c.resolved) && <p className="text-sm text-muted-foreground">No unresolved comments.</p>}{state.comments.filter(c => showResolved || !c.resolved).map(c => <article key={c.id} className="space-y-2 border-t pt-3"><p className="text-xs text-muted-foreground">{c.kind || "Comment"}{c.resolved ? " · Resolved" : ""}</p><p className="whitespace-pre-wrap break-words text-sm">{c.text}</p><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => navigate(c.anchor)}>Find passage</Button><Button size="sm" variant="ghost" disabled={readOnly || !ready} onClick={() => persist({ ...state, comments: state.comments.map(item => item.id === c.id ? { ...item, resolved: true } : item) })}>Resolve</Button></div></article>)}</section>
   <section className="space-y-3"><h3 className="font-medium">Cuttings</h3>{!state.cuttings.length && <p className="text-sm text-muted-foreground">Keep removed passages here for later.</p>}{state.cuttings.map(c => <article key={c.id} className="space-y-2 border-t pt-3"><p className="whitespace-pre-wrap break-words text-sm">{c.text}</p><Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(c.text); } catch { setError("Copy failed. Select the cutting text and copy it manually."); } }}>Copy for reuse</Button><Button size="sm" variant="ghost" disabled={readOnly || !editor || editor.isDestroyed} onClick={() => { if (!editor || editor.isDestroyed) return; try { editor.view.dispatch(c.richSlice ? editor.state.tr.replaceSelection(Slice.fromJSON(editor.schema, c.richSlice)) : editor.state.tr.insertText(c.text)); editor.commands.focus(); } catch { setError("This rich cutting could not be restored. Copy its text for reuse."); } }}>Insert at cursor</Button></article>)}</section>
  </SheetContent>
 </Sheet>;
}
