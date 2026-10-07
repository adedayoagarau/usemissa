"use client";

import { useId, useState } from "react";
import { ArrowLeft, Ellipsis, GripVertical } from "lucide-react";
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
  DropdownMenu,
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@/components/ui/sortable";
import { Textarea } from "@/components/ui/textarea";
import { WRITING_TITLE_MAX } from "@/lib/writing";
import { PAGE_SIZES, type PageSizeId } from "@/lib/writing-document";
import type { PieceCard } from "@/lib/writing-cards";
import { UpgradeHint } from "@/components/missa/upgrade-hint";
import {
  PIECE_STATUSES,
  PIECE_SYNOPSIS_MAX,
  PROJECT_TEMPLATES,
  type CompileOptions,
  type PieceStatus,
  type ProjectTemplateId,
  type WritingProject,
} from "@/lib/writing-projects";

/**
 * The writing room's library: projects, the binder of one project, and loose
 * pieces. Nothing here reads or changes the text of a piece; it only gathers
 * pieces, orders them and opens them.
 */

export type LibraryPiece = {
  id: string;
  title: string;
  preview: string;
  wordCount: number;
  updatedAt: string;
  projectId: string | null;
  position: number;
  synopsis: string;
  status: string;
  /** The planner's index card. */
  card: PieceCard;
  /** Kept on this device, not yet in the account. */
  local: boolean;
  open: boolean;
};

export type WritingLibraryProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
  deviceOnly: boolean;
  projects: WritingProject[];
  pieces: LibraryPiece[];
  /** The project whose binder is shown; null shows everything. */
  projectId: string | null;
  onShowProject: (id: string | null) => void;
  onOpenPiece: (id: string) => void;
  onNewProject: () => void;
  onAddPiece: (projectId: string) => void;
  onReorder: (projectId: string, ids: string[]) => void;
  onMovePiece: (id: string, projectId: string | null) => void;
  onRenameProject: (id: string, title: string) => void;
  onDeleteProject: (id: string) => void;
  onCompile: (id: string) => void;
  onOutline: (id: string) => void;
  onDownloadAll: () => void;
  exportError: string;
};

export function wordLabel(words: number) {
  return `${words.toLocaleString()} ${words === 1 ? "word" : "words"}`;
}

