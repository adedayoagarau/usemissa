"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  PIECE_STATUSES,
  type PieceStatus,
  type WritingProject,
} from "@/lib/writing-projects";
import { WRITING_TITLE_MAX } from "@/lib/writing";
import { TARGET_MAX } from "@/lib/writing-cards";
import { pieceTarget } from "@/lib/writing-piece-actions";
import type { LibraryPiece } from "./writing-library";
export type PieceDetails = {
  title: string;
  status: PieceStatus;
  target: number | undefined;
  research: boolean;
};
export function WritingPieceContext({
  piece,
  projects,
  onEdit,
  onDuplicate,
  onMovePiece,
  children,
}: {
  piece: LibraryPiece;
  projects: WritingProject[];
  onEdit?: () => void;
  onDuplicate?: () => void;
  onMovePiece: (id: string, projectId: string | null) => void;
  children: ReactNode;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={<div />}
        onContextMenu={(event) => {
          if (event.shiftKey) event.preventBaseUIHandler();
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuLabel>{piece.title || "Untitled"}</ContextMenuLabel>
          {onEdit ? (
            <ContextMenuItem onClick={onEdit}>Piece details</ContextMenuItem>
          ) : null}
          {onDuplicate ? (
            <ContextMenuItem onClick={onDuplicate}>
              Duplicate piece
            </ContextMenuItem>
          ) : null}
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuLabel>Move to</ContextMenuLabel>
          {projects.map((project) => (
            <ContextMenuItem
              key={project.id}
              disabled={project.id === piece.projectId}
              onClick={() => onMovePiece(piece.id, project.id)}
            >
              {project.title || "Untitled project"}
            </ContextMenuItem>
          ))}
          <ContextMenuItem
            disabled={!piece.projectId}
            onClick={() => onMovePiece(piece.id, null)}
          >
            Loose pieces
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
export function WritingPieceDetails({
  piece,
  onClose,
  onSave,
  onLoad,
  canSetTarget = true,
}: {
  piece: LibraryPiece;
  onClose: () => void;
  onSave: (id: string, details: PieceDetails) => void | Promise<void>;
  onLoad?: (id: string) => Promise<PieceDetails>;
  canSetTarget?: boolean;
}) {
  const id = useId();
  const [title, setTitle] = useState(piece.title);
  const [status, setStatus] = useState<PieceStatus>(
    Object.hasOwn(PIECE_STATUSES, piece.status)
      ? (piece.status as PieceStatus)
      : "",
  );
  const [target, setTarget] = useState(piece.card.target?.toString() ?? "");
  const [research, setResearch] = useState(Boolean(piece.research));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(!onLoad);
  useEffect(() => {
    if (!onLoad) return;
    let active = true;
    onLoad(piece.id).then(
      (details) => {
        if (!active) return;
        setTitle(details.title);
        setStatus(details.status);
        setTarget(details.target?.toString() ?? "");
        setResearch(details.research);
        setLoaded(true);
      },
      () => {
        if (active)
          setError(
            "Piece details could not be loaded. Close this window and try again.",
          );
      },
    );
    return () => {
      active = false;
    };
  }, [onLoad, piece.id]);
  async function save() {
    const checked = pieceTarget(target);
    if (checked === null) {
      setError(
        `Enter a whole number from 1 to ${TARGET_MAX.toLocaleString()}, or leave the target empty.`,
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(piece.id, {
        title: title.trim(),
        status,
        target: checked,
        research,
      });
      onClose();
    } catch {
      setError("Your changes could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Piece details</DialogTitle>
          <DialogDescription>
            Set the title, status and word target for this piece.
          </DialogDescription>
        </DialogHeader>
        {!loaded && !error ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading piece details…
          </p>
        ) : null}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
            <Input
              id={`${id}-title`}
              value={title}
              maxLength={WRITING_TITLE_MAX}
              disabled={busy || !loaded}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-status`}>Status</FieldLabel>
            <NativeSelect
              id={`${id}-status`}
              value={status}
              disabled={busy || !loaded}
              onChange={(e) => setStatus(e.target.value as PieceStatus)}
            >
              {Object.entries(PIECE_STATUSES).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-target`}>
              Word target{canSetTarget ? "" : " · Plus"}
            </FieldLabel>
            <Input
              id={`${id}-target`}
              inputMode="numeric"
              value={target}
              disabled={busy || !loaded || !canSetTarget}
              onChange={(e) => setTarget(e.target.value)}
            />
          </Field>
          <Field orientation="horizontal">
            <Checkbox
              id={`${id}-research`}
              checked={research}
              disabled={busy || !loaded}
              onCheckedChange={(checked) => setResearch(checked === true)}
            />
            <div>
              <FieldLabel htmlFor={`${id}-research`}>
                Exclude from manuscript export
              </FieldLabel>
              <FieldDescription>
                Keep this piece as research. It stays in your project and
                project backup.
              </FieldDescription>
            </div>
          </Field>
        </FieldGroup>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy || !loaded} onClick={() => void save()}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
