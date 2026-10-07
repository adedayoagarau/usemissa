"use client";

import { useId, useMemo, useState } from "react";
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
  ItemFooter,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { HueTile } from "@/components/missa/hue-tile";
import {
  pieceLabel,
  pieceName,
  projectName,
  wordLabel,
  type LibraryPiece,
} from "@/components/missa/writing-library";
import {
  CARD_NAME_MAX,
  CARD_NOTE_MAX,
  newPlotlineId,
  splitNames,
  targetProgress,
  type PieceCard,
  type Plotline,
  type ProjectPlan,
} from "@/lib/writing-cards";
import {
  PIECE_STATUSES,
  PIECE_SYNOPSIS_MAX,
  type PieceStatus,
  type WritingProject,
} from "@/lib/writing-projects";

/**
 * The planner for a project, part of Plus: an index card on every piece and
 * two ways to see them. The corkboard lays the cards out in binder order or
 * gathered by plotline, status or point of view; a card that carries two
 * plotlines sits in both. The outline is a table with the words written
 * against each target and the totals. Everything here is the writer's own
 * notes; nothing reads the writing.
 */

type Arrange = "order" | "plotline" | "status" | "pov";

export type CardChange = {
  synopsis: string;
  status: PieceStatus;
  card: PieceCard;
};

function statusLabel(status: string) {
  return PIECE_STATUSES[status as PieceStatus] ?? PIECE_STATUSES[""];
}

function progressLabel(words: number, target: number | undefined) {
  const progress = targetProgress(words, target);
  return progress === null
    ? wordLabel(words)
    : `${words.toLocaleString()} of ${target!.toLocaleString()} words`;
}

function PlotlineTags({
  ids,
  plotlines,
}: {
  ids: string[] | undefined;
  plotlines: Plotline[];
}) {
  const carried = plotlines.filter((plotline) => ids?.includes(plotline.id));
  if (!carried.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {carried.map((plotline) => (
        <li key={plotline.id} className="flex items-center gap-1.5 text-xs">
          <HueTile identity={plotline.id} size="sm">
            {plotline.name.slice(0, 1).toUpperCase()}
          </HueTile>
          {plotline.name}
        </li>
      ))}
    </ul>
  );
}

function IndexCard({
  piece,
  number,
  plotlines,
  onEdit,
  onOpenPiece,
}: {
  piece: LibraryPiece;
  number: number;
  plotlines: Plotline[];
  onEdit: () => void;
  onOpenPiece: () => void;
}) {
  const { card } = piece;
  const where = [card.pov, card.place, card.storyTime].filter(Boolean);
  return (
    <li>
      <Item variant="outline" size="sm" className="h-full">
        <ItemContent>
          <ItemTitle>
            <span className="font-mono text-muted-foreground tabular-nums">
              {number}.
            </span>{" "}
            {pieceName(piece)}
          </ItemTitle>
          <ItemDescription>
            {piece.synopsis || "No synopsis yet."}
          </ItemDescription>
          {where.length ? (
            <p className="text-xs text-muted-foreground">{where.join(" · ")}</p>
          ) : null}
          <PlotlineTags ids={card.plotlines} plotlines={plotlines} />
        </ItemContent>
        <ItemFooter>
          <span className="text-xs text-muted-foreground">
            {statusLabel(piece.status)} ·{" "}
            <span className="font-mono tabular-nums">
              {progressLabel(piece.wordCount, card.target)}
            </span>
          </span>
          <ItemActions>
            <Button
              variant="ghost"
              size="xs"
              aria-label={`Edit the card for ${pieceName(piece)}`}
              onClick={onEdit}
            >
              Edit card
            </Button>
            <Button
              variant="ghost"
              size="xs"
              aria-label={`Open ${pieceName(piece)}`}
              onClick={onOpenPiece}
            >
              Open
            </Button>
          </ItemActions>
        </ItemFooter>
      </Item>
    </li>
  );
}

