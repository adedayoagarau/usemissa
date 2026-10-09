import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WritingPages, type PageEditors } from "@/components/missa/writing-pages";
import { documentText, parseWritingDocument, plainTextToDocument, serializeDocument, type WritingDocument } from "@/lib/writing-document";
import { newWritingEntryId, type WritingEntry } from "@/lib/writing";
import type { WritingDraft } from "@/lib/writing-sync";
import { OFFLINE_ACTIVE_ACCOUNT, offlineRoomLocation, offlineProjectKey, offlineProjectUrl, type OfflineWritingProject } from "@/lib/writing-offline";

function OfflineEditor() {
  const params = new URLSearchParams(location.hash.slice(1));
  const room = location.pathname === "/doc" ? offlineRoomLocation(location.search) : null;
  const account = room?.account ?? params.get("account") ?? "", projectId = room?.projectId ?? params.get("project") ?? "";
  const draftKey = `missa.write.drafts.v1:${account}`;
  const [project, setProject] = useState<OfflineWritingProject | null>(() => {
    try {
      if (localStorage.getItem(OFFLINE_ACTIVE_ACCOUNT) !== account) return null;
      const data = JSON.parse(localStorage.getItem(offlineProjectKey(account, projectId)) ?? "null");
      return data?.version === 1 && data.accountKey === account && data.project?.id === projectId ? data : null;
    } catch { return null; }
  });
  const [message, setMessage] = useState(project ? "Downloaded project. Changes are kept on this device until you return online." : "Open a downloaded project from its account in the writing room first.");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WritingEntry | null>(null);
  const [title, setTitle] = useState("");
  const [doc, setDoc] = useState<WritingDocument | null>(null);
  const [invalidRich, setInvalidRich] = useState(false);
  const [copyId, setCopyId] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const editors = useRef<PageEditors>(new Map());
  const emergency = useRef<{ doc: WritingDocument; title: string; id: string } | null>(null);
  const activeRef = useRef({ doc, title, copyId });
  activeRef.current = { doc, title, copyId };
  const [downloads, setDownloads] = useState<Array<{ title: string; id: string }>>(() => {
    try {
      return Object.keys(localStorage).filter(key => key.startsWith(`missa.write.offline.v1:${encodeURIComponent(account)}:`)).flatMap(key => {
        try { const value = JSON.parse(localStorage.getItem(key)!); return value.accountKey === account ? [{ title: value.project.title, id: value.project.id }] : []; } catch { return []; }
      });
    } catch { return []; }
  });
  const [queued, setQueued] = useState<WritingDraft[]>(() => { try { return readDrafts(); } catch { return []; } });
  const [storageIssue] = useState(() => { try { readDrafts(); return false; } catch { return true; } });
  function readDrafts(): WritingDraft[] {
    try { const data = JSON.parse(localStorage.getItem(draftKey) ?? '{"drafts":[]}'); if (!Array.isArray(data.drafts)) throw new Error(); return data.drafts; }
    catch { throw new Error("Device drafts could not be read. Download a backup before continuing."); }
  }
  function save(document: WritingDocument, nextTitle: string, id: string) {
    try {
      if (localStorage.getItem(OFFLINE_ACTIVE_ACCOUNT) !== account) throw new Error("The active account changed.");
      const raw = JSON.parse(localStorage.getItem(draftKey) ?? '{"drafts":[]}');
      if (!Array.isArray(raw.drafts)) throw new Error("Device drafts could not be read.");
      const draft: WritingDraft & { offlineSourceId?: string } = { id, content: { title: nextTitle, body: documentText(document), document: serializeDocument(document) }, baseRevision: 0, updatedAt: new Date().toISOString(), projectId, offlineSourceId: selected?.id };
      const next = [...raw.drafts.filter((item: WritingDraft) => item.id !== id), draft];
      localStorage.setItem(draftKey, JSON.stringify({ version: 1, drafts: next }));
      emergency.current = null;
      setQueued(next); setMessage("Kept on this device. Return online to save this separate copy to your account.");
    } catch (error) { emergency.current = { doc: document, title: nextTitle, id }; setMessage(`${error instanceof Error ? error.message : "Device storage failed."} Download a backup before closing.`); }
  }
  useEffect(() => {
    const accountChanged = () => {
      if (localStorage.getItem(OFFLINE_ACTIVE_ACCOUNT) !== account) { setProject(null); setDoc(null); setSelected(null); setDownloads([]); setMessage("The active account changed. Return to the writing room."); }
    };
    window.addEventListener("storage", accountChanged);
    return () => window.removeEventListener("storage", accountChanged);
  }, [account]);
  function select(entry: WritingEntry) {
    setSelected(entry); setCopyId(null); setTitle(entry.title);
    const parsed = parseWritingDocument(entry.document);
    setInvalidRich(Boolean(entry.document && !parsed));
    if (entry.document && !parsed) setMessage("This document could not be opened with its formatting. Download a backup and open the original online.");
    setDoc(parsed ?? plainTextToDocument(entry.body, "newsreader"));
    setActiveEditor(null); editors.current.clear();
  }
  function openCopy(draft: WritingDraft) {
    setInvalidRich(false); setSelected(null); setCopyId(draft.id); setTitle(draft.content.title);
    setDoc(parseWritingDocument(draft.content.document) ?? plainTextToDocument(draft.content.body, "newsreader"));
    setActiveEditor(null); editors.current.clear();
  }
  function beginCopy() {
    if (!doc || invalidRich) return;
    const id = newWritingEntryId(); const name = `${title || "Untitled"} · Offline copy`;
    setCopyId(id); setTitle(name); save(doc, name, id);
  }
  function newPiece() {
    const id = newWritingEntryId(), document = plainTextToDocument("", "newsreader");
    setInvalidRich(false); setSelected(null); setCopyId(id); setDoc(document); setTitle("Untitled offline piece");
    editors.current.clear(); setActiveEditor(null); save(document, "Untitled offline piece", id);
  }
  function backup() {
    let drafts: WritingDraft[] = []; let rawQueue: string | null = null;
    try { drafts = readDrafts().filter(draft => draft.projectId === projectId); } catch { try { rawQueue = localStorage.getItem(draftKey); } catch { /* Keep in-memory document below. */ } }
    const data = { version: 1, project, drafts, rawQueue, inMemory: activeRef.current, unsaved: emergency.current };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "missa-offline-backup.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function reorder(id: string, direction: number) {
    if (!project) return;
    const entries = [...project.entries].sort((a,b) => a.position - b.position);
    const index = entries.findIndex(entry => entry.id === id), to = index + direction;
    if (to < 0 || to >= entries.length) return;
    [entries[index], entries[to]] = [entries[to]!, entries[index]!];
    const next = { ...project, entries: entries.map((entry, position) => ({ ...entry, position })) };
    try { localStorage.setItem(offlineProjectKey(account, projectId), JSON.stringify(next)); setProject(next); setMessage("Reading order changed on this device. Account order is unchanged."); }
    catch { setMessage("This device could not keep the reading order. Download a backup."); }
  }
  const matching = (name: string, body: string) => `${name}\n${body}`.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  return <main className="min-h-dvh bg-background text-foreground">
    <header className="border-b border-border px-4 py-3"><div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3"><Button variant="ghost" size="sm" onClick={() => location.assign("/doc")}>Return to writing room</Button><h1 className="font-heading text-xl">{project?.project.title || "Offline project"}</h1><Button variant="outline" size="sm" onClick={backup}>Download device backup</Button></div></header>
    <div className="mx-auto max-w-6xl space-y-3 px-4 py-3"><p role="status" className="text-sm text-muted-foreground">{storageIssue ? "Device drafts could not be read. Download a backup before editing. " : ""}{message}</p><p className="text-sm text-muted-foreground">Bookmark this address to reopen offline. Device copies are accessible to anyone using this browser; clearing site data removes them.</p></div>
    {project ? <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-8 md:grid-cols-4">
      <aside className="space-y-3"><Input aria-label="Search offline pieces" placeholder="Search pieces" value={search} onChange={event => setSearch(event.target.value)} />
        <Button variant="outline" size="sm" onClick={newPiece}>New offline piece</Button>
        <p className="text-sm font-medium">Downloaded originals</p>{search && !project.entries.some(entry => matching(entry.title,entry.body)) && !queued.some(draft => draft.projectId === projectId && matching(draft.content.title,draft.content.body)) ? <p className="text-sm text-muted-foreground">No pieces match this search.</p> : null}
        {project.entries.slice().sort((a,b) => a.position-b.position).filter(entry => matching(entry.title, entry.body)).map(entry => <div key={entry.id} className="space-y-1"><Button variant="nav" size="sm" className="w-full justify-start" onClick={() => select(entry)}>{entry.title || "Untitled"}</Button><div className="flex gap-1"><Button variant="ghost" size="xs" aria-label={`Move ${entry.title || "Untitled"} up in offline reading order`} disabled={entry.id === project.entries.slice().sort((a,b) => a.position-b.position)[0]?.id} onClick={() => reorder(entry.id,-1)}>Move up</Button><Button variant="ghost" size="xs" aria-label={`Move ${entry.title || "Untitled"} down in offline reading order`} disabled={entry.id === project.entries.slice().sort((a,b) => a.position-b.position).at(-1)?.id} onClick={() => reorder(entry.id,1)}>Move down</Button></div></div>)}
        <p className="text-sm font-medium">Offline copies</p>{queued.filter(draft => draft.projectId === projectId && matching(draft.content.title, draft.content.body)).map(draft => <Button key={draft.id} variant="nav" size="sm" className="w-full justify-start" onClick={() => openCopy(draft)}>{draft.content.title || "Untitled"}</Button>)}
        <p className="text-sm font-medium">Other downloads</p>{downloads.filter(item => item.id !== projectId).map(item => <a key={item.id} className="block text-sm text-primary underline" href={offlineProjectUrl(account,item.id)} onClick={event => { event.preventDefault(); location.assign(offlineProjectUrl(account,item.id)); location.reload(); }}>{item.title || "Untitled project"}</a>)}
        <Button variant="ghost" size="sm" onClick={() => { try { localStorage.removeItem(offlineProjectKey(account,projectId)); setProject(null); setDoc(null); setMessage("Downloaded original removed. Unsaved copies remain on this device until they sync."); } catch { setMessage("The downloaded original could not be removed."); } }}>Remove download</Button>
      </aside>
      <section className="min-w-0 space-y-3 md:col-span-3" aria-label="Offline writing">
        {doc ? <><Input aria-label="Piece title" value={title} readOnly={!copyId} onChange={event => { setTitle(event.target.value); if (copyId) save(doc,event.target.value,copyId); }} />
          {!copyId ? <Button variant="outline" size="sm" disabled={invalidRich} onClick={beginCopy}>Edit a separate rich copy</Button> : <div className="flex flex-wrap gap-2" aria-label="Offline formatting"><Button variant="outline" size="sm" disabled={!activeEditor} onClick={() => activeEditor?.chain().focus().toggleBold().run()}>Bold</Button><Button variant="outline" size="sm" disabled={!activeEditor} onClick={() => activeEditor?.chain().focus().toggleItalic().run()}>Italic</Button><Button variant="outline" size="sm" disabled={!activeEditor} onClick={() => activeEditor?.chain().focus().toggleBulletList().run()}>List</Button><Button variant="ghost" size="sm" disabled={!activeEditor} onClick={() => activeEditor?.chain().focus().undo().run()}>Undo</Button><Button variant="ghost" size="sm" disabled={!activeEditor} onClick={() => activeEditor?.chain().focus().redo().run()}>Redo</Button></div>}
          <WritingPages key={copyId ?? selected?.id} document={doc} view="draft" spellcheck readOnly={!copyId} editors={editors.current} onActiveEditor={(_,editor) => setActiveEditor(editor)} onChange={next => { setDoc(next); if (copyId) save(next,title,copyId); }} />
        </> : <p className="text-sm text-muted-foreground">Choose a downloaded piece or create an offline piece.</p>}
      </section>
    </div> : null}
  </main>;
}
createRoot(document.getElementById("offline-editor")!).render(<OfflineEditor />);
