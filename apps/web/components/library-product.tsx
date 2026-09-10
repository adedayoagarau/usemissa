"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TaxonomyBrowsePicker } from "@/components/taxonomy-browse-picker";
import { captureProductEvent } from "@/components/analytics-provider";
import styles from "./library-product.module.css";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NativeSelect } from "@/components/ui/native-select";
import {
  LibraryMaterialSheet,
  type LibrarySelection,
} from "@/components/missa/library-material-sheet";

export type LibraryProductView = "works" | "files" | "answers";
export type LibraryProductSort = "updated" | "title";

export type LibraryProductTerm = {
  termId: string;
  label: string;
  facet: string;
};

export type LibraryProductWork = {
  id: string;
  revision?: number;
  title: string;
  description?: string;
  updatedAt: string;
  file?: {
    id: string;
    filename: string;
    contentType: string;
    byteLength: number;
  };
  terms: LibraryProductTerm[];
  trackerCount: number;
  checklistCount: number;
};

export type LibraryProductFile = {
  id: string;
  revision?: number;
  filename: string;
  contentType: string;
  byteLength: number;
  createdAt: string;
  linkedWorks: Array<{ id: string; title: string }>;
  checklistCount: number;
};

export type LibraryProductAnswer = {
  id: string;
  revision?: number;
  name: string;
  body: string;
  updatedAt: string;
  checklistCount: number;
};

type DeleteTarget =
  | {
      kind: "file";
      id: string;
      revision?: number;
      name: string;
      linkedWorks: number;
      checklists: number;
    }
  | {
      kind: "answer";
      id: string;
      revision?: number;
      name: string;
      linkedWorks: 0;
      checklists: number;
    };

