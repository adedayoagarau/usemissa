"use client";

import Link from "next/link";
import {
  Fragment,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ArrowLeft, ChevronUp, Ellipsis, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Editor } from "@tiptap/react";
import {
  WritingPages,
  type PageEditors,
  type PagesView,
} from "@/components/missa/writing-pages";
import {
  WritingFormatBar,
  WritingFormatSheet,
} from "@/components/missa/writing-format";
import {
  CompileDialog,
  NewProjectDialog,
  projectName,
  WritingLibrary,
  WritingOutline,
  type LibraryPiece,
} from "@/components/missa/writing-library";
import {
  DEFAULT_WRITING_TYPEFACE,
  storedWritingTypeface,
  WRITING_TYPEFACE_GROUPS,
  WRITING_TYPEFACES,
  writingTypeface,
  type WritingTypefaceId,
} from "@/components/missa/writing-typefaces";
import {
  countWords,
  newWritingEntryId,
  WRITING_TITLE_MAX,
  writingPreview,
  type WritingContent,
  type WritingEntry,
  type WritingEntrySummary,
} from "@/lib/writing";
import {
  documentText,
  emptyPage,
  newDocument,
  PAGE_SIZES,
  parseWritingDocument,
  plainTextToDocument,
  serializeDocument,
  TEXT_SIZES,
  type WritingDocument,
} from "@/lib/writing-document";
import {
  compileProject,
  compileProjectText,
  newWritingProjectId,
  type CompileOptions,
  type PieceStatus,
  type ProjectTemplateId,
  type WritingProject,
} from "@/lib/writing-projects";
import {
  browserWritingDeviceStore,
  httpWritingTransport,
  WritingSync,
  type WritingFork,
} from "@/lib/writing-sync";

export type WritingRoomProps = {
  /** Separates this account's device drafts from anyone else's in the same browser. */
  deviceKey: string;
  initialEntries: WritingEntrySummary[];
  initialProjects: WritingProject[];
  initialEntryId?: string;
  storage: "account" | "device";
  listFailed: boolean;
};

type Current = {
  id: string;
  title: string;
  /** The project the piece is in; null for a loose piece. */
  projectId: string | null;
  doc: WritingDocument;
  /** Changes when a different entry is opened, so its pages are rebuilt. */
  mount: number;
  state: "ready" | "opening" | "failed";
};
type Notice =
  | { kind: "conflict" | "not-found"; otherId: string }
  | { kind: "open-failed"; id: string }
  | { kind: "missing" };
type Prefs = {
  /** The typeface new pieces start in. */
  typeface: WritingTypefaceId;
  spellcheck: boolean;
  minutes: number;
  view: PagesView | null;
};

const PREFS_KEY = "missa.write.prefs.v1";
const DEFAULT_PREFS: Prefs = {
  typeface: DEFAULT_WRITING_TYPEFACE,
  spellcheck: false,
  minutes: 15,
  view: null,
};
const TIMER_LENGTHS = [5, 10, 15, 20, 25, 30, 45, 60];

let mounts = 0;

function opened(
  id: string,
  content: WritingContent | null,
  typeface: string,
  state: Current["state"] = "ready",
  projectId: string | null = null,
): Current {
  const doc =
    (content?.document ? parseWritingDocument(content.document) : null) ??
    (content?.body
      ? plainTextToDocument(content.body, typeface)
      : newDocument(typeface));
  mounts += 1;
  return {
    id,
    title: content?.title ?? "",
    projectId,
    doc,
    mount: mounts,
    state,
  };
}

function contentOf(current: Current): WritingContent {
  return {
    title: current.title,
    body: documentText(current.doc),
    document: serializeDocument(current.doc),
  };
}

function readPrefs(): Prefs {
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(PREFS_KEY) ?? "{}",
    );
    const field = (name: string) =>
      raw && typeof raw === "object" ? Reflect.get(raw, name) : undefined;
    const minutes = field("minutes");
    const view = field("view");
    return {
      typeface: storedWritingTypeface(field("typeface")),
      view: view === "page" || view === "draft" ? view : null,
      spellcheck: field("spellcheck") === true,
      minutes: TIMER_LENGTHS.includes(minutes as number)
        ? (minutes as number)
        : DEFAULT_PREFS.minutes,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are a convenience; the room works without them.
  }
}

