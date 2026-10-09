"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/missa/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WritingStructure } from "@/components/missa/writing-structure";
import { WritingResearch } from "@/components/missa/writing-research";
import { WritingExport } from "@/components/missa/writing-export";
import { type LibraryPiece, projectName } from "@/components/missa/writing-library";
import { documentText, serializeDocument, type WritingDocument } from "@/lib/writing-document";
import { countWords } from "@/lib/writing";
import { compileProject, type WritingProject } from "@/lib/writing-projects";
import type { WritingFork } from "@/lib/writing-sync";
import { EMPTY_STUDIO, studioDataSchema as studioSchema, type StudioData, type StudioRecord, type ReaderCopy } from "@/lib/writing-studio-data";
import { mergeManuscriptPieces } from "@/lib/writing-manuscript";
import { createProjectBackup } from "@/lib/writing-project-backup";
import { collectProjectRevisionBackup } from "@/lib/writing-project-revision-backup";
import { revisionSchema, type WritingCheckpoint } from "@/lib/writing-revisions";

export type StudioPiece = { id: string; title: string; doc: WritingDocument };
type Share = { id: string; createdAt: string; expiresAt: string; revoked: boolean };

function downloadBackup(data: StudioData) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = window.document.createElement("a");
  link.href = url; link.download = "missa-project-notes.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** All five writing experiences share the same project, drafts and private notes. */
