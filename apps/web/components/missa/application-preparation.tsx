"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Link2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Item = {
  id: string;
  label: string;
  state: "missing" | "ready" | "complete" | "not-applicable";
  revision: number;
  source: string;
  libraryWorkId?: string;
  libraryFileId?: string;
  savedAnswerId?: string;
};
type Checklist = {
  checklist: { revision: number };
  items: Item[];
  requirementsConfirmed: boolean;
};
type Library = {
  works: { id: string; title: string }[];
  files: { id: string; filename: string }[];
  savedAnswers: { id: string; name: string }[];
};

export function ApplicationPreparation({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const [data, setData] = useState<Checklist | null>(null),
    [library, setLibrary] = useState<Library>({
      works: [],
      files: [],
      savedAnswers: [],
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dialog, setDialog] = useState<"add" | Item | null>(null),
    [label, setLabel] = useState(""),
    [attachment, setAttachment] = useState("");
  const request = useRef<{ signature: string; key: string } | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/me/opportunities/${encodeURIComponent(opportunityId)}/checklist`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError("");
    } catch {
      setError("Your preparation could not load. Try again.");
    }
  }, [opportunityId]);
  useEffect(() => {
    // Load the checklist from the server when the opportunity changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes preparation state
    void load();
  }, [load]);
  async function mutate(
    url: string,
    method: string,
    body: object,
    revision: number,
  ) {
    setBusy(true);
    setError("");
    const signature = JSON.stringify([url, method, body, revision]);
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": request.current.key,
          "If-Match": String(revision),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Your preparation could not be saved.");
      }
      await load();
      request.current = null;
      setDialog(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function openAttach(item: Item) {
    setAttachment(
      item.libraryWorkId
        ? `work:${item.libraryWorkId}`
        : item.libraryFileId
          ? `file:${item.libraryFileId}`
          : item.savedAnswerId
            ? `answer:${item.savedAnswerId}`
            : "",
    );
    setDialog(item);
    setError("");
    try {
      const res = await fetch("/api/me/library", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setLibrary(await res.json());
    } catch {
      setError("Your Library could not load. Close and try again.");
    }
  }
  const active = data?.items.filter((i) => i.state !== "not-applicable") ?? [],
    done = active.filter((i) => ["complete", "ready"].includes(i.state)).length;
  return (
    <section aria-labelledby="preparation-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3
          id="preparation-heading"
          className="font-sans text-xl font-semibold"
        >
          Prepare your application
        </h3>
        <Button
          variant="ghost"
          disabled={busy || !data}
          onClick={() => {
            setLabel("");
            setDialog("add");
            setError("");
          }}
        >
          <Plus />
          Add a step
        </Button>
      </div>
      {error && !dialog ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
          <Button variant="ghost" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}
      {!data && !error ? (
        <div
          className="space-y-3"
          role="status"
          aria-label="Loading preparation"
        >
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}
      {data ? (
        <>
          {active.length ? (
            <div className="space-y-3">
              <div className="flex justify-between gap-3 text-sm">
                <span>
                  {done === active.length
                    ? "Your checklist is complete"
                    : `${active.length - done} ${active.length - done === 1 ? "step" : "steps"} to prepare`}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {done} / {active.length}
                </span>
              </div>
              <Progress
                value={(done / active.length) * 100}
                aria-label={`${done} of ${active.length} preparation steps ready`}
              />
            </div>
          ) : null}
          {!data.requirementsConfirmed ? (
            <p className="text-sm text-muted-foreground">
              Check the official guidelines for required materials. You can add
              your own preparation steps here.
            </p>
          ) : null}
          <div className="divide-y divide-border">
            {data.items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-4">
                <Checkbox
                  id={`step-${item.id}`}
                  className="mt-3"
                  checked={item.state === "complete" || item.state === "ready"}
                  disabled={busy || item.state === "not-applicable"}
                  onCheckedChange={() => {
                    const previous = data;
                    const complete =
                      item.state !== "complete" && item.state !== "ready";
                    setData({
                      ...data,
                      items: data.items.map((i) =>
                        i.id === item.id
                          ? { ...i, state: complete ? "complete" : "missing" }
                          : i,
                      ),
                    });
                    void mutate(
                      `/api/me/checklist-items/${item.id}`,
                      "PATCH",
                      { state: complete ? "complete" : "missing" },
                      item.revision,
                    ).then((ok) => {
                      if (ok)
                        toast.success(
                          complete ? "Step completed" : "Step reopened",
                        );
                      else setData(previous);
                    });
                  }}
                />
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`step-${item.id}`}
                    className="flex min-h-11 cursor-pointer items-center font-medium"
                  >
                    {item.label}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {item.state === "not-applicable"
                      ? "Not applicable"
                      : item.source === "user-added"
                        ? "Your step"
                        : "From the listed requirements"}
                    {item.libraryWorkId ||
                    item.libraryFileId ||
                    item.savedAnswerId
                      ? " · Material linked"
                      : ""}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Link material for ${item.label}`}
                  disabled={busy}
                  onClick={() => void openAttach(item)}
                >
                  <Link2 />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link
              href="/library"
              className="text-primary underline underline-offset-4"
            >
              Open Library
            </Link>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void mutate(
                  `/api/me/opportunities/${opportunityId}/checklist`,
                  "POST",
                  {},
                  data.checklist.revision,
                )
              }
            >
              <RefreshCw />
              Refresh requirements
            </Button>
          </div>
        </>
      ) : null}
      <Dialog
        open={dialog !== null}
        onOpenChange={(v) => {
          if (!v && !busy) setDialog(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle className="text-xl">
            {dialog === "add"
              ? "Add a preparation step"
              : "Link a Library material"}
          </DialogTitle>
          <DialogDescription>
            {dialog === "add"
              ? "Add what you need to do before applying."
              : typeof dialog === "object" && dialog
                ? dialog.label
                : "Choose a material."}
          </DialogDescription>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!data || !dialog) return;
              if (dialog === "add")
                void mutate(
                  `/api/me/opportunities/${opportunityId}/checklist/items`,
                  "POST",
                  { label },
                  data.checklist.revision,
                );
              else {
                const separator = attachment.indexOf(":"),
                  kind = attachment.slice(0, separator),
                  id = attachment.slice(separator + 1);
                void mutate(
                  `/api/me/checklist-items/${dialog.id}`,
                  "PATCH",
                  {
                    libraryWorkId: kind === "work" ? id : null,
                    libraryFileId: kind === "file" ? id : null,
                    savedAnswerId: kind === "answer" ? id : null,
                  },
                  dialog.revision,
                );
              }
            }}
          >
            {dialog === "add" ? (
              <Field>
                <FieldLabel htmlFor="preparation-label">Step</FieldLabel>
                <Input
                  id="preparation-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                  maxLength={500}
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="preparation-material">Material</FieldLabel>
                <NativeSelect
                  id="preparation-material"
                  value={attachment}
                  onChange={(e) => setAttachment(e.target.value)}
                >
                  <option value="">No material linked</option>
                  <optgroup label="Works">
                    {library.works.map((w) => (
                      <option key={w.id} value={`work:${w.id}`}>
                        {w.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Files">
                    {library.files.map((f) => (
                      <option key={f.id} value={`file:${f.id}`}>
                        {f.filename}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Reusable text">
                    {library.savedAnswers.map((a) => (
                      <option key={a.id} value={`answer:${a.id}`}>
                        {a.name}
                      </option>
                    ))}
                  </optgroup>
                </NativeSelect>
              </Field>
            )}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Saving…"
                  : dialog === "add"
                    ? "Add step"
                    : "Save material"}
                <Check />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