type Props = {
  works: LibraryProductWork[];
  files: LibraryProductFile[];
  answers: LibraryProductAnswer[];
  initialView: LibraryProductView;
  initialSort: LibraryProductSort;
  initialQuery: string;
  storageReady: boolean;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function words(value: string): number {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function FileGlyph({ contentType }: { contentType: string }) {
  if (contentType.startsWith("image/")) return <FileImage aria-hidden="true" />;
  if (contentType.startsWith("audio/")) return <FileAudio aria-hidden="true" />;
  if (contentType.startsWith("video/")) return <FileVideo aria-hidden="true" />;
  if (contentType === "application/pdf" || contentType.startsWith("text/"))
    return <FileText aria-hidden="true" />;
  return <File aria-hidden="true" />;
}

export function LibraryProduct({
  works,
  files,
  answers,
  initialView,
  initialSort,
  initialQuery,
  storageReady,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selection, setSelection] = useState<LibrarySelection | null>(null);
  const [view, setViewState] = useState(initialView);
  const [sort, setSortState] = useState(initialSort);
  const [query, setQuery] = useState(initialQuery);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setViewState(initialView);
      setSortState(initialSort);
      setQuery(initialQuery);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialView, initialSort, initialQuery]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [workTitle, setWorkTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [workFileId, setWorkFileId] = useState("");
  const [workTermIds, setWorkTermIds] = useState<string[]>([]);
  const [answerName, setAnswerName] = useState("");
  const [answerBody, setAnswerBody] = useState("");
  const [uploadFile, setUploadFile] = useState<File>();

  function writeUrl(next: {
    view?: LibraryProductView;
    sort?: LibraryProductSort;
    q?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextView = next.view ?? view;
    const nextSort = next.sort ?? sort;
    const nextQuery = next.q ?? query;
    if (nextView === "works") params.delete("view");
    else params.set("view", nextView);
    if (nextSort === "updated") params.delete("sort");
    else params.set("sort", nextSort);
    if (nextQuery.trim()) params.set("q", nextQuery.trim().slice(0, 200));
    else params.delete("q");
    const value = params.toString();
    router.replace(value ? `/library?${value}` : "/library", { scroll: false });
  }

  function setView(next: LibraryProductView) {
    setViewState(next);
    setError(undefined);
    writeUrl({ view: next });
  }

  function setSort(next: LibraryProductSort) {
    setSortState(next);
    writeUrl({ sort: next });
  }

  const needle = query.trim().toLocaleLowerCase();
  const visibleWorks = useMemo(() => {
    const filtered = needle
      ? works.filter((work) =>
          `${work.title} ${work.description ?? ""} ${work.file?.filename ?? ""} ${work.terms.map((term) => term.label).join(" ")}`
            .toLocaleLowerCase()
            .includes(needle),
        )
      : works;
    return [...filtered].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [needle, sort, works]);
  const visibleFiles = useMemo(() => {
    const filtered = needle
      ? files.filter((file) =>
          file.filename.toLocaleLowerCase().includes(needle),
        )
      : files;
    return [...filtered].sort((a, b) =>
      sort === "title"
        ? a.filename.localeCompare(b.filename)
        : b.createdAt.localeCompare(a.createdAt),
    );
  }, [files, needle, sort]);
  const visibleAnswers = useMemo(() => {
    const filtered = needle
      ? answers.filter((answer) =>
          answer.name.toLocaleLowerCase().includes(needle),
        )
      : answers;
    return [...filtered].sort((a, b) =>
      sort === "title"
        ? a.name.localeCompare(b.name)
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [answers, needle, sort]);

  const count =
    view === "works"
      ? visibleWorks.length
      : view === "files"
        ? visibleFiles.length
        : visibleAnswers.length;
  const total =
    view === "works"
      ? works.length
      : view === "files"
        ? files.length
        : answers.length;
  const createLabel =
    view === "works"
      ? "New work"
      : view === "files"
        ? "Upload file"
        : "New text";

  async function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setStatus(undefined);
    try {
      let response: Response;
      if (view === "works") {
        response = await fetch("/api/me/library/works", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            title: workTitle,
            description: workDescription,
            fileId: workFileId || undefined,
            taxonomyTermIds: workTermIds,
          }),
        });
      } else if (view === "answers") {
        response = await fetch("/api/me/library/saved-answers", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ name: answerName, body: answerBody }),
        });
      } else {
        const data = new FormData();
        if (uploadFile) data.append("file", uploadFile);
        response = await fetch("/api/me/library/files", {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: data,
        });
      }
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(body.error ?? "We could not update your Library.");
      if (view === "works")
        captureProductEvent("work_taxonomy_saved", {
          taxonomyTermCount: workTermIds.length,
        });
      setCreateOpen(false);
      setWorkTitle("");
      setWorkDescription("");
      setWorkFileId("");
      setWorkTermIds([]);
      setAnswerName("");
      setAnswerBody("");
      setUploadFile(undefined);
      setStatus(
        view === "works"
          ? "Work created."
          : view === "files"
            ? "File uploaded."
            : "Saved Answer created.",
      );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not update your Library.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(undefined);
    try {
      const path =
        deleteTarget.kind === "file"
          ? `/api/me/library/files/${encodeURIComponent(deleteTarget.id)}`
          : `/api/me/library/saved-answers/${encodeURIComponent(deleteTarget.id)}`;
      const response = await fetch(path, {
        method: "DELETE",
        headers: deleteTarget.revision
          ? {
              "content-type": "application/json",
              "Idempotency-Key": crypto.randomUUID(),
            }
          : undefined,
        body: deleteTarget.revision
          ? JSON.stringify({ expectedRevision: deleteTarget.revision })
          : undefined,
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(body.error ?? "We could not delete that item.");
      setStatus(`${deleteTarget.name} deleted.`);
      setDeleteTarget(undefined);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not delete that item.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyAnswer(answer: LibraryProductAnswer) {
    try {
      await navigator.clipboard.writeText(answer.body);
      setStatus(`${answer.name} copied.`);
    } catch {
      setError(
        "Your browser did not allow copying. Open the answer and copy the text manually.",
      );
    }
  }

  function workHref(workId: string): string {
    const params = new URLSearchParams();
    if (view !== "works") params.set("view", view);
    if (sort !== "updated") params.set("sort", sort);
    if (query.trim()) params.set("q", query.trim().slice(0, 200));
    const returnTo = params.toString() ? `/library?${params}` : "/library";
    return `/library/works/${encodeURIComponent(workId)}?from=${encodeURIComponent(returnTo)}`;
  }

  return (
    <section
      className="mx-auto max-w-6xl space-y-6 pb-12"
      aria-labelledby="library-title"
    >
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1
            id="library-title"
            className="font-sans text-3xl font-semibold tracking-tight"
          >
            Library
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your work, ready for its next application.
          </p>
        </div>
        <Button
          type="button"
          disabled={view === "files" && !storageReady}
          onClick={() => {
            setError(undefined);
            setCreateOpen(true);
          }}
        >
          <Plus aria-hidden="true" />
          {createLabel}
        </Button>
      </header>
      <Tabs
        value={view}
        onValueChange={(value) => setView(value as LibraryProductView)}
        className="gap-6"
      >
        <nav aria-label="Library views">
          <TabsList
            variant="line"
            className="min-h-12 max-w-full gap-4 sm:gap-8"
          >
            {(
              [
                ["works", "Works", works.length],
                ["files", "Files", files.length],
                ["answers", "Reusable text", answers.length],
              ] as const
            ).map(([id, title, n]) => (
              <TabsTrigger key={id} value={id} className="min-h-11 px-1">
                {title}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {n}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </nav>
        <TabsContent value={view} className="space-y-6">
          {error && !createOpen && !deleteTarget ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {status ? (
            <p
              className="text-sm text-primary"
              role="status"
              aria-live="polite"
            >
              {status}
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1">
              <Label htmlFor="library-search" className="sr-only">
                Search {view === "answers" ? "reusable text" : view}
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute start-3 top-3 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="library-search"
                  type="search"
                  className="ps-10"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    writeUrl({ q: event.target.value });
                  }}
                  placeholder={
                    view === "works"
                      ? "Search your work"
                      : view === "files"
                        ? "Search files"
                        : "Search reusable text"
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="library-sort" className="sr-only">
                Sort materials
              </Label>
              <NativeSelect
                id="library-sort"
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as LibraryProductSort)
                }
              >
                <option value="updated">Recently updated</option>
                <option value="title">Title A–Z</option>
              </NativeSelect>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {query.trim() ? `${count} matching` : total}{" "}
            {view === "answers" ? "saved texts" : view}
          </p>
          {view === "works" && visibleWorks.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleWorks.map((work) => (
                <button
                  key={work.id}
                  type="button"
                  aria-label={`Open ${work.title}`}
                  onClick={() =>
                    setSelection({
                      kind: "work",
                      item: work,
                      href: workHref(work.id),
                    })
                  }
                  className="group flex min-h-64 flex-col overflow-hidden rounded-xl border border-border bg-card text-start outline-offset-4 hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="flex w-full items-start justify-between gap-4 border-b border-border bg-secondary p-5">
                    <span
                      className="flex size-12 items-center justify-center rounded-lg bg-background font-heading text-2xl text-primary"
                      aria-hidden="true"
                    >
                      {work.title.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {work.terms
                        .slice(0, 2)
                        .map((t) => t.label)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="flex w-full flex-1 flex-col gap-3 p-5">
                    <span className="font-heading text-2xl leading-tight break-words">
                      {work.title}
                    </span>
                    {work.description ? (
                      <span className="line-clamp-2 text-sm text-muted-foreground">
                        {work.description}
                      </span>
                    ) : null}
                    <span className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4 text-xs text-muted-foreground">
                      <span>{formatDate(work.updatedAt)}</span>
                      <span className="text-primary">
                        {work.trackerCount + work.checklistCount > 0
                          ? "Linked to applications"
                          : "Open work"}{" "}
                        →
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {view === "files" && visibleFiles.length ? (
            <div className="divide-y divide-border border-y border-border">
              {visibleFiles.map((file) => (
                <article
                  key={file.id}
                  className="flex items-start gap-3 py-5 sm:items-center sm:gap-5"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <FileGlyph contentType={file.contentType} />
                  </span>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-start outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={() =>
                      setSelection({ kind: "file", item: file, storageReady })
                    }
                  >
                    <span className="block font-medium break-words">
                      {file.filename}
                    </span>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {formatBytes(file.byteLength)} ·{" "}
                      {formatDate(file.createdAt)}
                    </span>
                    {file.linkedWorks.length ? (
                      <span className="mt-2 block text-sm text-muted-foreground">
                        {file.linkedWorks.map((w) => w.title).join(", ")}
                      </span>
                    ) : null}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${file.filename}`}
                    onClick={() => {
                      setError(undefined);
                      setDeleteTarget({
                        kind: "file",
                        id: file.id,
                        revision: file.revision,
                        name: file.filename,
                        linkedWorks: file.linkedWorks.length,
                        checklists: file.checklistCount,
                      });
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </article>
              ))}
            </div>
          ) : null}
          {view === "answers" && visibleAnswers.length ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {visibleAnswers.map((answer) => (
                <article
                  key={answer.id}
                  className="flex min-w-0 flex-col rounded-xl border border-border p-5"
                >
                  <button
                    type="button"
                    className="flex-1 text-start outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label={`Open ${answer.name}`}
                    onClick={() =>
                      setSelection({ kind: "answer", item: answer })
                    }
                  >
                    <span className="block font-sans text-xl font-semibold">
                      {answer.name}
                    </span>
                    <span className="mt-4 line-clamp-4 text-sm leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
                      {answer.body}
                    </span>
                  </button>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="text-xs text-muted-foreground">
                      {words(answer.body)} words
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void copyAnswer(answer)}
                      >
                        <Copy aria-hidden="true" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${answer.name}`}
                        onClick={() => {
                          setError(undefined);
                          setDeleteTarget({
                            kind: "answer",
                            id: answer.id,
                            revision: answer.revision,
                            name: answer.name,
                            linkedWorks: 0,
                            checklists: answer.checklistCount,
                          });
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {!count ? (
            <div className="space-y-5 border-y border-border py-12">
              <FolderOpen className="size-8 text-primary" />
              <h2 className="font-sans text-xl font-semibold">
                {query
                  ? "No matching materials"
                  : view === "works"
                    ? "What are you working on?"
                    : view === "files"
                      ? "Keep your files together"
                      : "Write it once. Make it yours each time."}
              </h2>
              <p className="max-w-lg text-sm text-muted-foreground">
                {query
                  ? "Try another title or clear your search."
                  : view === "works"
                    ? "Add a poem, a portfolio or a project. Link it when you prepare an application."
                    : view === "files"
                      ? storageReady
                        ? "Add a writing sample, portfolio, budget or supporting document."
                        : "Private file storage is currently unavailable. Works and reusable text are still available."
                      : "Keep your bio, artist statement and other application text here."}
              </p>
              {query ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    writeUrl({ q: "" });
                  }}
                >
                  Clear search
                </Button>
              ) : view !== "files" || storageReady ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus />
                  {createLabel}
                </Button>
              ) : null}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
      {selection ? (
        <LibraryMaterialSheet
          key={`${selection.kind}:${selection.item.id}`}
          selected={selection}
          onClose={() => setSelection(null)}
          onSaved={() => router.refresh()}
        />
      ) : null}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className={view === "works" ? styles.createDialog : undefined}
        >
          <form onSubmit={submitCreate}>
            <DialogHeader>
              <DialogTitle>{createLabel}</DialogTitle>
              <DialogDescription>
                {view === "works"
                  ? "Add your work. You can link files and describe it now or later."
                  : view === "files"
                    ? "Upload one private file up to 100 MiB."
                    : "A bio, a statement or any text you use in applications."}
              </DialogDescription>
            </DialogHeader>
            <div className={styles.formBody}>
              {view === "works" ? (
                <>
                  <div>
                    <Label htmlFor="new-work-title">Work title</Label>
                    <Input
                      id="new-work-title"
                      value={workTitle}
                      onChange={(event) => setWorkTitle(event.target.value)}
                      maxLength={200}
                      required
                    />
                    <p>{workTitle.length}/200 characters</p>
                  </div>
                  <div>
                    <Label htmlFor="new-work-description">
                      Description <span>Optional</span>
                    </Label>
                    <Textarea
                      id="new-work-description"
                      value={workDescription}
                      onChange={(event) =>
                        setWorkDescription(event.target.value)
                      }
                      maxLength={4000}
                      rows={4}
                    />
                    <p>{workDescription.length}/4,000 characters</p>
                  </div>
                  <div>
                    <Label htmlFor="new-work-file">
                      Current file <span>Optional</span>
                    </Label>
                    <select
                      id="new-work-file"
                      value={workFileId}
                      onChange={(event) => setWorkFileId(event.target.value)}
                    >
                      <option value="">No file yet</option>
                      {files.map((file) => (
                        <option key={file.id} value={file.id}>
                          {file.filename}
                        </option>
                      ))}
                    </select>
                    <p>
                      Only the current file is linked today. Submitted files
                      remain in their receipts.
                    </p>
                  </div>
                  <fieldset>
                    <legend>
                      Field terms <span>Optional · up to 32</span>
                    </legend>
                    <TaxonomyBrowsePicker
                      idPrefix="create-library-work"
                      selectedTermIds={workTermIds}
                      onSelectedTermIdsChange={setWorkTermIds}
                      description="Describe the Work across independent facets. These terms stay private and do not determine eligibility or quality."
                    />
                  </fieldset>
                </>
              ) : null}
              {view === "files" ? (
                <div>
                  <Label htmlFor="library-file">Choose file</Label>
                  <Input
                    id="library-file"
                    type="file"
                    disabled={!storageReady || busy}
                    onChange={(event) => setUploadFile(event.target.files?.[0])}
                    required
                  />
                  <p>
                    {storageReady
                      ? "1 byte to 100 MiB. Preview support depends on file type."
                      : "Private file storage is unavailable in this environment."}
                  </p>
                </div>
              ) : null}
              {view === "answers" ? (
                <>
                  <div>
                    <Label htmlFor="answer-name">Text name</Label>
                    <Input
                      id="answer-name"
                      value={answerName}
                      onChange={(event) => setAnswerName(event.target.value)}
                      maxLength={120}
                      required
                    />
                    <p>{answerName.length}/120 characters</p>
                  </div>
                  <div>
                    <Label htmlFor="answer-body">Text</Label>
                    <Textarea
                      id="answer-body"
                      value={answerBody}
                      onChange={(event) => setAnswerBody(event.target.value)}
                      maxLength={20000}
                      rows={9}
                      required
                    />
                    <p>
                      {answerBody.length}/20,000 characters ·{" "}
                      {words(answerBody)} words
                    </p>
                  </div>
                </>
              ) : null}
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                type="submit"
                disabled={
                  busy ||
                  (view === "works"
                    ? !workTitle.trim()
                    : view === "files"
                      ? !storageReady || !uploadFile
                      : !answerName.trim() || !answerBody.trim())
                }
              >
                {busy
                  ? "Saving…"
                  : view === "works"
                    ? "Create work"
                    : view === "files"
                      ? "Upload file"
                      : "Save text"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTarget?.kind === "file" ? "file" : "Saved Answer"}?
            </DialogTitle>
            <DialogDescription>
              This removes “{deleteTarget?.name}” from your private Library.
              Historical submission receipts are separate and are not rewritten.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget &&
          (deleteTarget.linkedWorks || deleteTarget.checklists) ? (
            <p className={styles.blockedDelete} role="alert">
              Deletion is unavailable while this item is linked to{" "}
              {deleteTarget.linkedWorks
                ? `${deleteTarget.linkedWorks} Work${deleteTarget.linkedWorks === 1 ? "" : "s"}`
                : ""}
              {deleteTarget.linkedWorks && deleteTarget.checklists
                ? " and "
                : ""}
              {deleteTarget.checklists
                ? `${deleteTarget.checklists} preparation checklist${deleteTarget.checklists === 1 ? "" : "s"}`
                : ""}
              . Detach those private references first.
            </p>
          ) : (
            <p className={styles.deleteCopy}>
              This action cannot be undone. The stored file bytes are also
              removed when file storage is available.
            </p>
          )}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={
                busy ||
                Boolean(
                  deleteTarget &&
                  (deleteTarget.linkedWorks || deleteTarget.checklists),
                )
              }
              onClick={() => void deleteItem()}
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