export function pieceLabel(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? "piece" : "pieces"}`;
}

function shortDate(iso: string) {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  }).format(date);
}

export function pieceName(piece: Pick<LibraryPiece, "title" | "preview">) {
  return piece.title.trim() || piece.preview || "Untitled";
}

export function projectName(project: Pick<WritingProject, "title">) {
  return project.title.trim() || "Untitled project";
}

function PieceLink({
  piece,
  onOpen,
  detail,
}: {
  piece: LibraryPiece;
  onOpen: (id: string) => void;
  /** Shown before the word count; the date of the last change when left out, nothing when null. */
  detail?: string | null;
}) {
  return (
    <a
      href={`/doc?entry=${encodeURIComponent(piece.id)}`}
      aria-current={piece.open ? "true" : undefined}
      className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        onOpen(piece.id);
      }}
    >
      <ItemTitle>{pieceName(piece)}</ItemTitle>
      <ItemDescription>
        {detail === null
          ? wordLabel(piece.wordCount)
          : `${detail ?? shortDate(piece.updatedAt)} · ${wordLabel(piece.wordCount)}`}
        {piece.open ? " · Open now" : ""}
        {piece.local ? " · Not saved to your account yet" : ""}
      </ItemDescription>
    </a>
  );
}

export function WritingLibrary(props: WritingLibraryProps) {
  const {
    open,
    onOpenChange,
    onClosed,
    deviceOnly,
    projects,
    pieces,
    projectId,
  } = props;
  const shown = projectId
    ? projects.find((project) => project.id === projectId)
    : undefined;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        // Closing the library returns to the page, so writing can go on at once.
        finalFocus={() => {
          onClosed();
          return false;
        }}
      >
        {shown ? (
          // Remounts when the title changes elsewhere, so the field shows it.
          <ProjectBinder
            key={`${shown.id}:${shown.title}`}
            {...props}
            project={shown}
          />
        ) : (
          <>
            <SheetHeader variant="section">
              <SheetTitle>Your writing</SheetTitle>
              <SheetDescription>
                {deviceOnly
                  ? "Entries kept in this browser."
                  : `${projects.length ? `${projects.length.toLocaleString()} ${projects.length === 1 ? "project" : "projects"} · ` : ""}${pieceLabel(pieces.length)}`}
              </SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4">
              {!deviceOnly ? (
                <section aria-labelledby="writing-projects-heading">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3
                      id="writing-projects-heading"
                      className="text-sm font-medium"
                    >
                      Projects
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={props.onNewProject}
                    >
                      New project
                    </Button>
                  </div>
                  {projects.length ? (
                    <ItemGroup>
                      {projects.map((project) => {
                        const inside = pieces.filter(
                          (piece) => piece.projectId === project.id,
                        );
                        const words = inside.reduce(
                          (sum, piece) => sum + piece.wordCount,
                          0,
                        );
                        return (
                          <div role="listitem" key={project.id}>
                            <Item
                              variant="outline"
                              render={
                                <button
                                  type="button"
                                  onClick={() =>
                                    props.onShowProject(project.id)
                                  }
                                />
                              }
                            >
                              <ItemContent>
                                <ItemTitle>{projectName(project)}</ItemTitle>
                                <ItemDescription>
                                  {PROJECT_TEMPLATES[project.template].label} ·{" "}
                                  {pieceLabel(inside.length)} ·{" "}
                                  {wordLabel(words)}
                                </ItemDescription>
                              </ItemContent>
                            </Item>
                          </div>
                        );
                      })}
                    </ItemGroup>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Gather poems into a collection, chapters into a novel, or
                      the parts of an application into one place.
                    </p>
                  )}
                </section>
              ) : null}
              <section aria-labelledby="writing-loose-heading">
                <h3
                  id="writing-loose-heading"
                  className="mb-2 text-sm font-medium"
                >
                  {deviceOnly ? "Entries" : "Loose pieces"}
                </h3>
                {(() => {
                  const loose = pieces
                    .filter(
                      (piece) =>
                        !piece.projectId ||
                        !projects.some(
                          (project) => project.id === piece.projectId,
                        ),
                    )
                    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
                  return loose.length ? (
                    <ItemGroup>
                      {loose.map((piece) => (
                        <div role="listitem" key={piece.id}>
                          <Item>
                            <PieceLink
                              piece={piece}
                              onOpen={props.onOpenPiece}
                            />
                            {!deviceOnly && projects.length ? (
                              <ItemActions>
                                <PieceMenu
                                  piece={piece}
                                  projects={projects}
                                  onMovePiece={props.onMovePiece}
                                />
                              </ItemActions>
                            ) : null}
                          </Item>
                        </div>
                      ))}
                    </ItemGroup>
                  ) : (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>
                          {pieces.length
                            ? "Every piece is in a project"
                            : "No entries yet"}
                        </EmptyTitle>
                        <EmptyDescription>
                          {pieces.length
                            ? "New entries start here until you move them."
                            : "Start writing and your entry appears here."}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  );
                })()}
              </section>
            </div>
            {!deviceOnly && pieces.some((piece) => !piece.local) ? (
              <SheetFooter>
                <Button variant="outline" onClick={props.onDownloadAll}>
                  Download all
                </Button>
                {props.exportError ? (
                  <p className="text-sm text-destructive">
                    {props.exportError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    One plain text file, oldest entry first.
                  </p>
                )}
              </SheetFooter>
            ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PieceMenu({
  piece,
  projects,
  onMovePiece,
  onMove,
  first,
  last,
}: {
  piece: LibraryPiece;
  projects: WritingProject[];
  onMovePiece: (id: string, projectId: string | null) => void;
  onMove?: (step: -1 | 1) => void;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Options for ${pieceName(piece)}`}
          />
        }
      >
        <Ellipsis aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {onMove ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={first} onClick={() => onMove(-1)}>
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem disabled={last} onClick={() => onMove(1)}>
                Move down
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={piece.projectId ?? "loose"}
            onValueChange={(value) =>
              onMovePiece(piece.id, value === "loose" ? null : value)
            }
          >
            {projects.map((project) => (
              <DropdownMenuRadioItem key={project.id} value={project.id}>
                {projectName(project)}
              </DropdownMenuRadioItem>
            ))}
            <DropdownMenuRadioItem value="loose">
              Loose pieces
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectBinder({
  project,
  projects,
  pieces,
  onShowProject,
  onOpenPiece,
  onAddPiece,
  onReorder,
  onMovePiece,
  onRenameProject,
  onDeleteProject,
  onCompile,
  onOutline,
}: WritingLibraryProps & { project: WritingProject }) {
  const [title, setTitle] = useState(project.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inside = pieces
    .filter((piece) => piece.projectId === project.id)
    .sort((a, b) =>
      a.local === b.local ? a.position - b.position : a.local ? 1 : -1,
    );
  const words = inside.reduce((sum, piece) => sum + piece.wordCount, 0);
  const saved = inside.filter((piece) => !piece.local);

  function commitTitle() {
    const next = title.trim();
    if (next !== project.title) onRenameProject(project.id, next);
  }

  function move(index: number, step: -1 | 1) {
    const ids = saved.map((piece) => piece.id);
    const to = index + step;
    if (to < 0 || to >= ids.length) return;
    const [id] = ids.splice(index, 1);
    ids.splice(to, 0, id!);
    onReorder(project.id, ids);
  }

  return (
    <>
      <SheetHeader variant="section">
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => onShowProject(null)}
        >
          <ArrowLeft aria-hidden="true" />
          All writing
        </Button>
        <SheetTitle className="sr-only">{projectName(project)}</SheetTitle>
        <Input
          aria-label="Project title"
          placeholder="Untitled project"
          value={title}
          maxLength={WRITING_TITLE_MAX}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitTitle();
            }
          }}
        />
        <SheetDescription>
          {PROJECT_TEMPLATES[project.template].label} ·{" "}
          {pieceLabel(inside.length)} · {wordLabel(words)}
        </SheetDescription>
        <div className="flex flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPiece(project.id)}
          >
            Add a piece
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!saved.length}
            onClick={() => onOutline(project.id)}
          >
            Outline
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!inside.length}
            onClick={() => onCompile(project.id)}
          >
            Compile
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Project options"
                />
              }
            >
              <Ellipsis aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                Delete project…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {inside.length ? (
          <>
            <p id="writing-binder-hint" className="sr-only">
              Drag a piece by its handle to reorder it, or use its options menu
              to move it up or down.
            </p>
            <Sortable
              value={saved}
              getItemValue={(piece) => piece.id}
              onValueChange={(next) =>
                onReorder(
                  project.id,
                  next.map((piece) => piece.id),
                )
              }
              role="list"
              aria-label={`Pieces in ${projectName(project)}`}
              aria-describedby="writing-binder-hint"
            >
              {saved.map((piece, index) => (
                <SortableItem
                  key={piece.id}
                  value={piece.id}
                  asChild
                  // Reordering by keyboard goes through the options menu, so the row itself is not a drag target.
                  tabIndex={-1}
                  aria-roledescription={undefined}
                  aria-describedby={undefined}
                >
                  <div
                    role="listitem"
                    className="mb-1 rounded-lg bg-background"
                  >
                    <Item size="sm">
                      <SortableItemHandle asChild>
                        <span
                          aria-hidden="true"
                          className="text-muted-foreground"
                        >
                          <GripVertical className="size-4" />
                        </span>
                      </SortableItemHandle>
                      <PieceLink
                        piece={piece}
                        onOpen={onOpenPiece}
                        detail={
                          piece.status
                            ? PIECE_STATUSES[piece.status as PieceStatus]
                            : null
                        }
                      />
                      <ItemActions>
                        <PieceMenu
                          piece={piece}
                          projects={projects}
                          onMovePiece={onMovePiece}
                          onMove={(step) => move(index, step)}
                          first={index === 0}
                          last={index === saved.length - 1}
                        />
                      </ItemActions>
                    </Item>
                  </div>
                </SortableItem>
              ))}
            </Sortable>
            {inside
              .filter((piece) => piece.local)
              .map((piece) => (
                <div key={piece.id} className="mt-1">
                  <Item size="sm">
                    <PieceLink piece={piece} onOpen={onOpenPiece} />
                  </Item>
                </div>
              ))}
          </>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No pieces yet</EmptyTitle>
              <EmptyDescription>
                Add a piece, or move one here from your loose pieces.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{projectName(project)}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {inside.length
                ? `The project is deleted. Its ${pieceLabel(inside.length)} stay in your writing as loose pieces.`
                : "The project is deleted. It has no pieces."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDelete(false);
                onDeleteProject(project.id);
              }}
            >
              Delete project
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function NewProjectDialog({
  open,
  onOpenChange,
  busy,
  error,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  error: string;
  onCreate: (title: string, template: ProjectTemplateId) => void;
}) {
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<ProjectTemplateId>("blank");
  const id = useId();
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(title.trim(), template);
          }}
        >
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              A project keeps pieces together in the order you choose.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
              <Input
                id={`${id}-title`}
                value={title}
                maxLength={WRITING_TITLE_MAX}
                placeholder="Harmattan Poems"
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <FieldSet>
              <FieldLegend variant="label">Start with</FieldLegend>
              <RadioGroup
                value={template}
                onValueChange={(value) =>
                  setTemplate(value as ProjectTemplateId)
                }
              >
                {(
                  Object.entries(PROJECT_TEMPLATES) as [
                    ProjectTemplateId,
                    (typeof PROJECT_TEMPLATES)[ProjectTemplateId],
                  ][]
                ).map(([value, option]) => (
                  <label
                    key={value}
                    htmlFor={`${id}-${value}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <RadioGroupItem id={`${id}-${value}`} value={value} />
                    <span className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-muted-foreground">
                        {option.note}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </FieldSet>
          </FieldGroup>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} aria-busy={busy || undefined}>
              {busy ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WritingOutline({
  open,
  onOpenChange,
  project,
  pieces,
  onCard,
  onOpenPiece,
  planHint = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: WritingProject | undefined;
  pieces: LibraryPiece[];
  onCard: (
    id: string,
    change: { synopsis?: string; status?: PieceStatus },
  ) => void;
  onOpenPiece: (id: string) => void;
  /** Say, once, what the planner adds with Plus. */
  planHint?: boolean;
}) {
  const inside = pieces
    .filter((piece) => piece.projectId === project?.id && !piece.local)
    .sort((a, b) => a.position - b.position);
  const words = inside.reduce((sum, piece) => sum + piece.wordCount, 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Outline{project ? `: ${projectName(project)}` : ""}
          </DialogTitle>
          <DialogDescription>
            {pieceLabel(inside.length)} · {wordLabel(words)}. A synopsis and a
            status for each piece, in order. Only you see them.
          </DialogDescription>
        </DialogHeader>
        {planHint ? (
          <UpgradeHint
            plan="Plus"
            benefit="Index cards with point of view, plotlines and word targets, a corkboard, and an outline with totals."
          />
        ) : null}
        <ol className="flex flex-col gap-4">
          {inside.map((piece, index) => (
            <OutlineCard
              key={`${piece.id}:${piece.synopsis}`}
              piece={piece}
              index={index}
              onCard={onCard}
              onOpenPiece={onOpenPiece}
            />
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

function OutlineCard({
  piece,
  index,
  onCard,
  onOpenPiece,
}: {
  piece: LibraryPiece;
  index: number;
  onCard: (
    id: string,
    change: { synopsis?: string; status?: PieceStatus },
  ) => void;
  onOpenPiece: (id: string) => void;
}) {
  const [synopsis, setSynopsis] = useState(piece.synopsis);
  const id = useId();
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-medium">
          <span className="font-mono text-muted-foreground tabular-nums">
            {index + 1}.
          </span>{" "}
          {pieceName(piece)}
        </h3>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {wordLabel(piece.wordCount)}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Field>
          <FieldLabel htmlFor={`${id}-synopsis`}>Synopsis</FieldLabel>
          <Textarea
            id={`${id}-synopsis`}
            value={synopsis}
            maxLength={PIECE_SYNOPSIS_MAX}
            rows={2}
            placeholder="What happens here, in a line or two."
            onChange={(event) => setSynopsis(event.target.value)}
            onBlur={() => {
              if (synopsis !== piece.synopsis) onCard(piece.id, { synopsis });
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-status`}>Status</FieldLabel>
          <NativeSelect
            id={`${id}-status`}
            value={piece.status}
            onChange={(event) =>
              onCard(piece.id, { status: event.target.value as PieceStatus })
            }
          >
            {(Object.entries(PIECE_STATUSES) as [PieceStatus, string][]).map(
              ([value, label]) => (
                <NativeSelectOption key={value || "none"} value={value}>
                  {label}
                </NativeSelectOption>
              ),
            )}
          </NativeSelect>
          <FieldDescription>
            <Button
              variant="link"
              size="xs"
              onClick={() => onOpenPiece(piece.id)}
            >
              Open this piece
            </Button>
          </FieldDescription>
        </Field>
      </div>
    </li>
  );
}

export function CompileDialog({
  open,
  onOpenChange,
  project,
  busy,
  error,
  defaultPageSize,
  onCompile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: WritingProject | undefined;
  busy: boolean;
  error: string;
  defaultPageSize: PageSizeId;
  onCompile: (options: CompileOptions) => void;
}) {
  const [options, setOptions] = useState<CompileOptions>({
    pageSize: defaultPageSize,
    titlePage: true,
    pieceTitles: true,
  });
  const id = useId();
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            onCompile(options);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              Compile{project ? ` “${projectName(project)}”` : ""}
            </DialogTitle>
            <DialogDescription>
              Every piece, in order, as one manuscript to print, save as PDF or
              download as text. Each page keeps its own format.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-paper`}>Paper size</FieldLabel>
              <NativeSelect
                id={`${id}-paper`}
                value={options.pageSize}
                onChange={(event) =>
                  setOptions({
                    ...options,
                    pageSize: event.target.value as PageSizeId,
                  })
                }
              >
                {Object.entries(PAGE_SIZES).map(([value, size]) => (
                  <NativeSelectOption key={value} value={value}>
                    {size.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id={`${id}-title-page`}
                checked={options.titlePage}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, titlePage: checked === true })
                }
              />
              <FieldLabel htmlFor={`${id}-title-page`}>
                Start with a title page
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id={`${id}-piece-titles`}
                checked={options.pieceTitles}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, pieceTitles: checked === true })
                }
              />
              <FieldLabel htmlFor={`${id}-piece-titles`}>
                Put each piece’s title at the top of its first page
              </FieldLabel>
            </Field>
          </FieldGroup>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} aria-busy={busy || undefined}>
              {busy ? "Compiling…" : "Compile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