function clock(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function wordLabel(words: number) {
  return `${words.toLocaleString()} ${words === 1 ? "word" : "words"}`;
}

function localDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, "0")}`;
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function summaryOf(entry: WritingEntry): WritingEntrySummary {
  const { body: _body, document: _document, ...summary } = entry;
  return summary;
}

async function requestJson(
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
    const data: unknown = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      data:
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {},
    };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

function errorOf(data: Record<string, unknown>, fallback: string) {
  return typeof data.error === "string" ? data.error : fallback;
}

function subscribeFullscreen(listener: () => void) {
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
}

/**
 * The writing room (/write): a blank page, a timer, and nothing else. Text is
 * kept on the device as it is typed and saved to the creator's account. Missa
 * adds nothing to the writing: no suggestions, no rewriting, no analysis.
 */
export function WritingRoom({
  deviceKey,
  initialEntries,
  initialProjects,
  initialEntryId,
  storage,
  listFailed,
}: WritingRoomProps) {
  const [sync] = useState(
    () =>
      new WritingSync({
        transport: httpWritingTransport,
        device: browserWritingDeviceStore(`missa.write.drafts.v1:${deviceKey}`),
      }),
  );
  const [prefs, setPrefs] = useState(readPrefs);
  const [current, setCurrent] = useState<Current>(() => {
    const drafts = sync.load();
    if (initialEntryId) {
      const draft = drafts.find((item) => item.id === initialEntryId);
      const known = initialEntries.find((item) => item.id === initialEntryId);
      return draft
        ? opened(
            draft.id,
            draft.content,
            prefs.typeface,
            "ready",
            draft.projectId ?? known?.projectId ?? null,
          )
        : opened(
            initialEntryId,
            null,
            prefs.typeface,
            "opening",
            known?.projectId ?? null,
          );
    }
    const latest = drafts[0];
    return latest
      ? opened(
          latest.id,
          latest.content,
          prefs.typeface,
          "ready",
          latest.projectId ??
            initialEntries.find((item) => item.id === latest.id)?.projectId ??
            null,
        )
      : opened(newWritingEntryId(), null, prefs.typeface);
  });
  const [entries, setEntries] = useState(initialEntries);
  const [projects, setProjects] = useState(initialProjects);
  const [libraryProject, setLibraryProject] = useState<string | null>(null);
  const [newProject, setNewProject] = useState<{
    open: boolean;
    busy: boolean;
    error: string;
  }>({ open: false, busy: false, error: "" });
  const [outlineProject, setOutlineProject] = useState<string | null>(null);
  const [compileState, setCompileState] = useState<{
    projectId: string | null;
    busy: boolean;
    error: string;
  }>({ projectId: null, busy: false, error: "" });
  const [compiled, setCompiled] = useState<{
    projectId: string;
    title: string;
    doc: WritingDocument;
    text: string;
  } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [view, setView] = useState<PagesView>(
    () => prefs.view ?? (window.innerWidth < 768 ? "draft" : "page"),
  );
  const [editors] = useState<PageEditors>(() => new Map());
  const [compiledEditors] = useState<PageEditors>(() => new Map());
  const [active, setActive] = useState<{
    pageId: string;
    editor: Editor;
  } | null>(null);
  const [formatOpen, setFormatOpen] = useState(false);
  const [timer, setTimer] = useState<{
    endsAt: number | null;
    remaining: number;
  }>(() => ({
    endsAt: null,
    remaining: prefs.minutes * 60_000,
  }));
  const [now, setNow] = useState(() => Date.now());
  const [timeUp, setTimeUp] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pageDeleteOpen, setPageDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [exportError, setExportError] = useState("");
  const [focusTick, setFocusTick] = useState(0);
  const initialOpen = useRef(current.state === "opening" ? current.id : null);

  const syncState = useSyncExternalStore(
    sync.subscribe,
    sync.snapshot,
    sync.snapshot,
  );
  const fullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(document.fullscreenElement),
    () => false,
  );
  const canFullscreen =
    typeof document !== "undefined" && document.fullscreenEnabled;
  const face = writingTypeface(current.doc.typeface);
  const deferredDoc = useDeferredValue(current.doc);
  const body = useMemo(() => documentText(deferredDoc), [deferredDoc]);
  const words = useMemo(() => countWords(body), [body]);
  const activeIndex = Math.max(
    0,
    current.doc.pages.findIndex((page) => page.id === active?.pageId),
  );
  const inAccount = sync.saved(current.id);
  const pending = syncState.pending.includes(current.id);
  const running = timer.endsAt !== null;
  const remaining =
    timer.endsAt !== null ? Math.max(0, timer.endsAt - now) : timer.remaining;

  const loadEntry = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(
          `/api/me/writing/${encodeURIComponent(id)}`,
          {
            cache: "no-store",
          },
        );
        if (response.status === 404) {
          setCurrent((value) =>
            value.id === id
              ? opened(newWritingEntryId(), null, value.doc.typeface)
              : value,
          );
          setNotice({ kind: "missing" });
          return;
        }
        const result: unknown = await response.json();
        const entry =
          result && typeof result === "object"
            ? (Reflect.get(result, "entry") as WritingEntry)
            : undefined;
        if (!response.ok || !entry) throw new Error("Entry did not load");
        sync.adopt(entry);
        const content = sync.draft(id)?.content ?? entry;
        setCurrent((value) =>
          value.id === id
            ? opened(id, content, value.doc.typeface, "ready", entry.projectId)
            : value,
        );
        setFocusTick((tick) => tick + 1);
      } catch {
        setCurrent((value) =>
          value.id === id ? { ...value, state: "failed" } : value,
        );
        setNotice({ kind: "open-failed", id });
      }
    },
    [sync],
  );

  // Save and fork events update the list and, when needed, the open entry.
  useEffect(
    () =>
      sync.listen({
        onSaved: (entry) =>
          setEntries((list) => [
            entry,
            ...list.filter((item) => item.id !== entry.id),
          ]),
        onForked: (fork: WritingFork) => {
          setEntries((list) => {
            const rest = list.filter((item) => item.id !== fork.from);
            return fork.current ? [summaryOf(fork.current), ...rest] : rest;
          });
          setCurrent((value) =>
            value.id === fork.from ? { ...value, id: fork.to } : value,
          );
          setNotice({ kind: fork.reason, otherId: fork.from });
        },
      }),
    [sync],
  );

  // Send drafts kept from earlier visits, and keep saving through connection
  // changes, hidden tabs and closing the page.
  useEffect(() => {
    sync.flush();
    const online = () => sync.retryAll();
    const offline = () => sync.refresh();
    const visibility = () => {
      if (document.visibilityState === "hidden")
        sync.flush({ keepalive: true });
    };
    const pagehide = () => sync.flush({ keepalive: true });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!sync.unprotected()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("beforeunload", beforeUnload);
      sync.flush({ keepalive: true });
    };
  }, [sync]);

  useEffect(() => {
    const id = initialOpen.current;
    if (!id) return;
    initialOpen.current = null;
    void loadEntry(id);
  }, [loadEntry]);

  // The address names a saved entry, so a reload reopens it.
  useEffect(() => {
    const target =
      inAccount || current.state !== "ready"
        ? `/write?entry=${encodeURIComponent(current.id)}`
        : "/write";
    if (`${window.location.pathname}${window.location.search}` !== target) {
      window.history.replaceState(window.history.state, "", target);
    }
  }, [current.id, current.state, inAccount]);

  useEffect(() => {
    // Pages mount a frame or two after the room; wait for the page to exist.
    let frame = 0;
    let tries = 0;
    const attempt = () => {
      const first = current.doc.pages[0]?.id;
      const editor =
        (active && editors.get(active.pageId)) ??
        (first ? editors.get(first) : undefined);
      if (editor) editor.commands.focus("end");
      else if (tries++ < 30) frame = requestAnimationFrame(attempt);
    };
    attempt();
    return () => cancelAnimationFrame(frame);
    // Focus moves only when asked, never on each change of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTick, current.mount]);

  useEffect(() => {
    if (timer.endsAt === null) return;
    const endsAt = timer.endsAt;
    const interval = setInterval(() => {
      const time = Date.now();
      if (time >= endsAt) {
        setTimer({ endsAt: null, remaining: 0 });
        setTimeUp(true);
      } else {
        setNow(time);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [timer.endsAt]);

  function updatePrefs(change: Partial<Prefs>) {
    setPrefs((value) => {
      const next = { ...value, ...change };
      writePrefs(next);
      return next;
    });
  }

  function change(next: Partial<Pick<Current, "title" | "doc">>) {
    if (current.state !== "ready") return;
    const updated = { ...current, ...next };
    setCurrent((value) =>
      value.id === current.id ? { ...value, ...next } : value,
    );
    sync.edit(current.id, contentOf(updated), current.projectId);
  }

  const changeDocument = useCallback(
    (doc: WritingDocument) => change({ doc }),
    // change reads the current entry, which this callback must follow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current],
  );

  const onActiveEditor = useCallback(
    (pageId: string, editor: Editor) => setActive({ pageId, editor }),
    [],
  );

  function addPage() {
    const pages = [...current.doc.pages];
    const at = active ? activeIndex + 1 : pages.length;
    const format = pages[Math.min(activeIndex, pages.length - 1)]!.format;
    const page = emptyPage(format);
    pages.splice(at, 0, page);
    change({ doc: { ...current.doc, pages } });
    // The new page takes focus once it is on screen.
    requestAnimationFrame(() => editors.get(page.id)?.commands.focus("start"));
  }

  function movePage(step: -1 | 1) {
    const pages = [...current.doc.pages];
    const to = activeIndex + step;
    if (to < 0 || to >= pages.length) return;
    const [page] = pages.splice(activeIndex, 1);
    pages.splice(to, 0, page!);
    change({ doc: { ...current.doc, pages } });
  }

  function deletePage() {
    if (current.doc.pages.length < 2) return;
    const pages = current.doc.pages.filter((_, index) => index !== activeIndex);
    setActive(null);
    change({ doc: { ...current.doc, pages } });
    setPageDeleteOpen(false);
  }

  function printPages() {
    setView("page");
    // Print after page view has drawn the paper.
    setTimeout(() => window.print(), 50);
  }

  function openEntry(id: string) {
    setSheetOpen(false);
    setOutlineProject(null);
    setCompiled(null);
    if (id === current.id) {
      setFocusTick((tick) => tick + 1);
      return;
    }
    setNotice(null);
    setActive(null);
    const draft = sync.draft(id);
    const projectId =
      draft?.projectId ??
      entries.find((item) => item.id === id)?.projectId ??
      null;
    if (draft) {
      setCurrent(opened(id, draft.content, prefs.typeface, "ready", projectId));
      setFocusTick((tick) => tick + 1);
      return;
    }
    setCurrent(opened(id, null, prefs.typeface, "opening", projectId));
    void loadEntry(id);
  }

  /** Starts a new piece at the end of a project. It is saved once it has words. */
  function addPiece(projectId: string) {
    setSheetOpen(false);
    setCompiled(null);
    setNotice(null);
    setActive(null);
    setCurrent(
      opened(newWritingEntryId(), null, prefs.typeface, "ready", projectId),
    );
    setFocusTick((tick) => tick + 1);
  }

  async function createProject(title: string, template: ProjectTemplateId) {
    const id = newWritingProjectId();
    setNewProject({ open: true, busy: true, error: "" });
    const result = await requestJson("/api/me/writing/projects", {
      method: "POST",
      body: JSON.stringify({ id, title, template }),
    });
    const project = result.data.project as WritingProject | undefined;
    if (!result.ok || !project) {
      setNewProject({
        open: true,
        busy: false,
        error: errorOf(
          result.data,
          "We could not create this project. Check your connection and try again.",
        ),
      });
      return;
    }
    const created = (result.data.entries as WritingEntrySummary[]) ?? [];
    setProjects((list) => [project, ...list.filter((item) => item.id !== id)]);
    setEntries((list) => [...created, ...list]);
    setNewProject({ open: false, busy: false, error: "" });
    setLibraryProject(id);
    setSheetOpen(true);
    toast.success(
      created.length
        ? `Project created with ${created.length} ${created.length === 1 ? "piece" : "pieces"}`
        : "Project created",
    );
  }

  async function renameProject(id: string, title: string) {
    const before = projects;
    setProjects((list) =>
      list.map((item) => (item.id === id ? { ...item, title } : item)),
    );
    const result = await requestJson(
      `/api/me/writing/projects/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ title }) },
    );
    if (!result.ok) {
      setProjects(before);
      toast.error(
        errorOf(result.data, "Couldn’t rename the project. Try again."),
      );
    }
  }

  async function deleteProject(id: string) {
    const result = await requestJson(
      `/api/me/writing/projects/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!result.ok && result.status !== 404) {
      toast.error(
        errorOf(
          result.data,
          "Couldn’t delete the project. It’s unchanged. Try again.",
        ),
      );
      return;
    }
    setProjects((list) => list.filter((item) => item.id !== id));
    setEntries((list) =>
      list.map((item) =>
        item.projectId === id ? { ...item, projectId: null } : item,
      ),
    );
    for (const draftId of syncState.pending) {
      if (sync.draft(draftId)?.projectId === id) sync.place(draftId, null);
    }
    if (current.projectId === id) {
      sync.place(current.id, null);
      setCurrent((value) =>
        value.projectId === id ? { ...value, projectId: null } : value,
      );
    }
    setLibraryProject(null);
    toast.success("Project deleted. Its pieces are loose pieces now.");
  }

  async function reorderPieces(projectId: string, ids: string[]) {
    const before = entries;
    const order = new Map(ids.map((id, index) => [id, index]));
    setEntries((list) =>
      list.map((item) =>
        order.has(item.id)
          ? { ...item, projectId, position: order.get(item.id)! }
          : item,
      ),
    );
    const result = await requestJson(
      `/api/me/writing/projects/${encodeURIComponent(projectId)}/pieces`,
      { method: "PUT", body: JSON.stringify({ entryIds: ids }) },
    );
    if (!result.ok) {
      setEntries(before);
      toast.error(
        errorOf(result.data, "Couldn’t save the new order. Try again."),
      );
    }
  }

  async function movePiece(id: string, projectId: string | null) {
    sync.place(id, projectId);
    if (current.id === id) {
      setCurrent((value) =>
        value.id === id ? { ...value, projectId } : value,
      );
    }
    if (!entries.some((item) => item.id === id)) return;
    const result = await requestJson(
      `/api/me/writing/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ projectId }) },
    );
    const entry = result.data.entry as WritingEntrySummary | undefined;
    if (!result.ok || !entry) {
      toast.error(errorOf(result.data, "Couldn’t move this piece. Try again."));
      return;
    }
    setEntries((list) =>
      list.map((item) => (item.id === id ? { ...item, ...entry } : item)),
    );
    const project = projects.find((item) => item.id === projectId);
    toast.success(
      project ? `Moved to ${projectName(project)}` : "Moved to loose pieces",
    );
  }

  async function changeCard(
    id: string,
    card: { synopsis?: string; status?: PieceStatus },
  ) {
    const before = entries;
    setEntries((list) =>
      list.map((item) => (item.id === id ? { ...item, ...card } : item)),
    );
    const result = await requestJson(
      `/api/me/writing/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(card) },
    );
    if (!result.ok) {
      setEntries(before);
      toast.error(
        errorOf(
          result.data,
          "Couldn’t save that. Check your connection and try again.",
        ),
      );
    }
  }

  async function compile(options: CompileOptions) {
    const projectId = compileState.projectId;
    if (!projectId) return;
    setCompileState({ projectId, busy: true, error: "" });
    const result = await requestJson(
      `/api/me/writing/projects/${encodeURIComponent(projectId)}/compile`,
      { method: "GET" },
    );
    const stored = result.data.entries as WritingEntry[] | undefined;
    const project = result.data.project as WritingProject | undefined;
    if (!result.ok || !stored || !project) {
      setCompileState({
        projectId,
        busy: false,
        error: errorOf(
          result.data,
          "We could not gather this project. Check your connection and try again.",
        ),
      });
      return;
    }
    // Words on this device that the account hasn't confirmed yet are compiled too.
    const known = new Set(stored.map((entry) => entry.id));
    const sources = [
      ...stored.map((entry) => ({
        id: entry.id,
        content: sync.draft(entry.id)?.content ?? entry,
      })),
      ...syncState.pending
        .filter(
          (id) => !known.has(id) && sync.draft(id)?.projectId === projectId,
        )
        .map((id) => ({ id, content: sync.draft(id)!.content })),
    ];
    const ordered = sources.map(({ id, content }) =>
      id === current.id
        ? contentOf(current)
        : {
            title: content.title,
            body: content.body,
            document: content.document,
          },
    );
    setCompiled({
      projectId,
      title: project.title,
      doc: compileProject(project.title, ordered, options, prefs.typeface),
      text: compileProjectText(project.title, ordered, options),
    });
    setCompileState({ projectId: null, busy: false, error: "" });
    setSheetOpen(false);
    setView("page");
  }

  function newEntry() {
    setSheetOpen(false);
    setCompiled(null);
    if (
      current.state === "ready" &&
      !body.trim() &&
      !current.title.trim() &&
      !inAccount
    ) {
      setFocusTick((tick) => tick + 1);
      return;
    }
    setNotice(null);
    setActive(null);
    setCurrent(opened(newWritingEntryId(), null, prefs.typeface));
    setFocusTick((tick) => tick + 1);
  }

  async function confirmDelete() {
    const id = current.id;
    const content = contentOf(current);
    setDeleting(true);
    setDeleteError("");
    const { existsOnServer } = await sync.discard(id);
    if (existsOnServer) {
      const response = await fetch(
        `/api/me/writing/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      ).catch(() => undefined);
      if (!response || (!response.ok && response.status !== 404)) {
        sync.restore(id);
        sync.edit(id, content);
        setDeleting(false);
        setDeleteError(
          "We could not delete this entry. It is unchanged. Try again.",
        );
        return;
      }
      sync.forget(id);
    }
    setEntries((list) => list.filter((item) => item.id !== id));
    setActive(null);
    setCurrent(opened(newWritingEntryId(), null, prefs.typeface));
    setDeleting(false);
    setDeleteOpen(false);
    setFocusTick((tick) => tick + 1);
    toast.success("Entry deleted");
  }

  function downloadEntry() {
    const created = entries.find((item) => item.id === current.id)?.createdAt;
    downloadText(
      `writing-${localDay(created ? new Date(created) : new Date())}.txt`,
      current.title ? `${current.title}\n\n${body}` : body,
    );
  }

  async function downloadAll() {
    setExportError("");
    try {
      const response = await fetch("/api/me/writing/export", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Export failed");
      downloadText(
        `missa-writing-${localDay(new Date())}.txt`,
        await response.text(),
      );
    } catch {
      setExportError("We could not prepare your download. Try again.");
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(documentText(current.doc));
      toast.success("Text copied");
    } catch {
      active?.editor.chain().focus().selectAll().run();
      toast.message("Text selected. Copy it with your keyboard.");
    }
  }

  function toggleTimer(event: MouseEvent) {
    const time = Date.now();
    setTimeUp(false);
    if (timer.endsAt !== null) {
      setTimer({ endsAt: null, remaining: Math.max(0, timer.endsAt - time) });
      return;
    }
    const length =
      timer.remaining > 0 ? timer.remaining : prefs.minutes * 60_000;
    setNow(time);
    setTimer({ endsAt: time + length, remaining: length });
    // Started with a pointer, the page takes focus so writing can begin; started
    // from the keyboard (detail 0), focus stays on the button.
    if (event.detail > 0) setFocusTick((tick) => tick + 1);
  }

  function resetTimer(minutes = prefs.minutes) {
    setTimeUp(false);
    setTimer({ endsAt: null, remaining: minutes * 60_000 });
  }

  function cycleSize() {
    const sizes: readonly number[] = TEXT_SIZES;
    const index = sizes.indexOf(current.doc.textSize);
    change({
      doc: { ...current.doc, textSize: sizes[(index + 1) % sizes.length]! },
    });
  }

  function toggleFullscreen() {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => undefined);
    else
      void document.documentElement.requestFullscreen().catch(() => undefined);
  }

  const rejection = syncState.rejected[current.id];
  const deviceOnly =
    storage === "device" || syncState.account === "unavailable";
  const status =
    current.state === "opening"
      ? "Opening…"
      : current.state === "failed"
        ? ""
        : pending
          ? syncState.account === "offline"
            ? "Offline · kept on this device"
            : syncState.account === "retrying"
              ? "Kept on this device · retrying"
              : syncState.account === "ok"
                ? "Saving…"
                : "Kept on this device"
          : inAccount
            ? "Saved"
            : "";
  const announcement = timeUp
    ? "Time’s up."
    : syncState.account === "offline" && pending
      ? "You’re offline. Your writing is kept on this device."
      : syncState.account === "signed-out"
        ? "You’re signed out. Your writing is kept on this device."
        : notice?.kind === "conflict"
          ? "This entry changed on another device. What you wrote here is saved as a separate entry."
          : notice?.kind === "not-found"
            ? "This entry was deleted on another device. What you wrote here is saved as a new entry."
            : "";
  const hideChrome =
    running && !sheetOpen && !deleteOpen && !formatOpen && !pageDeleteOpen;
  const timerLabel = running
    ? "Pause timer"
    : remaining === 0
      ? `Restart ${prefs.minutes}-minute timer`
      : remaining < prefs.minutes * 60_000
        ? "Resume timer"
        : `Start ${prefs.minutes}-minute timer`;

  const pieces = useMemo((): LibraryPiece[] => {
    const known = new Set(entries.map((item) => item.id));
    const local = syncState.pending
      .filter((id) => !known.has(id))
      .flatMap((id): LibraryPiece[] => {
        const draft = sync.draft(id);
        return draft
          ? [
              {
                id,
                title: draft.content.title,
                preview: writingPreview(draft.content.body),
                wordCount: countWords(draft.content.body),
                updatedAt: draft.updatedAt,
                projectId: draft.projectId ?? null,
                position: Number.MAX_SAFE_INTEGER,
                synopsis: "",
                status: "",
                local: true,
                open: false,
              },
            ]
          : [];
      });
    const list: LibraryPiece[] = [
      ...local,
      ...entries.map((item) => ({
        id: item.id,
        title: item.title,
        preview: item.preview,
        wordCount: item.wordCount,
        updatedAt: item.updatedAt,
        projectId: item.projectId,
        position: item.position,
        synopsis: item.synopsis,
        status: item.status,
        local: syncState.pending.includes(item.id) && !sync.saved(item.id),
        open: false,
      })),
    ];
    // The open piece shows what is on the page now, even before it is saved.
    const openIndex = list.findIndex((item) => item.id === current.id);
    const live = {
      title: current.title,
      preview: writingPreview(body),
      wordCount: words,
      projectId: current.projectId,
      open: true,
    };
    if (openIndex >= 0) list[openIndex] = { ...list[openIndex]!, ...live };
    else if (current.projectId && current.state === "ready")
      list.push({
        id: current.id,
        ...live,
        updatedAt: new Date().toISOString(),
        position: Number.MAX_SAFE_INTEGER,
        synopsis: "",
        status: "",
        local: true,
      });
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [
    entries,
    syncState.pending,
    sync,
    current.id,
    current.title,
    current.projectId,
    current.state,
    body,
    words,
  ]);
  const currentProject = projects.find(
    (project) => project.id === current.projectId,
  );

  const chrome =
    "transition-opacity duration-180 motion-reduce:transition-none data-[hidden=true]:opacity-0 data-[hidden=true]:hover:opacity-100 data-[hidden=true]:focus-within:opacity-100 data-[hidden=true]:[&:not(:hover):not(:focus-within)_*]:pointer-events-none";

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header
        data-hidden={hideChrome}
        className={`flex flex-col border-b border-border px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 sm:px-4 print:hidden ${chrome}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <Link href="/home" className={buttonVariants({ variant: "ghost" })}>
              <ArrowLeft aria-hidden="true" />
              Home
            </Link>
            {currentProject ? (
              <Button
                variant="ghost"
                className="min-w-0"
                aria-label={`Project: ${projectName(currentProject)}. Open its pieces`}
                onClick={() => {
                  setLibraryProject(currentProject.id);
                  setSheetOpen(true);
                }}
              >
                <span className="truncate">{projectName(currentProject)}</span>
              </Button>
            ) : null}
          </div>
          <Popover>
            <PopoverTrigger render={<Button variant="ghost" />}>
              <Lock aria-hidden="true" />
              Private
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <PopoverHeader>
                <PopoverTitle>Your writing stays yours</PopoverTitle>
              </PopoverHeader>
              <ul className="flex list-disc flex-col gap-2 ps-5 text-muted-foreground">
                <li>
                  Missa adds no AI here. Nothing suggests, rewrites or finishes
                  your words.
                </li>
                <li>
                  Your writing is never sent to an AI service or used to train
                  one.
                </li>
                <li>Missa’s automated systems don’t read it.</li>
                <li>Deleting an entry removes it from your account.</li>
                <li>
                  Extensions you add to your browser can still read pages you
                  open.
                </li>
              </ul>
            </PopoverContent>
          </Popover>
        </div>
        <div className={compiled ? "hidden" : "flex justify-center"}>
          <WritingFormatBar
            editor={
              active && editors.get(active.pageId) === active.editor
                ? active.editor
                : null
            }
            onOpenFormat={() => setFormatOpen(true)}
          />
        </div>
      </header>

      <main
        className="flex min-h-0 flex-1 flex-col print:block"
        onKeyDown={(event) => {
          if (
            (event.metaKey || event.ctrlKey) &&
            event.key.toLowerCase() === "s"
          ) {
            event.preventDefault();
            sync.flush();
          }
        }}
      >
        <h1 className="sr-only">Write</h1>
        <WritingNotices
          notice={notice}
          rejection={rejection}
          signedOut={syncState.account === "signed-out"}
          deviceOnly={deviceOnly}
          unprotected={!syncState.device && pending}
          listFailed={listFailed}
          onDismiss={() => setNotice(null)}
          onOpen={(id) => openEntry(id)}
          onRetry={(id) => {
            setNotice(null);
            setCurrent(opened(id, null, prefs.typeface, "opening"));
            void loadEntry(id);
          }}
          onCopy={copyText}
        />
        <div
          className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto print:overflow-visible"
          aria-busy={current.state === "opening" || undefined}
        >
          {compiled ? (
            <WritingPages
              key={`compiled-${compiled.projectId}-${compiled.doc.pages.length}`}
              document={compiled.doc}
              onChange={() => undefined}
              view={view}
              spellcheck={false}
              readOnly
              editors={compiledEditors}
              onActiveEditor={() => undefined}
              before={
                <div className="flex w-full max-w-2xl flex-col items-center gap-3 text-center print:hidden">
                  <h2 className="text-lg font-medium">
                    {compiled.title.trim() || "Untitled project"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Compiled from every piece, in order:{" "}
                    {compiled.doc.pages.length.toLocaleString()}{" "}
                    {compiled.doc.pages.length === 1 ? "page" : "pages"},{" "}
                    {wordLabel(countWords(compiled.text))}. Changes happen in
                    the pieces.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={printPages}>Print or save as PDF</Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        downloadText(
                          `${(compiled.title.trim() || "project").replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}-${localDay(new Date())}.txt`,
                          compiled.text,
                        )
                      }
                    >
                      Download as plain text
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setCompiled(null);
                        setFocusTick((tick) => tick + 1);
                      }}
                    >
                      Back to writing
                    </Button>
                  </div>
                </div>
              }
            />
          ) : (
            <WritingPages
              key={current.mount}
              document={current.doc}
              onChange={changeDocument}
              view={view}
              spellcheck={prefs.spellcheck}
              readOnly={current.state !== "ready"}
              editors={editors}
              onActiveEditor={onActiveEditor}
              before={
                <input
                  aria-label="Title"
                  placeholder={
                    current.state === "opening" ? "Opening…" : "Untitled"
                  }
                  value={current.title}
                  maxLength={WRITING_TITLE_MAX}
                  readOnly={current.state !== "ready"}
                  onChange={(event) => change({ title: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === "ArrowDown") {
                      event.preventDefault();
                      setFocusTick((tick) => tick + 1);
                    }
                  }}
                  className={`w-full max-w-2xl bg-transparent text-center text-3xl text-foreground outline-none placeholder:text-muted-foreground focus-visible:underline focus-visible:decoration-primary focus-visible:underline-offset-8 print:hidden ${face.className}`}
                />
              }
            />
          )}
        </div>
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </main>

      <footer
        data-hidden={hideChrome}
        // The compiled manuscript has its own actions; the piece's controls step aside.
        hidden={compiled !== null}
        className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 print:hidden ${chrome}`}
      >
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  aria-label={`Typeface: ${face.label}. Change typeface`}
                />
              }
            >
              {face.label}
              <ChevronUp aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-72">
              {WRITING_TYPEFACE_GROUPS.map((group, index) => (
                <Fragment key={group.id}>
                  {index ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={current.doc.typeface}
                      onValueChange={(value) => {
                        const typeface = storedWritingTypeface(value);
                        updatePrefs({ typeface });
                        change({ doc: { ...current.doc, typeface } });
                      }}
                    >
                      {WRITING_TYPEFACES.filter(
                        (option) => option.group === group.id,
                      ).map((option) => (
                        <DropdownMenuRadioItem
                          key={option.id}
                          value={option.id}
                          label={option.label}
                        >
                          <span className="flex flex-col">
                            {/* Each name is set in its own face as a preview. */}
                            <span className={`text-base ${option.className}`}>
                              {option.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {option.note}
                            </span>
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </Fragment>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  For Yoruba, Igbo and Hausa, EB Garamond and Libre Baskerville
                  draw every letter.
                </DropdownMenuLabel>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            aria-label={`Text size ${current.doc.textSize} pt. Change size`}
            onClick={cycleSize}
          >
            <span className="font-mono tabular-nums">
              {current.doc.textSize} pt
            </span>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{wordLabel(words)}</span>
          {status ? (
            <>
              <span aria-hidden="true" className="mx-1.5">
                ·
              </span>
              <span>{status}</span>
            </>
          ) : null}
        </p>

        <div className="flex flex-wrap items-center gap-1">
          <ButtonGroup>
            <Button
              variant="ghost"
              aria-label={`${timerLabel} (${clock(remaining)})`}
              onClick={toggleTimer}
            >
              <span className="font-mono tabular-nums" aria-hidden="true">
                {clock(remaining)}
              </span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Timer length"
                  />
                }
              >
                <ChevronUp aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Timer length</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={String(prefs.minutes)}
                    onValueChange={(value) => {
                      const minutes = Number(value);
                      updatePrefs({ minutes });
                      resetTimer(minutes);
                    }}
                  >
                    {TIMER_LENGTHS.map((minutes) => (
                      <DropdownMenuRadioItem
                        key={minutes}
                        value={String(minutes)}
                      >
                        {minutes} minutes
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => resetTimer()}>
                  Reset timer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
          {canFullscreen ? (
            // On narrow screens full screen moves into More, keeping the bar to two rows.
            <Button
              variant="ghost"
              className="hidden sm:inline-flex"
              onClick={toggleFullscreen}
            >
              {fullscreen ? "Exit full screen" : "Full screen"}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={newEntry}>
            New entry
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setLibraryProject(current.projectId);
              setSheetOpen(true);
            }}
          >
            Library
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label="More" />}
            >
              <Ellipsis aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  Page {activeIndex + 1} of {current.doc.pages.length}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  disabled={current.state !== "ready"}
                  onClick={addPage}
                >
                  Add a page after this one
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={current.state !== "ready" || activeIndex === 0}
                  onClick={() => movePage(-1)}
                >
                  Move page earlier
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={
                    current.state !== "ready" ||
                    activeIndex >= current.doc.pages.length - 1
                  }
                  onClick={() => movePage(1)}
                >
                  Move page later
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={
                    current.state !== "ready" || current.doc.pages.length < 2
                  }
                  onClick={() => setPageDeleteOpen(true)}
                >
                  Delete this page…
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>View</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={view}
                  onValueChange={(value) => {
                    const next = value === "draft" ? "draft" : "page";
                    setView(next);
                    updatePrefs({ view: next });
                  }}
                >
                  <DropdownMenuRadioItem value="page">
                    Printed pages
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="draft">
                    Draft, no paper
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={printPages}>
                Print or save as PDF
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!body} onClick={downloadEntry}>
                Download as plain text
              </DropdownMenuItem>
              {canFullscreen ? (
                <DropdownMenuItem
                  className="sm:hidden"
                  onClick={toggleFullscreen}
                >
                  {fullscreen ? "Exit full screen" : "Full screen"}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuCheckboxItem
                checked={prefs.spellcheck}
                onCheckedChange={(checked) =>
                  updatePrefs({ spellcheck: checked })
                }
              >
                Check spelling
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={current.state !== "ready" || (!body && !inAccount)}
                onClick={() => {
                  setDeleteError("");
                  setDeleteOpen(true);
                }}
              >
                Delete entry…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </footer>

      <WritingLibrary
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClosed={() => setFocusTick((tick) => tick + 1)}
        deviceOnly={deviceOnly}
        projects={projects}
        pieces={pieces}
        projectId={libraryProject}
        onShowProject={setLibraryProject}
        onOpenPiece={openEntry}
        onNewProject={() =>
          setNewProject({ open: true, busy: false, error: "" })
        }
        onAddPiece={addPiece}
        onReorder={(projectId, ids) => void reorderPieces(projectId, ids)}
        onMovePiece={(id, projectId) => void movePiece(id, projectId)}
        onRenameProject={(id, title) => void renameProject(id, title)}
        onDeleteProject={(id) => void deleteProject(id)}
        onCompile={(id) =>
          setCompileState({ projectId: id, busy: false, error: "" })
        }
        onOutline={setOutlineProject}
        onDownloadAll={() => void downloadAll()}
        exportError={exportError}
      />

      <NewProjectDialog
        // A fresh form each time it opens.
        key={newProject.open ? "new-project-open" : "new-project-closed"}
        open={newProject.open}
        onOpenChange={(open) => setNewProject({ open, busy: false, error: "" })}
        busy={newProject.busy}
        error={newProject.error}
        onCreate={(title, template) => void createProject(title, template)}
      />

      <WritingOutline
        open={outlineProject !== null}
        onOpenChange={(open) => {
          if (!open) setOutlineProject(null);
        }}
        project={projects.find((project) => project.id === outlineProject)}
        pieces={pieces}
        onCard={(id, card) => void changeCard(id, card)}
        onOpenPiece={openEntry}
      />

      <CompileDialog
        key={compileState.projectId ?? "compile-closed"}
        open={compileState.projectId !== null}
        onOpenChange={(open) => {
          if (!open)
            setCompileState({ projectId: null, busy: false, error: "" });
        }}
        project={projects.find(
          (project) => project.id === compileState.projectId,
        )}
        busy={compileState.busy}
        error={compileState.error}
        defaultPageSize={current.doc.pageSize}
        onCompile={(options) => void compile(options)}
      />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteOpen(open);
        }}
      >
        <AlertDialogContent
          finalFocus={() => {
            setFocusTick((tick) => tick + 1);
            return false;
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {current.title.trim() || body.trim()
                ? `“${current.title.trim() || writingPreview(body, 60)}” will be deleted from your account. You can’t undo this.`
                : "This entry will be deleted from your account. You can’t undo this."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              aria-busy={deleting || undefined}
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Deleting…" : "Delete entry"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pageDeleteOpen} onOpenChange={setPageDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete page {activeIndex + 1}?</AlertDialogTitle>
            <AlertDialogDescription>
              Everything on this page is deleted with it. Undo can’t bring a
              page back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={deletePage}>
              Delete page
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WritingFormatSheet
        open={formatOpen}
        onOpenChange={setFormatOpen}
        document={current.doc}
        pageIndex={activeIndex}
        onDocumentChange={(doc) => change({ doc })}
      />

      {/* Printing draws each page on its own sheet of the chosen paper. */}
      <style>{`@page { size: ${PAGE_SIZES[(compiled?.doc ?? current.doc).pageSize].width}mm ${PAGE_SIZES[(compiled?.doc ?? current.doc).pageSize].height}mm; margin: 0; }
@media print { [data-slot="writing-page"] { zoom: 1 !important; break-after: page; } }`}</style>
    </div>
  );
}

function WritingNotices({
  notice,
  rejection,
  signedOut,
  deviceOnly,
  unprotected,
  listFailed,
  onDismiss,
  onOpen,
  onRetry,
  onCopy,
}: {
  notice: Notice | null;
  rejection?: string;
  signedOut: boolean;
  deviceOnly: boolean;
  unprotected: boolean;
  listFailed: boolean;
  onDismiss: () => void;
  onOpen: (id: string) => void;
  onRetry: (id: string) => void;
  onCopy: () => void;
}) {
  const alerts: ReactNode[] = [];
  if (unprotected) {
    alerts.push(
      <Alert key="unprotected" variant="destructive">
        <AlertTitle>Your writing isn’t saved yet</AlertTitle>
        <AlertDescription>
          Copy it somewhere safe before you close this page.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onCopy}>
            Copy text
          </Button>
        </AlertAction>
      </Alert>,
    );
  }
  if (rejection) {
    alerts.push(
      <Alert key="rejected" variant="destructive">
        <AlertTitle>This entry can’t be saved</AlertTitle>
        <AlertDescription>{rejection}</AlertDescription>
      </Alert>,
    );
  }
  if (signedOut) {
    alerts.push(
      <Alert key="signed-out">
        <AlertTitle>You’re signed out</AlertTitle>
        <AlertDescription>
          Your writing is kept on this device. Sign in to save it to your
          account.
        </AlertDescription>
        <AlertAction>
          <Link
            href="/login?next=/write"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Sign in
          </Link>
        </AlertAction>
      </Alert>,
    );
  } else if (deviceOnly) {
    alerts.push(
      <Alert key="device-only">
        <AlertTitle>Saving to your account isn’t available here</AlertTitle>
        <AlertDescription>
          Your writing is kept in this browser only.
        </AlertDescription>
      </Alert>,
    );
  }
  if (notice?.kind === "conflict" || notice?.kind === "not-found") {
    alerts.push(
      <Alert key="fork">
        <AlertTitle>
          {notice.kind === "conflict"
            ? "This entry changed on another device"
            : "This entry was deleted on another device"}
        </AlertTitle>
        <AlertDescription>
          {notice.kind === "conflict"
            ? "What you wrote here is saved as a separate entry."
            : "What you wrote here is saved as a new entry."}
        </AlertDescription>
        <AlertAction>
          <div className="flex gap-1">
            {notice.kind === "conflict" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpen(notice.otherId)}
              >
                Open other version
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </AlertAction>
      </Alert>,
    );
  }
  if (notice?.kind === "open-failed") {
    alerts.push(
      <Alert key="open-failed" variant="destructive">
        <AlertTitle>This entry didn’t open</AlertTitle>
        <AlertDescription>
          Check your connection and try again.
        </AlertDescription>
        <AlertAction>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRetry(notice.id)}
          >
            Try again
          </Button>
        </AlertAction>
      </Alert>,
    );
  }
  if (notice?.kind === "missing") {
    alerts.push(
      <Alert key="missing">
        <AlertTitle>That entry isn’t in your account</AlertTitle>
        <AlertDescription>
          It may have been deleted. You’re on a new entry.
        </AlertDescription>
        <AlertAction>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        </AlertAction>
      </Alert>,
    );
  }
  if (listFailed) {
    alerts.push(
      <Alert key="list-failed">
        <AlertTitle>Earlier entries didn’t load</AlertTitle>
        <AlertDescription>
          New writing still saves. Reload the page to see earlier entries.
        </AlertDescription>
      </Alert>,
    );
  }
  if (!alerts.length) return null;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 pt-2">
      {alerts}
    </div>
  );
}