/** The cards gathered into lanes for the chosen arrangement. */
function lanes(
  pieces: LibraryPiece[],
  arrange: Arrange,
  plotlines: Plotline[],
): { key: string; title: string; pieces: LibraryPiece[] }[] {
  if (arrange === "order") return [{ key: "all", title: "", pieces }];
  if (arrange === "plotline") {
    const known = new Set(plotlines.map((plotline) => plotline.id));
    return [
      ...plotlines.map((plotline) => ({
        key: plotline.id,
        title: plotline.name,
        pieces: pieces.filter((piece) =>
          piece.card.plotlines?.includes(plotline.id),
        ),
      })),
      {
        key: "none",
        title: "No plotline",
        pieces: pieces.filter(
          (piece) => !piece.card.plotlines?.some((id) => known.has(id)),
        ),
      },
    ];
  }
  if (arrange === "status")
    return (Object.entries(PIECE_STATUSES) as [PieceStatus, string][]).map(
      ([status, title]) => ({
        key: status || "none",
        title,
        pieces: pieces.filter((piece) => (piece.status || "") === status),
      }),
    );
  const povs = [
    ...new Set(pieces.map((piece) => piece.card.pov).filter(Boolean)),
  ] as string[];
  return [
    ...povs.map((pov) => ({
      key: `pov:${pov}`,
      title: pov,
      pieces: pieces.filter((piece) => piece.card.pov === pov),
    })),
    {
      key: "none",
      title: "No point of view",
      pieces: pieces.filter((piece) => !piece.card.pov),
    },
  ];
}

