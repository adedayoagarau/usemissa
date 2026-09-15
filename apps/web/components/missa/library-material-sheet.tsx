"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Copy, FileText, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  LibraryProductAnswer,
  LibraryProductFile,
  LibraryProductWork,
} from "@/components/library-product";
import type { MaterialUsage } from "@/lib/library-material-usage";
import {
  applicationDate,
  applicationView,
} from "@/lib/application-workspace-types";
import { STATUS_LABELS } from "@/lib/statusLabels";
import { toast } from "sonner";

export type LibrarySelection =
  | { kind: "work"; item: LibraryProductWork; href: string }
  | { kind: "file"; item: LibraryProductFile; storageReady: boolean }
  | { kind: "answer"; item: LibraryProductAnswer };

export function LibraryMaterialSheet({
  selected,
  onClose,
  onSaved,
}: {
  selected: LibrarySelection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [usage, setUsage] = useState<MaterialUsage | null>(null),
    [error, setError] = useState(""),
    [saveError, setSaveError] = useState("");
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false);
  const [name, setName] = useState(
    selected.kind === "answer" ? selected.item.name : "",
  );
  const [body, setBody] = useState(
    selected.kind === "answer" ? selected.item.body : "",
  );
  const [saved, setSaved] = useState({
    name,
    body,
    revision: selected.item.revision,
  });
  const request = useRef<{ signature: string; key: string } | null>(null);
  const title =
    selected.kind === "work"
      ? selected.item.title
      : selected.kind === "file"
        ? selected.item.filename
        : saved.name;
  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams({
        kind: selected.kind,
        id: selected.item.id,
      });
      const response = await fetch(`/api/me/library/usage?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setUsage(await response.json());
    } catch {
      setError("Your material connections could not load. Try again.");
    }
  }, [selected.kind, selected.item.id]);
  useEffect(() => {
    // Load usage from the server when the selected material changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes usage state
    void load();
  }, [load]);

  async function saveAnswer() {
    if (selected.kind !== "answer") return;
    setBusy(true);
    setSaveError("");
    const signature = JSON.stringify({
      name,
      body,
      expectedRevision: saved.revision,
    });
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    try {
      const response = await fetch(
        `/api/me/library/saved-answers/${encodeURIComponent(selected.item.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": request.current.key,
          },
          body: signature,
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Your text could not be saved.");
      setSaved({
        name: result.name,
        body: result.body,
        revision: result.revision,
      });
      request.current = null;
      setEditing(false);
      onSaved();
      toast.success("Reusable text updated");
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Your text could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader
          variant="section"
          className="gap-3 p-6 pt-12 sm:p-8 sm:pt-12"
        >
          <SheetTitle className="font-heading text-3xl leading-tight break-words">
            {title}
          </SheetTitle>
          <SheetDescription>
            {selected.kind === "work"
              ? "Work"
              : selected.kind === "file"
                ? "Private file"
                : "Reusable text"}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-8 px-6 pb-8 sm:px-8">
          {selected.kind === "work" ? (
            <section className="space-y-4">
              {selected.item.description ? (
                <p className="leading-relaxed break-words whitespace-pre-wrap">
                  {selected.item.description}
                </p>
              ) : null}
              {selected.item.terms.length ? (
                <p className="text-sm text-muted-foreground">
                  {selected.item.terms.map((t) => t.label).join(" · ")}
                </p>
              ) : null}
              <Link
                href={selected.href}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil />
                Edit work
              </Link>
            </section>
          ) : selected.kind === "file" ? (
            <section className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {selected.item.contentType} ·{" "}
                {Math.ceil(selected.item.byteLength / 1024)} KB
              </p>
              {selected.storageReady ? (
                <a
                  href={`/api/me/library/files/${encodeURIComponent(selected.item.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Open file
                  <ArrowUpRight />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <p role="status">File storage is currently unavailable.</p>
              )}
            </section>
          ) : editing ? (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                void saveAnswer();
              }}
            >
              <Field>
                <FieldLabel htmlFor="material-text-name">Name</FieldLabel>
                <Input
                  id="material-text-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={120}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="material-text-body">Text</FieldLabel>
                <Textarea
                  id="material-text-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  required
                  maxLength={20000}
                />
              </Field>
              {saveError ? (
                <p role="alert" className="text-sm text-destructive">
                  {saveError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save text"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setName(saved.name);
                    setBody(saved.body);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <section className="space-y-5">
              <p className="leading-relaxed break-words whitespace-pre-wrap">
                {saved.body}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSaveError("");
                    setEditing(true);
                  }}
                >
                  <Pencil />
                  Edit text
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(saved.body)
                      .then(() => toast.success("Text copied"))
                      .catch(() =>
                        toast.error("Select the text above to copy it."),
                      )
                  }
                >
                  <Copy />
                  Copy
                </Button>
              </div>
            </section>
          )}
          <section
            className="space-y-4 border-t border-border pt-6"
            aria-labelledby="material-applications"
          >
            <h2
              id="material-applications"
              className="font-sans text-xl font-semibold"
            >
              Used in applications
            </h2>
            {error ? (
              <div role="alert" className="text-sm text-destructive">
                {error}
                <Button variant="ghost" onClick={() => void load()}>
                  Try again
                </Button>
              </div>
            ) : null}
            {!usage && !error ? (
              <div role="status" aria-label="Loading material connections">
                <Skeleton className="h-24 w-full" />
              </div>
            ) : null}
            {usage?.applications.map((a) => (
              <Link
                key={a.opportunityId}
                href={`/tracker?view=${applicationView(a.status)}&application=${encodeURIComponent(a.opportunityId)}`}
                className="flex min-h-16 items-center gap-4 border-b border-border py-4 text-primary"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{a.title}</span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {STATUS_LABELS[a.status]}
                    {a.preserved ? " · Version preserved" : " · In preparation"}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            ))}
            {usage && !usage.applications.length ? (
              <>
                <p className="text-sm text-muted-foreground">
                  This material is ready to use in your next application.
                </p>
                <Link
                  href="/tracker?view=saved"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Choose an application
                  <ArrowRight />
                </Link>
              </>
            ) : null}
          </section>
          {usage?.versions.length ? (
            <section className="space-y-3 border-t border-border pt-6">
              <h2 className="font-sans text-xl font-semibold">
                Preserved versions
              </h2>
              <p className="text-sm text-muted-foreground">
                These copies stay as they were when you recorded each
                submission.
              </p>
              {usage.versions.map((v) => (
                <Collapsible key={v.id} variant="divided">
                  <CollapsibleTrigger
                    render={
                      <Button
                        variant="ghost"
                        className="h-auto min-h-12 w-full justify-between text-start whitespace-normal"
                      />
                    }
                  >
                    <span>
                      {v.title}
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {applicationDate(v.recordedAt)}
                      </span>
                    </span>
                    <FileText className="shrink-0" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 p-3">
                    <p className="font-medium">
                      {String(
                        v.material.title ??
                          v.material.label ??
                          v.material.name ??
                          title,
                      )}
                    </p>
                    {v.material.description || v.material.answer ? (
                      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                        {String(v.material.answer ?? v.material.description)}
                      </p>
                    ) : null}
                    <Link
                      href={`/tracker?view=${applicationView(usage.applications.find((a) => a.opportunityId === v.opportunityId)!.status)}&application=${encodeURIComponent(v.opportunityId)}`}
                      className="inline-flex min-h-11 items-center gap-2 text-sm text-primary"
                    >
                      View application
                      <ArrowRight className="size-4" />
                    </Link>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
