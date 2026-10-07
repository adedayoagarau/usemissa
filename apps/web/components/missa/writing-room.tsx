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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  WRITING_TEXT_SIZES,
  WritingSurface,
  type WritingTextSize,
} from "@/components/missa/writing-surface";
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
  WRITING_BODY_MAX,
  writingPreview,
  type WritingEntry,
  type WritingEntrySummary,
} from "@/lib/writing";
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
  initialEntryId?: string;
  storage: "account" | "device";
  listFailed: boolean;
};

type Current = {
  id: string;
  body: string;
  state: "ready" | "opening" | "failed";
};
type Notice =
  | { kind: "conflict" | "not-found"; otherId: string }
  | { kind: "open-failed"; id: string }
  | { kind: "missing" };
type Prefs = {
  typeface: WritingTypefaceId;
  size: WritingTextSize;
  spellcheck: boolean;
  minutes: number;
};

const PREFS_KEY = "missa.write.prefs.v1";
const DEFAULT_PREFS: Prefs = {
  typeface: DEFAULT_WRITING_TYPEFACE,
  size: 20,
  spellcheck: false,
  minutes: 15,
};
const TIMER_LENGTHS = [5, 10, 15, 20, 25, 30, 45, 60];
const PLACEHOLDERS = ["Begin writing", "Pick a thought and go", "Start typing"];

