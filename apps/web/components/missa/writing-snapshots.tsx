"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Ellipsis } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { WritingContent } from "@/lib/writing";
import { documentText, parseWritingDocument } from "@/lib/writing-document";
import {
  diffLines,
  newWritingSnapshotId,
  SNAPSHOT_NAME_MAX,
  type WritingSnapshot,
  type WritingSnapshotSummary,
} from "@/lib/writing-snapshots";

/**
 * Snapshots of the open piece: kept on request, compared line by line with
 * the current text, and restored. Restoring keeps a snapshot of the current
 * text first, so nothing is lost.
 */

function when(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function textOf(content: Pick<WritingContent, "body" | "document">) {
  const document = content.document
    ? parseWritingDocument(content.document)
    : null;
  return document ? documentText(document) : content.body;
}

function snapshotName(snapshot: WritingSnapshotSummary) {
  return snapshot.name || `Snapshot, ${when(snapshot.createdAt)}`;
}

async function call(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json" },
    });
    const data: unknown = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      data:
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {},
    };
  } catch {
    return { ok: false, data: {} };
  }
}

const failure = (data: Record<string, unknown>, fallback: string) =>
  typeof data.error === "string" ? data.error : fallback;

export function WritingSnapshots({
  open,
  onOpenChange,
  onClosed,
  entryId,
  content,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
  entryId: string;
  /** The piece as it stands now. */
  content: WritingContent;
  onRestore: (content: WritingContent) => void;
}) {
  const id = useId();
  const [list, setList] = useState<WritingSnapshotSummary[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [taking, setTaking] = useState(false);
  const [compare, setCompare] = useState<WritingSnapshot | null>(null);
  const [restore, setRestore] = useState<WritingSnapshotSummary | null>(null);
  const [restoring, setRestoring] = useState(false);
  const base = `/api/me/writing/${encodeURIComponent(entryId)}/snapshots`;

  const load = useCallback(async () => {
    setLoadError("");
    const result = await call(base);
    if (result.ok && Array.isArray(result.data.snapshots)) {
      setList(result.data.snapshots as WritingSnapshotSummary[]);
    } else {
      setList([]);
      setLoadError(
        failure(
          result.data,
          "Snapshots didn’t load. Check your connection and try again.",
        ),
      );
    }
  }, [base]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const result = await call(base);
      if (cancelled) return;
      if (result.ok && Array.isArray(result.data.snapshots)) {
        setLoadError("");
        setList(result.data.snapshots as WritingSnapshotSummary[]);
      } else {
        setList([]);
        setLoadError(
          failure(
            result.data,
            "Snapshots didn’t load. Check your connection and try again.",
          ),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, base]);

  async function keep(snapshotName: string) {
    const result = await call(base, {
      method: "POST",
      body: JSON.stringify({
        id: newWritingSnapshotId(),
        name: snapshotName,
        ...content,
      }),
    });
    const snapshot = result.data.snapshot as WritingSnapshotSummary | undefined;
    return result.ok && snapshot
      ? { snapshot }
      : {
          error: failure(
            result.data,
            "We couldn’t keep this snapshot. Check your connection and try again.",
          ),
        };
  }

  async function take() {
    setTaking(true);
    const result = await keep(name.trim());
    setTaking(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setName("");
    setList((items) => [result.snapshot, ...(items ?? [])]);
    toast.success(`Snapshot kept: ${snapshotName(result.snapshot)}`);
  }

  async function openSnapshot(summary: WritingSnapshotSummary) {
    const result = await call(`${base}/${encodeURIComponent(summary.id)}`);
    const snapshot = result.data.snapshot as WritingSnapshot | undefined;
    if (!result.ok || !snapshot) {
      toast.error(
        failure(result.data, "This snapshot didn’t open. Try again."),
      );
      return null;
    }
    return snapshot;
  }

  async function confirmRestore() {
    if (!restore) return;
    setRestoring(true);
    const snapshot = await openSnapshot(restore);
    if (!snapshot) {
      setRestoring(false);
      return;
    }
    // The text as it is now is kept first, so restoring never loses words.
    const before = await keep(
      `Before restoring ${snapshotName(restore)}`.slice(0, SNAPSHOT_NAME_MAX),
    );
    if ("error" in before) {
      setRestoring(false);
      toast.error(before.error);
      return;
    }
    onRestore({
      title: snapshot.title,
      body: snapshot.body,
      document: snapshot.document,
    });
    setRestoring(false);
    setRestore(null);
    onOpenChange(false);
    toast.success(
      `Restored ${snapshotName(restore)}. The text from before is kept as a snapshot.`,
    );
  }

  async function remove(summary: WritingSnapshotSummary) {
    const result = await call(`${base}/${encodeURIComponent(summary.id)}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      toast.error(
        failure(result.data, "We couldn’t delete this snapshot. Try again."),
      );
      return;
    }
    setList((items) => (items ?? []).filter((item) => item.id !== summary.id));
    toast.success("Snapshot deleted");
  }

  const lines = compare ? diffLines(textOf(compare), textOf(content)) : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          finalFocus={() => {
            onClosed();
            return false;
          }}
        >
          <SheetHeader variant="section">
            <SheetTitle>Snapshots</SheetTitle>
            <SheetDescription>
              This piece as it stood at moments you chose. Compare one with the
              text now, or bring it back.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4">
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void take();
              }}
            >
              <Field>
                <FieldLabel htmlFor={`${id}-name`}>
                  Name, if you like
                </FieldLabel>
                <Input
                  id={`${id}-name`}
                  value={name}
                  maxLength={SNAPSHOT_NAME_MAX}
                  placeholder="Before cutting the second stanza"
                  onChange={(event) => setName(event.target.value)}
                />
                <FieldDescription>
                  A snapshot keeps the title, every page and its format.
                </FieldDescription>
              </Field>
              <Button
                type="submit"
                disabled={taking}
                aria-busy={taking || undefined}
              >
                {taking ? "Keeping…" : "Take a snapshot"}
              </Button>
            </form>
            {list === null ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner /> Loading snapshots…
              </p>
            ) : loadError ? (
              <div className="flex flex-col items-start gap-2">
                <p role="alert" className="text-sm text-destructive">
                  {loadError}
                </p>
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  Try again
                </Button>
              </div>
            ) : list.length ? (
              <ItemGroup>
                {list.map((snapshot) => (
                  <div role="listitem" key={snapshot.id}>
                    <Item variant="outline" size="sm">
                      <ItemContent>
                        <ItemTitle>{snapshotName(snapshot)}</ItemTitle>
                        <ItemDescription>
                          {snapshot.name
                            ? `${when(snapshot.createdAt)} · `
                            : ""}
                          {snapshot.wordCount.toLocaleString()}{" "}
                          {snapshot.wordCount === 1 ? "word" : "words"}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const full = await openSnapshot(snapshot);
                            if (full) setCompare(full);
                          }}
                        >
                          Compare
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Options for ${snapshotName(snapshot)}`}
                              />
                            }
                          >
                            <Ellipsis aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => setRestore(snapshot)}
                            >
                              Restore this snapshot…
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => void remove(snapshot)}
                            >
                              Delete snapshot
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </ItemActions>
                    </Item>
                  </div>
                ))}
              </ItemGroup>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No snapshots yet</EmptyTitle>
                  <EmptyDescription>
                    Take one before a big change, so you can always go back.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={compare !== null}
        onOpenChange={(next) => {
          if (!next) setCompare(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {compare ? snapshotName(compare) : "Snapshot"} and now
            </DialogTitle>
            <DialogDescription>
              Lines only in the snapshot are struck through. Lines only in the
              text now are marked new.
            </DialogDescription>
          </DialogHeader>
          {lines === null ? (
            <p className="text-sm text-muted-foreground">
              This piece is too long to compare line by line here. Restoring the
              snapshot shows it whole, and keeps the text now as a snapshot
              first.
            </p>
          ) : lines.every((line) => line.kind === "same") ? (
            <p className="text-sm text-muted-foreground">
              The text is the same as in this snapshot.
            </p>
          ) : (
            <ol className="flex flex-col font-mono text-sm whitespace-pre-wrap [tab-size:4]">
              {lines.map((line, index) => (
                <li
                  key={index}
                  className={cn(
                    "rounded-sm px-2 py-0.5",
                    line.kind === "removed" &&
                      "bg-destructive-subtle text-destructive line-through",
                    line.kind === "added" && "bg-success-subtle",
                  )}
                >
                  <span className="sr-only">
                    {line.kind === "removed"
                      ? "Only in the snapshot: "
                      : line.kind === "added"
                        ? "New since: "
                        : ""}
                  </span>
                  {line.text || " "}
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={restore !== null}
        onOpenChange={(next) => {
          if (!next && !restoring) setRestore(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Restore {restore ? `“${snapshotName(restore)}”` : "this snapshot"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The piece goes back to how it was then. Its text as it is now is
              kept as a snapshot first, so nothing is lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <Button
              disabled={restoring}
              aria-busy={restoring || undefined}
              onClick={() => void confirmRestore()}
            >
              {restoring ? "Restoring…" : "Restore"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