export function WritingStudio({ project, libraryPieces, currentPiece, deviceKey, planner, forks, loadPieces,
  manuscriptPieces, selection, initialTab = "manuscript", onInsertFootnote, onInsertPieceLink, onOpenPiece, onEditManuscript, onInsertCitation, onRestoreCopy, onImport, onPrint, onClose }: {
  project: WritingProject; libraryPieces: LibraryPiece[]; currentPiece: StudioPiece;
  deviceKey: string; planner: boolean; forks: WritingFork[];
  loadPieces: () => Promise<StudioPiece[]>;
  manuscriptPieces: StudioPiece[] | null; selection: string;
  onOpenPiece: (id: string) => void; onEditManuscript: (pieces: StudioPiece[]) => void;
  onInsertCitation: (text: string) => boolean;
  onInsertFootnote?: (text: string) => boolean;
  onInsertPieceLink?: (label: string, href: string) => boolean;
  initialTab?: "manuscript" | "research";
  onRestoreCopy: (checkpoint: WritingCheckpoint) => Promise<void>;
  onImport: (doc: WritingDocument, title: string) => void;
  onPrint: (doc: WritingDocument, title: string) => void; onClose: () => void;
}) {
  const [pieces, setPieces] = useState<StudioPiece[]>([]);
  const { confirm, dialog: confirmation } = useConfirm();
  const [record, setRecord] = useState<StudioRecord | null>(null);
  const [data, setData] = useState<StudioData>(EMPTY_STUDIO);
  const [saved, setSaved] = useState(JSON.stringify(EMPTY_STUDIO));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [backupFailed, setBackupFailed] = useState(false);
  const [recoveredBackup, setRecoveredBackup] = useState<StudioData | null>(null);
  const [conflict, setConflict] = useState<StudioRecord | null>(null);
  const [checkpointName, setCheckpointName] = useState("");
  const [shares, setShares] = useState<Share[]>([]);
  const [link, setLink] = useState("");
  const [comparison, setComparison] = useState<WritingCheckpoint | null>(null);
  const [feedback, setFeedback] = useState<ReaderCopy | null>(null);
  const [exportTarget, setExportTarget] = useState("project");
  const alive = useRef(true);
  const storageKey = `missa.write.studio.v1:${deviceKey}:${project.id}`;
  const endpoint = `/api/me/writing/projects/${encodeURIComponent(project.id)}`;
  async function downloadProjectBackup() {
    if (loading || !record) { setError("Wait for the complete project to load before downloading its backup."); return; }
    let deviceRevisions: Record<string, string | null>;
    try { deviceRevisions = await collectProjectRevisionBackup(pieces.map(piece => piece.id), deviceKey, key => localStorage.getItem(key)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Revision notes could not be checked. Retry online before downloading a whole-project backup."); return; }
    if (!alive.current) return;
    let backup;
    try { backup = createProjectBackup(project, pieces, data, deviceRevisions, libraryPieces); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "This project backup could not be prepared."); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = window.document.createElement("a"); link.href = url; link.download = "missa-whole-project.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const dirty = JSON.stringify(data) !== saved;
  const latestData = useRef(data);
  useEffect(() => { latestData.current = data; }, [data]);

  useEffect(() => {
    alive.current = true;
    async function load() {
      try {
        const [loadedPieces, response] = await Promise.all([loadPieces(), fetch(`${endpoint}/studio`, { cache: "no-store" })]);
        const result = await response.json();
        if (!response.ok || !result.studio) throw new Error("load");
        const parsed = studioSchema.safeParse(result.studio.data);
        if (!parsed.success) throw new Error("data");
        if (!alive.current) return;
        const server: StudioRecord = { data: parsed.data, revision: result.studio.revision };
        setRecord(server); setData(server.data); setSaved(JSON.stringify(server.data)); setPieces(loadedPieces);
        try {
          const raw = window.localStorage.getItem(storageKey);
          if (raw) {
            const backup = JSON.parse(raw);
            const local = studioSchema.safeParse(backup.data);
            if (local.success && JSON.stringify(local.data) !== JSON.stringify(server.data)) {
              setData(local.data);
              setRecord({ data: server.data, revision: backup.baseRevision });
              if (backup.baseRevision !== server.revision) setConflict(server);
              setStatus("Recovered notes and plans from this device. Review them before saving.");
            }
          }
        } catch { setBackupFailed(true); }
        const readers = await fetch(`${endpoint}/readers`, { cache: "no-store" });
        if (readers.ok && alive.current) setShares((await readers.json()).shares ?? []);
      } catch {
        if (alive.current) {
          setError("Couldn’t open the project workspace. Close it and try again. Your drafts are safe.");
          try {
            const raw = window.localStorage.getItem(storageKey);
            const local = raw ? studioSchema.safeParse(JSON.parse(raw).data) : null;
            if (local?.success) setRecoveredBackup(local.data);
          } catch { setBackupFailed(true); }
        }
      } finally { if (alive.current) setLoading(false); }
    }
    void load();
    return () => { alive.current = false; };
    // Open a stable project session; callback identities change as drafts save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, storageKey]);

  useEffect(() => {
    const { id, title, doc } = currentPiece;
    setPieces((value) => value.map((piece) => piece.id === id ? { id, title, doc } : piece));
    // Only document changes replace a piece; the wrapper object changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPiece.id, currentPiece.doc, currentPiece.title]);

  useEffect(() => {
    for (const fork of forks) {
      setPieces((value) => value.map((piece) => piece.id === fork.from ? { ...piece, id: fork.to } : piece));
    }
  }, [forks]);

  useEffect(() => { if (manuscriptPieces) setPieces((all) => mergeManuscriptPieces(all, manuscriptPieces)); }, [manuscriptPieces]);

  function change(next: StudioData) {
    setData(next);
    setStatus("Notes and plans changed. Save them to your account.");
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ data: next, baseRevision: record?.revision ?? 0 }));
      setBackupFailed(false);
    } catch { setBackupFailed(true); }
  }

  async function save() {
    if (!record || conflict) return;
    setBusy(true); setError("");
    const sent = data;
    try {
      const response = await fetch(`${endpoint}/studio`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: sent, baseRevision: record.revision }) });
      const result = await response.json();
      if (!alive.current) return;
      if (response.status === 409 && result.current) {
        setConflict(result.current); setError("Another device changed these notes. Your copy is kept here. Download it before loading the account copy."); return;
      }
      if (!response.ok || !result.studio) throw new Error("save");
      setRecord(result.studio); setSaved(JSON.stringify(sent));
      setStatus("Notes and plans saved to your account.");
      try {
        if (JSON.stringify(latestData.current) === JSON.stringify(sent)) window.localStorage.removeItem(storageKey);
        else window.localStorage.setItem(storageKey, JSON.stringify({ data: latestData.current, baseRevision: result.studio.revision }));
      } catch { setBackupFailed(true); }
    } catch { if (alive.current) setError("Couldn’t save notes and plans. Your device copy is kept unless storage is unavailable. Try again."); }
    finally { if (alive.current) setBusy(false); }
  }

  const piece = pieces.find((item) => item.id === currentPiece.id) ?? pieces[0];
  const manuscript = pieces.filter((item) => item.doc.purpose !== "research");
  const exportPiece = pieces.find((item) => item.id === exportTarget);
  const exportTitle = exportPiece?.title || projectName(project);
  const exportDoc = exportPiece?.doc ?? compileProject(projectName(project),
    pieces.map((item) => ({ title: item.title, body: documentText(item.doc), document: serializeDocument(item.doc) })),
    { pageSize: currentPiece.doc.pageSize, titlePage: true, pieceTitles: true }, currentPiece.doc.typeface);
  const liveLibrary = libraryPieces.map((item) => {
    const live = pieces.find((source) => source.id === item.id);
    return live ? { ...item, wordCount: live.doc.purpose === "research" ? 0 : countWords(documentText(live.doc)) } : item;
  });
  function checkpoint() {
    if (!checkpointName.trim() || !pieces.length) return;
    const checkpoint: WritingCheckpoint = { id: crypto.randomUUID(), name: checkpointName.trim(), createdAt: new Date().toISOString(),
      pieces: manuscript.map((item) => ({ id: item.id, title: item.title, body: documentText(item.doc), document: serializeDocument(item.doc) })) };
    const revisions = { version: 1 as const, checkpoints: [checkpoint, ...data.revisions.checkpoints] };
    const parsed = revisionSchema.safeParse(revisions);
    if (!parsed.success) { setError("This checkpoint exceeds the project history limit. Download an older checkpoint before removing it."); return; }
    change({ ...data, revisions: parsed.data }); setCheckpointName("");
  }
  async function readerLink(checkpoint: WritingCheckpoint) {
    setBusy(true); setError(""); setLink("");
    try {
      if (dirty) throw new Error("Save notes and plans before sharing a checkpoint.");
      const response = await fetch(`${endpoint}/readers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkpointId: checkpoint.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn’t create the reader link.");
      setLink(`${window.location.origin}/doc/read/${result.share.urlToken}`);
      const list = await fetch(`${endpoint}/readers`, { cache: "no-store" });
      if (list.ok) setShares((await list.json()).shares);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t create the reader link."); }
    finally { setBusy(false); }
  }

  return <aside aria-label={`${projectName(project)} · project tools`} className="flex h-2/3 min-h-0 w-full shrink-0 flex-col border-t border-border bg-background lg:h-full lg:w-2/5 lg:max-w-xl lg:border-t-0 lg:border-l print:hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="min-w-0 truncate font-medium">Project tools</h2>
        <div className="flex shrink-0 items-center gap-1"><Button variant="ghost" className="lg:hidden" disabled={loading || !record} onClick={downloadProjectBackup}>Backup</Button><Button variant="ghost" onClick={onClose}>Close</Button></div>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4" data-writing-workspace-scroll>
      {error ? <p role="alert" className="text-destructive">{error}</p> : null}
      {!record && recoveredBackup ? <Button variant="outline" onClick={() => downloadBackup(recoveredBackup)}>Download recovered notes backup</Button> : null}
      {loading ? <p role="status">Opening your project…</p> : record ? <>
        {backupFailed ? <p role="alert">Device storage isn’t available. Save to your account or download a backup before closing.</p> : null}
        {conflict ? <div className="flex flex-wrap items-center gap-2"><p>Your device copy and account copy differ.</p><Button variant="outline" onClick={() => {
          void confirm({ title: "Load the account copy?", description: "This replaces the notes and plans on this device. Download your device backup first if you want to keep it.", confirmLabel: "Load account copy" }).then((accepted) => {
          if (!accepted) return;
          setData(conflict.data); setSaved(JSON.stringify(conflict.data)); setRecord(conflict); setConflict(null); setError("");
          try { window.localStorage.removeItem(storageKey); } catch { setBackupFailed(true); }
          });
        }}>Load account copy</Button></div> : null}
        <Tabs defaultValue={initialTab} className="min-w-0">
          <TabsList variant="section" size="auto" className="mb-4 max-w-full flex-wrap justify-start">
            <TabsTrigger size="touch" value="manuscript">Manuscript</TabsTrigger>
            <TabsTrigger size="touch" value="structure">Structure</TabsTrigger>
            <TabsTrigger size="touch" value="research">Research</TabsTrigger>
            <TabsTrigger size="touch" value="revisions">Revision & readers</TabsTrigger>
            <TabsTrigger size="touch" value="export">Format & export</TabsTrigger>
          </TabsList>
          <TabsContent value="manuscript"><div className="flex flex-col gap-4">
            <p className="text-muted-foreground">Open a piece in your writing page, or edit the manuscript together.</p>
            <Button variant="outline" disabled={!manuscript.length} onClick={() => onEditManuscript(manuscript)}>Edit manuscript together</Button>
            <ul className="divide-y divide-border">{pieces.map((item) => <li key={item.id}><Button variant="ghost" className="w-full justify-start whitespace-normal text-left" onClick={() => onOpenPiece(item.id)}>{item.title || "Untitled piece"}{item.doc.purpose === "research" ? " · Research material" : ""}</Button></li>)}</ul>
          </div></TabsContent>
          <TabsContent value="structure">{planner ? <WritingStructure value={data.structure} onChange={(structure) => change({ ...data, structure })} pieces={liveLibrary} readOnly={busy} /> : <p>Structure tools are part of Plus, alongside cards and the planner.</p>}</TabsContent>
          <TabsContent value="research">
            {piece ? <div className="min-w-0"><p className="mb-4 text-muted-foreground">Sources and notes for {piece.title || "the open piece"}. Select a passage in your draft to attach a note.</p>
              <WritingResearch onInsertPieceLink={onInsertPieceLink} onInsertFootnote={onInsertFootnote} pieces={pieces} onOpenPiece={onOpenPiece} value={data.research} onChange={(research) => change({ ...data, research })} pieceId={piece.id} pieceText={documentText(piece.doc)} selection={selection} readOnly={busy || Boolean(manuscriptPieces)} onInsertCitation={onInsertCitation} />
            </div> : null}
          </TabsContent>
          <TabsContent value="revisions">
            <div className="flex flex-col gap-4">
              <Label htmlFor="checkpoint-name">Project checkpoint name</Label>
              <div className="flex flex-wrap gap-2"><Input id="checkpoint-name" value={checkpointName} maxLength={120} onChange={(event) => setCheckpointName(event.target.value)} placeholder="Before the new ending" />
                <Button variant="outline" disabled={!checkpointName.trim() || busy} onClick={checkpoint}>Keep checkpoint</Button></div>
              <p className="text-muted-foreground">Checkpoints retain every piece. Restore creates a separate project copy. Reader links share only that checkpoint; anyone with the link can read it, and signed-in readers can comment for 30 days.</p>
              {!data.revisions.checkpoints.length ? <p>No project checkpoints yet.</p> : <ul className="divide-y divide-border">
                {data.revisions.checkpoints.map((item) => <li key={item.id} className="flex flex-col gap-2 py-4">
                  <h3 className="font-semibold">{item.name}</h3><p className="text-muted-foreground">{item.pieces.length} pieces · {new Date(item.createdAt).toLocaleString()}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={busy} onClick={() => { setBusy(true); void onRestoreCopy(item).then(() => setStatus("Checkpoint restored into a separate project.")).catch(() => setError("Couldn’t restore a project copy. Your checkpoint is unchanged.")).finally(() => setBusy(false)); }}>Restore as copy</Button>
                    <Button variant="outline" onClick={() => {
                      const url = URL.createObjectURL(new Blob([JSON.stringify(item, null, 2)], { type: "application/json" })); const link = window.document.createElement("a"); link.href = url; link.download = "missa-checkpoint.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}>Download checkpoint</Button>
                    <Button variant="outline" disabled={busy || dirty} onClick={() => void readerLink(item)}>Create reader link</Button>
                    <Button variant="ghost" disabled={busy} onClick={() => void confirm({ title: "Remove this checkpoint?", description: "Download a copy first if you want to keep it. Your current draft stays unchanged.", confirmLabel: "Remove checkpoint", destructive: true }).then((accepted) => { if (accepted) change({ ...data, revisions: { ...data.revisions, checkpoints: data.revisions.checkpoints.filter((checkpoint) => checkpoint.id !== item.id) } }); })}>Remove checkpoint</Button>
                  </div>
                  <Button variant="ghost" onClick={() => setComparison(item)}>Compare with draft</Button>
                </li>)}
              </ul>}
              {comparison ? <section aria-label="Checkpoint comparison" className="flex flex-col gap-4">
                <h3 className="font-semibold">{comparison.name} compared with your current draft</h3>
                {comparison.pieces.map((earlier) => {
                  const live = pieces.find((item) => item.id === earlier.id);
                  const now = live ? documentText(live.doc) : null;
                  return <div key={earlier.id} className="flex flex-col gap-2 border-t border-border py-4">
                    <h4 className="font-semibold">{earlier.title || "Untitled piece"}</h4>
                    <p className="text-muted-foreground">{now === earlier.body ? "Text unchanged" : now === null ? "Not in the current project" : "Text changed"}</p>
                    <div className="grid gap-4 md:grid-cols-2"><div><h5>Checkpoint</h5><p className="whitespace-pre-wrap break-words">{earlier.body}</p></div><div><h5>Current draft</h5><p className="whitespace-pre-wrap break-words">{now ?? "Piece absent"}</p></div></div>
                  </div>;
                })}
                <Button variant="outline" onClick={() => setComparison(null)}>Close comparison</Button>
              </section> : null}
              {link ? <div><Label htmlFor="reader-link">Reader link — copy and share when ready</Label><Input id="reader-link" value={link} readOnly /></div> : null}
              {shares.length ? <ul className="divide-y divide-border">{shares.map((share) => <li key={share.id} className="flex flex-wrap items-center gap-3 py-3"><span>Reader copy · expires {new Date(share.expiresAt).toLocaleDateString()}</span>
                <Button variant="outline" disabled={busy} onClick={() => {
                  setBusy(true); void fetch(`${endpoint}/readers?shareId=${encodeURIComponent(share.id)}`, { cache: "no-store" }).then(async (response) => {
                    if (!response.ok) throw new Error("feedback"); setFeedback(await response.json());
                  }).catch(() => setError("Couldn’t open reader feedback. Try again.")).finally(() => setBusy(false));
                }}>Read feedback</Button>
                <Button variant="outline" disabled={busy} onClick={() => {
                setBusy(true); void fetch(`${endpoint}/readers`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: share.id }) }).then((response) => { if (!response.ok) throw new Error("revoke"); setShares((value) => value.filter((item) => item.id !== share.id)); setLink(""); }).catch(() => setError("Couldn’t revoke that link. Try again.")).finally(() => setBusy(false));
              }}>Revoke access</Button></li>)}</ul> : null}
              {feedback ? <section aria-label="Reader feedback" className="flex flex-col gap-3"><h3 className="font-semibold">{feedback.checkpoint.name} · reader feedback</h3>
                {feedback.comments.length ? <ul className="divide-y divide-border">{feedback.comments.map((comment) => <li key={comment.id} className="py-3"><blockquote className="whitespace-pre-wrap break-words text-muted-foreground">{comment.quote}</blockquote><p className="whitespace-pre-wrap break-words">{comment.body}</p><p className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</p></li>)}</ul> : <p>No reader comments yet.</p>}
                <Button variant="outline" onClick={() => setFeedback(null)}>Close feedback</Button>
              </section> : null}
            </div>
          </TabsContent>
          <TabsContent value="export"><div className="flex flex-wrap items-end gap-3"><div><Label htmlFor="export-scope">Export scope</Label><NativeSelect id="export-scope" value={exportTarget} onChange={(event) => setExportTarget(event.target.value)}><NativeSelectOption value="project">Whole manuscript</NativeSelectOption>{pieces.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.title || "Untitled piece"}</NativeSelectOption>)}</NativeSelect></div>
            {pieces.length ? <WritingExport key={exportTarget} document={exportDoc} title={exportTitle} onImport={onImport} readOnly={false} onPrint={() => onPrint(exportDoc, exportTitle)} /> : <p>Add a piece before exporting.</p>}</div><p className="mt-3 text-muted-foreground">The whole manuscript keeps binder order and piece titles. Private research and planning notes stay outside the exported text.</p></TabsContent>
        </Tabs>
      </> : null}
      </div>
      {!loading && record ? <div className={`${dirty || busy ? "flex" : "hidden lg:flex"} shrink-0 flex-wrap items-center gap-3 border-t border-border bg-background px-4 py-3`}>
          <Button variant={dirty ? "default" : "outline"} disabled={!dirty || busy || Boolean(conflict) || !record} aria-busy={busy || undefined} onClick={() => void save()}>{busy ? "Saving…" : "Save notes and plans"}</Button>
          <Button variant="ghost" disabled={loading || !record} onClick={downloadProjectBackup}>Download whole project</Button>
          <p role="status" className="w-full text-sm text-muted-foreground sm:w-auto">{status || "Notes and plans are saved."}</p>
        </div> : null}
      {confirmation}
  </aside>;
}