function readPrefs(): Prefs {
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(PREFS_KEY) ?? "{}",
    );
    const field = (name: string) =>
      raw && typeof raw === "object" ? Reflect.get(raw, name) : undefined;
    const size = field("size");
    const minutes = field("minutes");
    return {
      typeface: storedWritingTypeface(field("typeface")),
      size: (WRITING_TEXT_SIZES as readonly unknown[]).includes(size)
        ? (size as WritingTextSize)
        : DEFAULT_PREFS.size,
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

function entryDate(iso: string) {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  }).format(date);
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
  return {
    id: entry.id,
    preview: entry.preview,
    wordCount: entry.wordCount,
    revision: entry.revision,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
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
  const [current, setCurrent] = useState<Current>(() => {
    const drafts = sync.load();
    if (initialEntryId) {
      const draft = drafts.find((item) => item.id === initialEntryId);
      return draft
        ? { id: draft.id, body: draft.body, state: "ready" }
        : { id: initialEntryId, body: "", state: "opening" };
    }
    const latest = drafts[0];
    return latest
      ? { id: latest.id, body: latest.body, state: "ready" }
      : { id: newWritingEntryId(), body: "", state: "ready" };
  });
  const [entries, setEntries] = useState(initialEntries);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [prefs, setPrefs] = useState(readPrefs);
  const [placeholder] = useState(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
  );
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
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [exportError, setExportError] = useState("");
  const [focusTick, setFocusTick] = useState(0);
  const surface = useRef<HTMLTextAreaElement>(null);
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
  const face = writingTypeface(prefs.typeface);
  const deferredBody = useDeferredValue(current.body);
  const words = useMemo(() => countWords(deferredBody), [deferredBody]);
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
              ? { id: newWritingEntryId(), body: "", state: "ready" }
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
        const body = sync.draft(id)?.body ?? entry.body;
        setCurrent((value) =>
          value.id === id ? { id, body, state: "ready" } : value,
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
    const element = surface.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    element.setSelectionRange(element.value.length, element.value.length);
  }, [focusTick]);

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

  function edit(body: string) {
    if (current.state !== "ready") return;
    setCurrent((value) => ({ ...value, body }));
    sync.edit(current.id, body);
  }

  function openEntry(id: string) {
    setSheetOpen(false);
    if (id === current.id) {
      setFocusTick((tick) => tick + 1);
      return;
    }
    setNotice(null);
    const draft = sync.draft(id);
    if (draft) {
      setCurrent({ id, body: draft.body, state: "ready" });
      setFocusTick((tick) => tick + 1);
      return;
    }
    setCurrent({ id, body: "", state: "opening" });
    void loadEntry(id);
  }

  function newEntry() {
    setSheetOpen(false);
    if (current.state === "ready" && !current.body.trim() && !inAccount) {
      setFocusTick((tick) => tick + 1);
      return;
    }
    setNotice(null);
    setCurrent({ id: newWritingEntryId(), body: "", state: "ready" });
    setFocusTick((tick) => tick + 1);
  }

  async function confirmDelete() {
    const id = current.id;
    const body = current.body;
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
        sync.edit(id, body);
        setDeleting(false);
        setDeleteError(
          "We could not delete this entry. It is unchanged. Try again.",
        );
        return;
      }
      sync.forget(id);
    }
    setEntries((list) => list.filter((item) => item.id !== id));
    setCurrent({ id: newWritingEntryId(), body: "", state: "ready" });
    setDeleting(false);
    setDeleteOpen(false);
    setFocusTick((tick) => tick + 1);
    toast.success("Entry deleted");
  }

  function downloadEntry() {
    const created = entries.find((item) => item.id === current.id)?.createdAt;
    downloadText(
      `writing-${localDay(created ? new Date(created) : new Date())}.txt`,
      current.body,
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
      await navigator.clipboard.writeText(current.body);
      toast.success("Text copied");
    } catch {
      const element = surface.current;
      element?.focus();
      element?.select();
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
    const index = WRITING_TEXT_SIZES.indexOf(prefs.size);
    updatePrefs({
      size: WRITING_TEXT_SIZES[(index + 1) % WRITING_TEXT_SIZES.length],
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
  const hideChrome = running && !sheetOpen && !deleteOpen;
  const timerLabel = running
    ? "Pause timer"
    : remaining === 0
      ? `Restart ${prefs.minutes}-minute timer`
      : remaining < prefs.minutes * 60_000
        ? "Resume timer"
        : `Start ${prefs.minutes}-minute timer`;

  const rows = useMemo(() => {
    const known = new Set(entries.map((item) => item.id));
    const local = syncState.pending
      .filter((id) => !known.has(id))
      .flatMap((id) => {
        const draft = sync.draft(id);
        return draft
          ? [
              {
                id,
                preview: writingPreview(draft.body),
                wordCount: countWords(draft.body),
                revision: 0,
                createdAt: draft.updatedAt,
                updatedAt: draft.updatedAt,
              },
            ]
          : [];
      });
    return [...local, ...entries].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [entries, syncState.pending, sync]);

  const chrome =
    "transition-opacity duration-180 motion-reduce:transition-none data-[hidden=true]:opacity-0 data-[hidden=true]:hover:opacity-100 data-[hidden=true]:focus-within:opacity-100 data-[hidden=true]:[&:not(:hover):not(:focus-within)_*]:pointer-events-none";

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header
        data-hidden={hideChrome}
        className={`flex items-center justify-between gap-2 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 ${chrome}`}
      >
        <Link href="/home" className={buttonVariants({ variant: "ghost" })}>
          <ArrowLeft aria-hidden="true" />
          Home
        </Link>
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
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
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
            setCurrent({ id, body: "", state: "opening" });
            void loadEntry(id);
          }}
          onCopy={copyText}
        />
        <div className="min-h-0 flex-1">
          <WritingSurface
            ref={surface}
            aria-label="Writing"
            aria-busy={current.state === "opening" || undefined}
            typeface={prefs.typeface}
            size={prefs.size}
            value={current.body}
            readOnly={current.state !== "ready"}
            placeholder={current.state === "opening" ? "Opening…" : placeholder}
            spellCheck={prefs.spellcheck}
            maxLength={WRITING_BODY_MAX}
            onChange={(event) => edit(event.target.value)}
            onKeyDown={(event) => {
              if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === "s"
              ) {
                event.preventDefault();
                sync.flush();
              }
            }}
          />
        </div>
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </main>

      <footer
        data-hidden={hideChrome}
        className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 ${chrome}`}
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
                      value={prefs.typeface}
                      onValueChange={(value) =>
                        updatePrefs({ typeface: storedWritingTypeface(value) })
                      }
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
            aria-label={`Text size ${prefs.size}px. Change size`}
            onClick={cycleSize}
          >
            <span className="font-mono tabular-nums">{prefs.size}px</span>
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
              setSheetOpen(true);
            }}
          >
            Entries
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label="More" />}
            >
              <Ellipsis aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56">
              <DropdownMenuItem
                disabled={!current.body}
                onClick={downloadEntry}
              >
                Download this entry
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
                disabled={
                  current.state !== "ready" || (!current.body && !inAccount)
                }
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          // Closing the list returns to the page, so writing can go on at once.
          finalFocus={surface}
        >
          <SheetHeader variant="section">
            <SheetTitle>Your writing</SheetTitle>
            <SheetDescription>
              {deviceOnly
                ? "Entries kept in this browser."
                : `${rows.length.toLocaleString()} ${rows.length === 1 ? "entry" : "entries"}, newest first.`}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {rows.length ? (
              <ItemGroup>
                {rows.map((row) => {
                  const open = row.id === current.id;
                  const preview = open
                    ? writingPreview(current.body)
                    : row.preview;
                  const count = open ? words : row.wordCount;
                  const local =
                    syncState.pending.includes(row.id) && !sync.saved(row.id);
                  return (
                    <div role="listitem" key={row.id}>
                      <Item
                        render={
                          <a
                            href={`/write?entry=${encodeURIComponent(row.id)}`}
                            aria-current={open ? "true" : undefined}
                            onClick={(event) => {
                              if (
                                event.metaKey ||
                                event.ctrlKey ||
                                event.shiftKey ||
                                event.button !== 0
                              )
                                return;
                              event.preventDefault();
                              openEntry(row.id);
                            }}
                          />
                        }
                      >
                        <ItemContent>
                          <ItemTitle>{preview || "Empty entry"}</ItemTitle>
                          <ItemDescription>
                            {entryDate(row.updatedAt)} · {wordLabel(count)}
                            {open ? " · Open now" : ""}
                            {local ? " · Not saved to your account yet" : ""}
                          </ItemDescription>
                        </ItemContent>
                      </Item>
                    </div>
                  );
                })}
              </ItemGroup>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No entries yet</EmptyTitle>
                  <EmptyDescription>
                    Start writing and your entry appears here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
          {!deviceOnly && entries.length ? (
            <SheetFooter>
              <Button variant="outline" onClick={() => void downloadAll()}>
                Download all
              </Button>
              {exportError ? (
                <p className="text-sm text-destructive">{exportError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  One plain text file, oldest entry first.
                </p>
              )}
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteOpen(open);
        }}
      >
        <AlertDialogContent finalFocus={surface}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {current.body.trim()
                ? `“${writingPreview(current.body, 60)}” will be deleted from your account. You can’t undo this.`
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