function CardEditor({
  piece,
  plotlines,
  onCancel,
  onSave,
}: {
  piece: LibraryPiece;
  plotlines: Plotline[];
  onCancel: () => void;
  onSave: (change: CardChange) => void;
}) {
  const id = useId();
  const card = piece.card;
  const [synopsis, setSynopsis] = useState(piece.synopsis);
  const [status, setStatus] = useState(piece.status as PieceStatus);
  const [pov, setPov] = useState(card.pov ?? "");
  const [characters, setCharacters] = useState(
    (card.characters ?? []).join(", "),
  );
  const [place, setPlace] = useState(card.place ?? "");
  const [storyTime, setStoryTime] = useState(card.storyTime ?? "");
  const [carried, setCarried] = useState<string[]>(card.plotlines ?? []);
  const [tags, setTags] = useState((card.tags ?? []).join(", "));
  const [goal, setGoal] = useState(card.goal ?? "");
  const [conflict, setConflict] = useState(card.conflict ?? "");
  const [outcome, setOutcome] = useState(card.outcome ?? "");
  const [target, setTarget] = useState(card.target ? String(card.target) : "");
  const targetNumber = Number(target);
  const targetValid =
    !target || (Number.isInteger(targetNumber) && targetNumber >= 0);

  return (
    <form
      className="flex min-h-0 flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!targetValid) return;
        onSave({
          synopsis,
          status,
          card: {
            pov,
            characters: splitNames(characters),
            place,
            storyTime,
            plotlines: carried,
            tags: splitNames(tags),
            goal,
            conflict,
            outcome,
            target: target ? targetNumber : undefined,
          },
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${id}-synopsis`}>Synopsis</FieldLabel>
          <Textarea
            id={`${id}-synopsis`}
            value={synopsis}
            maxLength={PIECE_SYNOPSIS_MAX}
            rows={2}
            placeholder="What happens here, in a line or two."
            onChange={(event) => setSynopsis(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-status`}>Status</FieldLabel>
            <NativeSelect
              id={`${id}-status`}
              value={status}
              onChange={(event) => setStatus(event.target.value as PieceStatus)}
            >
              {(Object.entries(PIECE_STATUSES) as [PieceStatus, string][]).map(
                ([value, label]) => (
                  <NativeSelectOption key={value || "none"} value={value}>
                    {label}
                  </NativeSelectOption>
                ),
              )}
            </NativeSelect>
          </Field>
          <Field data-invalid={!targetValid || undefined}>
            <FieldLabel htmlFor={`${id}-target`}>Word target</FieldLabel>
            <Input
              id={`${id}-target`}
              inputMode="numeric"
              value={target}
              aria-invalid={!targetValid || undefined}
              placeholder="None"
              onChange={(event) => setTarget(event.target.value.trim())}
            />
            {!targetValid ? (
              <FieldDescription>A whole number of words.</FieldDescription>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-pov`}>Point of view</FieldLabel>
            <Input
              id={`${id}-pov`}
              value={pov}
              maxLength={CARD_NAME_MAX}
              onChange={(event) => setPov(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-characters`}>Characters</FieldLabel>
            <Input
              id={`${id}-characters`}
              value={characters}
              placeholder="Names, separated by commas"
              onChange={(event) => setCharacters(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-place`}>Place</FieldLabel>
            <Input
              id={`${id}-place`}
              value={place}
              maxLength={CARD_NAME_MAX}
              onChange={(event) => setPlace(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-time`}>When</FieldLabel>
            <Input
              id={`${id}-time`}
              value={storyTime}
              maxLength={CARD_NAME_MAX}
              placeholder="Day 3, evening"
              onChange={(event) => setStoryTime(event.target.value)}
            />
          </Field>
        </div>
        {plotlines.length ? (
          <FieldSet>
            <FieldLegend variant="label">Plotlines</FieldLegend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {plotlines.map((plotline) => (
                <div key={plotline.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`${id}-${plotline.id}`}
                    checked={carried.includes(plotline.id)}
                    onCheckedChange={(checked) =>
                      setCarried((list) =>
                        checked
                          ? [...list, plotline.id]
                          : list.filter((item) => item !== plotline.id),
                      )
                    }
                  />
                  <Label htmlFor={`${id}-${plotline.id}`}>
                    {plotline.name}
                  </Label>
                </div>
              ))}
            </div>
          </FieldSet>
        ) : null}
        <Field>
          <FieldLabel htmlFor={`${id}-tags`}>Tags</FieldLabel>
          <Input
            id={`${id}-tags`}
            value={tags}
            placeholder="Separated by commas"
            onChange={(event) => setTags(event.target.value)}
          />
        </Field>
        {(
          [
            ["goal", "Goal", goal, setGoal, "What someone wants here."],
            [
              "conflict",
              "Conflict",
              conflict,
              setConflict,
              "What stands in the way.",
            ],
            [
              "outcome",
              "Outcome",
              outcome,
              setOutcome,
              "How it ends: won, lost, changed.",
            ],
          ] as const
        ).map(([key, label, value, set, placeholder]) => (
          <Field key={key}>
            <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
            <Textarea
              id={`${id}-${key}`}
              value={value}
              maxLength={CARD_NOTE_MAX}
              rows={2}
              placeholder={placeholder}
              onChange={(event) => set(event.target.value)}
            />
          </Field>
        ))}
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!targetValid}>
          Save card
        </Button>
      </DialogFooter>
    </form>
  );
}

function PlotlinesEditor({
  plan,
  onCancel,
  onSave,
}: {
  plan: ProjectPlan;
  onCancel: () => void;
  onSave: (plan: ProjectPlan) => void;
}) {
  const id = useId();
  const [plotlines, setPlotlines] = useState(plan.plotlines);
  const [name, setName] = useState("");
  const named = plotlines.every((plotline) => plotline.name.trim());

  function add() {
    if (!name.trim()) return;
    setPlotlines((list) => [
      ...list,
      { id: newPlotlineId(), name: name.trim() },
    ]);
    setName("");
  }

  return (
    <div className="flex flex-col gap-6">
      {plotlines.length ? (
        <ul className="flex flex-col gap-3">
          {plotlines.map((plotline, index) => (
            <li key={plotline.id} className="flex items-end gap-2">
              <HueTile identity={plotline.id}>
                {plotline.name.slice(0, 1).toUpperCase() || "·"}
              </HueTile>
              <Field className="flex-1">
                <FieldLabel htmlFor={`${id}-${plotline.id}`}>
                  Plotline {index + 1}
                </FieldLabel>
                <Input
                  id={`${id}-${plotline.id}`}
                  value={plotline.name}
                  maxLength={60}
                  onChange={(event) =>
                    setPlotlines((list) =>
                      list.map((item) =>
                        item.id === plotline.id
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <Button
                variant="ghost"
                aria-label={`Remove ${plotline.name || `plotline ${index + 1}`}`}
                onClick={() =>
                  setPlotlines((list) =>
                    list.filter((item) => item.id !== plotline.id),
                  )
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No plotlines yet. A plotline is a thread through the book: the main
          story, a romance, a mystery, one character&apos;s arc.
        </p>
      )}
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Field className="flex-1">
          <FieldLabel htmlFor={`${id}-new`}>New plotline</FieldLabel>
          <Input
            id={`${id}-new`}
            value={name}
            maxLength={60}
            placeholder="The search for the sister"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={!name.trim()}>
          Add
        </Button>
      </form>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!named}
          onClick={() =>
            onSave({
              plotlines: plotlines.map((plotline) => ({
                ...plotline,
                name: plotline.name.trim(),
              })),
            })
          }
        >
          Save plotlines
        </Button>
      </DialogFooter>
    </div>
  );
}

export function WritingPlanner({
  open,
  onOpenChange,
  project,
  pieces,
  onSaveCard,
  onSavePlan,
  onOpenPiece,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: WritingProject | undefined;
  pieces: LibraryPiece[];
  onSaveCard: (id: string, change: CardChange) => void;
  onSavePlan: (projectId: string, plan: ProjectPlan) => void;
  onOpenPiece: (id: string) => void;
}) {
  const [arrange, setArrange] = useState<Arrange>("order");
  const [editing, setEditing] = useState<string | null>(null);
  const [plotlinesOpen, setPlotlinesOpen] = useState(false);
  const plotlines = project?.plan.plotlines ?? [];
  const inside = useMemo(
    () =>
      pieces
        .filter((piece) => piece.projectId === project?.id && !piece.local)
        .sort((a, b) => a.position - b.position),
    [pieces, project?.id],
  );
  const numbers = new Map(inside.map((piece, index) => [piece.id, index + 1]));
  const words = inside.reduce((sum, piece) => sum + piece.wordCount, 0);
  const target = inside.reduce(
    (sum, piece) => sum + (piece.card.target ?? 0),
    0,
  );
  const editingPiece = inside.find((piece) => piece.id === editing);

  return (
    <>
      <Dialog
        open={open && !editingPiece && !plotlinesOpen}
        onOpenChange={onOpenChange}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Plan{project ? `: ${projectName(project)}` : ""}
            </DialogTitle>
            <DialogDescription>
              {pieceLabel(inside.length)} ·{" "}
              {target
                ? `${words.toLocaleString()} of ${target.toLocaleString()} words`
                : wordLabel(words)}
              . A card for each piece, in order. Only you see them.
            </DialogDescription>
          </DialogHeader>
          {inside.length ? (
            <Tabs defaultValue="corkboard">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="corkboard">Corkboard</TabsTrigger>
                  <TabsTrigger value="outline">Outline</TabsTrigger>
                </TabsList>
                <Button
                  variant="outline"
                  onClick={() => setPlotlinesOpen(true)}
                >
                  Plotlines
                  {plotlines.length ? ` (${plotlines.length})` : ""}
                </Button>
              </div>
              <TabsContent
                value="corkboard"
                className="flex flex-col gap-6 pt-4"
              >
                <Field orientation="horizontal" className="w-fit">
                  <FieldLabel htmlFor="writing-planner-arrange">
                    Arrange by
                  </FieldLabel>
                  <NativeSelect
                    id="writing-planner-arrange"
                    value={arrange}
                    onChange={(event) =>
                      setArrange(event.target.value as Arrange)
                    }
                  >
                    <NativeSelectOption value="order">
                      Binder order
                    </NativeSelectOption>
                    <NativeSelectOption value="plotline">
                      Plotline
                    </NativeSelectOption>
                    <NativeSelectOption value="status">
                      Status
                    </NativeSelectOption>
                    <NativeSelectOption value="pov">
                      Point of view
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
                {lanes(inside, arrange, plotlines)
                  .filter((lane) => arrange === "order" || lane.pieces.length)
                  .map((lane) => (
                    <section
                      key={lane.key}
                      aria-label={lane.title || "Cards in binder order"}
                      className="flex flex-col gap-3"
                    >
                      {lane.title ? (
                        <h3 className="text-sm font-medium">
                          {lane.title}{" "}
                          <span className="font-normal text-muted-foreground">
                            · {pieceLabel(lane.pieces.length)}
                          </span>
                        </h3>
                      ) : null}
                      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {lane.pieces.map((piece) => (
                          <IndexCard
                            key={`${lane.key}:${piece.id}`}
                            piece={piece}
                            number={numbers.get(piece.id) ?? 0}
                            plotlines={plotlines}
                            onEdit={() => setEditing(piece.id)}
                            onOpenPiece={() => onOpenPiece(piece.id)}
                          />
                        ))}
                      </ol>
                    </section>
                  ))}
              </TabsContent>
              <TabsContent value="outline" className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Piece</TableHead>
                      <TableHead>Synopsis</TableHead>
                      <TableHead>Point of view</TableHead>
                      <TableHead>Plotlines</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Words</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inside.map((piece, index) => (
                      <TableRow key={piece.id}>
                        <TableCell>
                          <Button
                            variant="link"
                            size="xs"
                            onClick={() => setEditing(piece.id)}
                          >
                            {index + 1}. {pieceName(piece)}
                          </Button>
                        </TableCell>
                        <TableCell tone="muted">
                          <span className="block max-w-xs whitespace-normal">
                            {piece.synopsis}
                          </span>
                        </TableCell>
                        <TableCell>{piece.card.pov}</TableCell>
                        <TableCell>
                          {plotlines
                            .filter((plotline) =>
                              piece.card.plotlines?.includes(plotline.id),
                            )
                            .map((plotline) => plotline.name)
                            .join(", ")}
                        </TableCell>
                        <TableCell>{statusLabel(piece.status)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {progressLabel(piece.wordCount, piece.card.target)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={5}>All pieces</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {target
                          ? `${words.toLocaleString()} of ${target.toLocaleString()} words`
                          : wordLabel(words)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </TabsContent>
            </Tabs>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No pieces in this project yet</EmptyTitle>
                <EmptyDescription>
                  Add a piece from the library, and its card appears here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={open && Boolean(editingPiece)}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Card: {editingPiece ? pieceName(editingPiece) : ""}
            </DialogTitle>
            <DialogDescription>
              Every field is optional. Only you see your cards.
            </DialogDescription>
          </DialogHeader>
          {editingPiece ? (
            <CardEditor
              key={editingPiece.id}
              piece={editingPiece}
              plotlines={plotlines}
              onCancel={() => setEditing(null)}
              onSave={(change) => {
                onSaveCard(editingPiece.id, change);
                setEditing(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={open && plotlinesOpen}
        onOpenChange={(next) => {
          if (!next) setPlotlinesOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Plotlines</DialogTitle>
            <DialogDescription>
              The threads through this project. Cards say which ones they carry.
            </DialogDescription>
          </DialogHeader>
          {project ? (
            <PlotlinesEditor
              key={project.updatedAt}
              plan={project.plan}
              onCancel={() => setPlotlinesOpen(false)}
              onSave={(plan) => {
                onSavePlan(project.id, plan);
                setPlotlinesOpen(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
