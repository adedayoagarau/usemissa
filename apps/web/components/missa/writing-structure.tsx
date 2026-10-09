"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/missa/date-picker-field";
import { useConfirm } from "@/components/missa/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import {
  type LibraryPiece,
  pieceName,
} from "@/components/missa/writing-library";
import { PIECE_STATUSES } from "@/lib/writing-projects";
import {
  continuityAlerts,
  filterStructurePieces,
  goalSummary,
  newStructureId,
  STRUCTURE_TEMPLATES,
  structureSchema,
  type StructureState,
} from "@/lib/writing-structure";

function Blank({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
function TextField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  max = 120,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: string;
  max?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState({ source: value, text: value });
  const numberValue = draft.source === value ? draft.text : value;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {type === "date" ? <DatePickerField id={id} value={value} disabled={disabled} onChange={(date) => onChange(date ?? "")} /> : <Input
        id={id}
        type={type}
        value={type === "number" ? numberValue : value}
        maxLength={max}
        disabled={disabled}
        onChange={(event) => {
          if (type === "number")
            setDraft({ source: value, text: event.target.value });
          else onChange(event.target.value);
        }}
        onBlur={() => {
          if (type === "number") onChange(numberValue);
        }}
      />}
    </Field>
  );
}
function Notes({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        value={value}
        maxLength={2000}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
function ChoiceOptions({
  options,
  onChange,
  disabled,
}: {
  options: string[];
  onChange: (options: string[]) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(options.join("\n"));
  return (
    <div className="space-y-2">
      <Notes
        label="Choices, one per line"
        value={draft}
        disabled={disabled}
        onChange={setDraft}
      />
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...new Set(
              draft
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            ),
          ])
        }
      >
        Apply choices
      </Button>
    </div>
  );
}
function Choice({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}
function PieceLinks({
  ids,
  pieces,
  onChange,
  disabled,
}: {
  ids: string[];
  pieces: LibraryPiece[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Appears in</p>
      {pieces.length ? (
        pieces.map((piece) => (
          <Field key={piece.id} orientation="horizontal">
            <Checkbox
              id={`${id}-${piece.id}`}
              disabled={disabled}
              checked={ids.includes(piece.id)}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...ids, piece.id]
                    : ids.filter((value) => value !== piece.id),
                )
              }
            />
            <FieldLabel htmlFor={`${id}-${piece.id}`}>
              {pieceName(piece)}
            </FieldLabel>
          </Field>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          Add a piece to link it here.
        </p>
      )}
      {ids
        .filter((linked) => !pieces.some((piece) => piece.id === linked))
        .map((linked) => (
          <div key={linked} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Linked piece unavailable
            </span>
            <Button
              variant="ghost"
              disabled={disabled}
              onClick={() => onChange(ids.filter((value) => value !== linked))}
            >
              Unlink
            </Button>
          </div>
        ))}
    </div>
  );
}
const kinds = [
  { value: "person", label: "Person" },
  { value: "place", label: "Place" },
  { value: "item", label: "Item" },
];
const rowKinds = [
  { value: "plot", label: "Plot" },
  { value: "argument", label: "Argument" },
  { value: "motif", label: "Motif" },
];
const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Writer-entered structure only. Persistence and account loading belong to the parent. */
export function WritingStructure({
  value,
  onChange,
  pieces,
  readOnly,
}: {
  value: StructureState;
  onChange: (next: StructureState) => void;
  pieces: LibraryPiece[];
  readOnly: boolean;
}) {
  const [error, setError] = useState("");
  const { confirm, dialog: confirmation } = useConfirm();
  const [template, setTemplate] =
    useState<keyof typeof STRUCTURE_TEMPLATES>("narrative");
  const [timelineOrder, setTimelineOrder] = useState("story");
  const [view, setView] = useState<StructureState["savedViews"][number]>({
    id: "current",
    name: "",
    query: "",
    status: "all",
    fieldId: "",
    fieldValue: "",
  });
  const [fieldPiece, setFieldPiece] = useState("");
  const id = useId();
  function update(next: StructureState) {
    if (readOnly) return;
    const result = structureSchema.safeParse(next);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check these entries.");
      return;
    }
    setError("");
    const removed = (["records", "gridRows", "timeline", "customFields", "savedViews"] as const).some((key) => next[key].length < value[key].length);
    if (removed) {
      void confirm({ title: "Remove this planning item?", description: "Your draft text stays unchanged. Save notes and plans to keep this removal.", confirmLabel: "Remove", destructive: true }).then((accepted) => { if (accepted) onChange(result.data); });
    } else onChange(result.data);
  }
  const goal = goalSummary(
    value.goal,
    pieces,
    new Date().toLocaleDateString("en-CA"),
  );
  const alerts = continuityAlerts(value.timeline);
  const filtered = filterStructurePieces(pieces, view, value.pieceValues);
  const selectedPiece =
    pieces.find((piece) => piece.id === fieldPiece) ?? pieces[0];
  const eventOrder = [...value.timeline].sort((a, b) =>
    timelineOrder === "story"
      ? (a.start || "9999").localeCompare(b.start || "9999") ||
        a.id.localeCompare(b.id)
      : a.tellingOrder - b.tellingOrder || a.id.localeCompare(b.id),
  );
  return (
    <section aria-label="Writing structure" className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Your notes, links and dates. These tools use what you enter here.
      </p>
      {readOnly && (
        <p role="status" className="text-sm text-muted-foreground">
          Read only. Your structure is still available.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Tabs defaultValue="records">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="records">People & places</TabsTrigger>
            <TabsTrigger value="grid">Structure grid</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="fields">Custom fields</TabsTrigger>
            <TabsTrigger value="views">Saved views</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="records" className="space-y-4">
          <Button
            disabled={readOnly || value.records.length >= 200}
            onClick={() =>
              update({
                ...value,
                records: [
                  ...value.records,
                  {
                    id: newStructureId(),
                    kind: "person",
                    name: "",
                    notes: "",
                    pieceIds: [],
                  },
                ],
              })
            }
          >
            Add record
          </Button>
          {!value.records.length && (
            <Blank title="No records yet">
              Add a person, place or item, then link the pieces where it
              appears.
            </Blank>
          )}
          {value.records.map((record) => (
            <div key={record.id} className="space-y-4 rounded-lg border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Choice
                  label="Kind"
                  value={record.kind}
                  options={kinds}
                  disabled={readOnly}
                  onChange={(kind) =>
                    update({
                      ...value,
                      records: value.records.map((item) =>
                        item.id === record.id
                          ? { ...item, kind: kind as typeof record.kind }
                          : item,
                      ),
                    })
                  }
                />
                <TextField
                  label="Name"
                  value={record.name}
                  disabled={readOnly}
                  onChange={(name) =>
                    update({
                      ...value,
                      records: value.records.map((item) =>
                        item.id === record.id ? { ...item, name } : item,
                      ),
                    })
                  }
                />
              </div>
              <Notes
                label="Notes"
                value={record.notes}
                disabled={readOnly}
                onChange={(notes) =>
                  update({
                    ...value,
                    records: value.records.map((item) =>
                      item.id === record.id ? { ...item, notes } : item,
                    ),
                  })
                }
              />
              <PieceLinks
                ids={record.pieceIds}
                pieces={pieces}
                disabled={readOnly}
                onChange={(pieceIds) =>
                  update({
                    ...value,
                    records: value.records.map((item) =>
                      item.id === record.id ? { ...item, pieceIds } : item,
                    ),
                  })
                }
              />
              <Button
                variant="outline"
                disabled={readOnly}
                onClick={() =>
                  update({
                    ...value,
                    records: value.records.filter(
                      (item) => item.id !== record.id,
                    ),
                  })
                }
              >
                Remove record
              </Button>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="grid" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Choice
              label="Optional starting rows"
              value={template}
              disabled={readOnly}
              options={Object.entries(STRUCTURE_TEMPLATES).map(
                ([key, entry]) => ({ value: key, label: entry.label }),
              )}
              onChange={(next) =>
                setTemplate(next as keyof typeof STRUCTURE_TEMPLATES)
              }
            />
            <Button
              variant="outline"
              disabled={
                readOnly ||
                value.gridRows.length +
                  STRUCTURE_TEMPLATES[template].rows.length >
                  60
              }
              onClick={() =>
                update({
                  ...value,
                  gridRows: [
                    ...value.gridRows,
                    ...STRUCTURE_TEMPLATES[template].rows.map((label) => ({
                      id: newStructureId(),
                      label,
                      kind: STRUCTURE_TEMPLATES[template].kind,
                      cells: {},
                    })),
                  ],
                })
              }
            >
              Add template
            </Button>
            <Button
              disabled={readOnly || value.gridRows.length >= 60}
              onClick={() =>
                update({
                  ...value,
                  gridRows: [
                    ...value.gridRows,
                    {
                      id: newStructureId(),
                      label: "",
                      kind: "motif",
                      cells: {},
                    },
                  ],
                })
              }
            >
              Add row
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Rows are yours to rename. Add a note at each piece where a plot,
            argument or motif develops.
          </p>
          {!value.gridRows.length ? (
            <Blank title="An empty grid">
              Add your own row or use optional starting rows.
            </Blank>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  {pieces.map((piece) => (
                    <TableHead key={piece.id}>{pieceName(piece)}</TableHead>
                  ))}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {value.gridRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="space-y-2">
                        <TextField
                          label="Row label"
                          value={row.label}
                          disabled={readOnly}
                          onChange={(label) =>
                            update({
                              ...value,
                              gridRows: value.gridRows.map((item) =>
                                item.id === row.id ? { ...item, label } : item,
                              ),
                            })
                          }
                        />
                        <Choice
                          label="Row kind"
                          value={row.kind}
                          options={rowKinds}
                          disabled={readOnly}
                          onChange={(kind) =>
                            update({
                              ...value,
                              gridRows: value.gridRows.map((item) =>
                                item.id === row.id
                                  ? { ...item, kind: kind as typeof row.kind }
                                  : item,
                              ),
                            })
                          }
                        />
                      </div>
                    </TableCell>
                    {pieces.map((piece) => (
                      <TableCell key={piece.id}>
                        <Notes
                          label={`${row.label || "Row"} in ${pieceName(piece)}`}
                          value={row.cells[piece.id] ?? ""}
                          disabled={readOnly}
                          onChange={(text) =>
                            update({
                              ...value,
                              gridRows: value.gridRows.map((item) =>
                                item.id === row.id
                                  ? {
                                      ...item,
                                      cells: {
                                        ...item.cells,
                                        [piece.id]: text,
                                      },
                                    }
                                  : item,
                              ),
                            })
                          }
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        variant="ghost"
                        disabled={readOnly}
                        onClick={() =>
                          update({
                            ...value,
                            gridRows: value.gridRows.filter(
                              (item) => item.id !== row.id,
                            ),
                          })
                        }
                      >
                        Remove row
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!pieces.length && (
            <p className="text-sm text-muted-foreground">
              Add pieces to create grid columns.
            </p>
          )}
        </TabsContent>
        <TabsContent value="goals" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Word target"
              value={String(value.goal.target)}
              type="number"
              disabled={readOnly}
              onChange={(target) =>
                update({
                  ...value,
                  goal: { ...value.goal, target: Number(target) },
                })
              }
            />
            <TextField
              label="Deadline"
              value={value.goal.deadline}
              type="date"
              disabled={readOnly}
              onChange={(deadline) =>
                update({ ...value, goal: { ...value.goal, deadline } })
              }
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Days off</p>
            {weekdays.map((day, index) => (
              <Field key={day} orientation="horizontal">
                <Checkbox
                  id={`${id}-day-${index}`}
                  checked={value.goal.daysOff.includes(index)}
                  disabled={readOnly}
                  onCheckedChange={(checked) =>
                    update({
                      ...value,
                      goal: {
                        ...value.goal,
                        daysOff: checked
                          ? [...value.goal.daysOff, index]
                          : value.goal.daysOff.filter((item) => item !== index),
                      },
                    })
                  }
                />
                <FieldLabel htmlFor={`${id}-day-${index}`}>{day}</FieldLabel>
              </Field>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Choose pieces to count. With none selected, all supplied pieces
            count. This measures current words, including words written before
            the goal.
          </p>
          <PieceLinks
            ids={value.goal.pieceIds}
            pieces={pieces}
            disabled={readOnly}
            onChange={(pieceIds) =>
              update({ ...value, goal: { ...value.goal, pieceIds } })
            }
          />
          {value.goal.target ? (
            <div className="space-y-2">
              <p className="font-mono text-sm">
                {goal.words.toLocaleString()} /{" "}
                {value.goal.target.toLocaleString()} words · {goal.percent}%
              </p>
              <Progress
                value={goal.percent}
                aria-label="Word target progress"
              />
              <p className="text-sm">
                {goal.remaining === 0
                  ? "Target reached."
                  : `${goal.remaining.toLocaleString()} words remaining.`}
              </p>
              {value.goal.deadline && (
                <p className="text-sm">
                  {goal.days
                    ? `${goal.days} writing days, including today and the deadline. ${goal.daily?.toLocaleString()} words per writing day.`
                    : "No writing days remain before this deadline."}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Set a word target to see progress.
            </p>
          )}
        </TabsContent>
        <TabsContent value="timeline" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Choice
              label="Display order"
              value={timelineOrder}
              options={[
                { value: "story", label: "Story dates" },
                { value: "telling", label: "Telling order" },
              ]}
              disabled={false}
              onChange={setTimelineOrder}
            />
            <Button
              disabled={readOnly || value.timeline.length >= 500}
              onClick={() =>
                update({
                  ...value,
                  timeline: [
                    ...value.timeline,
                    {
                      id: newStructureId(),
                      label: "",
                      start: "",
                      end: "",
                      tellingOrder: value.timeline.length + 1,
                      pieceId: "",
                      afterId: "",
                      notes: "",
                    },
                  ],
                })
              }
            >
              Add event
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Story dates and telling order are independent. An earlier date in
            telling order can be intentional. Warnings only check date ranges
            and the earlier-event links you set.
          </p>
          {!value.timeline.length && (
            <Blank title="No events yet">
              Enter dates for the events you want to track.
            </Blank>
          )}
          {eventOrder.map((event) => {
            const change = (patch: Partial<typeof event>) =>
              update({
                ...value,
                timeline: value.timeline.map((item) =>
                  item.id === event.id ? { ...item, ...patch } : item,
                ),
              });
            return (
              <div key={event.id} className="space-y-4 rounded-lg border p-4">
                <TextField
                  label="Event"
                  value={event.label}
                  disabled={readOnly}
                  onChange={(label) => change({ label })}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Story start date"
                    value={event.start}
                    type="date"
                    disabled={readOnly}
                    onChange={(start) => change({ start })}
                  />
                  <TextField
                    label="Story end date"
                    value={event.end}
                    type="date"
                    disabled={readOnly}
                    onChange={(end) => change({ end })}
                  />
                  <TextField
                    label="Telling order"
                    value={String(event.tellingOrder)}
                    type="number"
                    disabled={readOnly}
                    onChange={(order) =>
                      change({ tellingOrder: Number(order) })
                    }
                  />
                  <Choice
                    label="Piece"
                    value={event.pieceId}
                    options={[
                      { value: "", label: "No piece" },
                      ...pieces.map((piece) => ({
                        value: piece.id,
                        label: pieceName(piece),
                      })),
                    ]}
                    disabled={readOnly}
                    onChange={(pieceId) => change({ pieceId })}
                  />
                  <Choice
                    label="Must happen after"
                    value={event.afterId}
                    options={[
                      { value: "", label: "No earlier event" },
                      ...value.timeline
                        .filter((item) => item.id !== event.id)
                        .map((item) => ({
                          value: item.id,
                          label: item.label || "Untitled event",
                        })),
                    ]}
                    disabled={readOnly}
                    onChange={(afterId) => change({ afterId })}
                  />
                </div>
                <Notes
                  label="Event notes"
                  value={event.notes}
                  disabled={readOnly}
                  onChange={(notes) => change({ notes })}
                />
                {alerts
                  .filter((alert) => alert.id === event.id)
                  .map((alert) => (
                    <p key={alert.message} className="text-sm text-warning">
                      Check dates: {alert.message}
                    </p>
                  ))}
                <Button
                  variant="outline"
                  disabled={readOnly}
                  onClick={() =>
                    update({
                      ...value,
                      timeline: value.timeline.filter(
                        (item) => item.id !== event.id,
                      ),
                    })
                  }
                >
                  Remove event
                </Button>
              </div>
            );
          })}
        </TabsContent>
        <TabsContent value="fields" className="space-y-4">
          <Button
            disabled={readOnly || value.customFields.length >= 30}
            onClick={() =>
              update({
                ...value,
                customFields: [
                  ...value.customFields,
                  { id: newStructureId(), name: "", kind: "text", options: [] },
                ],
              })
            }
          >
            Add field
          </Button>
          {!value.customFields.length && (
            <Blank title="Your own fields">
              Add a field for the details you keep track of.
            </Blank>
          )}
          {value.customFields.map((field) => (
            <div key={field.id} className="space-y-3 rounded-lg border p-4">
              <TextField
                label="Field name"
                value={field.name}
                disabled={readOnly}
                onChange={(name) =>
                  update({
                    ...value,
                    customFields: value.customFields.map((item) =>
                      item.id === field.id ? { ...item, name } : item,
                    ),
                  })
                }
              />
              <Choice
                label="Field type"
                value={field.kind}
                disabled={readOnly}
                options={["text", "number", "date", "choice"].map((kind) => ({
                  value: kind,
                  label: kind,
                }))}
                onChange={(kind) =>
                  update({
                    ...value,
                    customFields: value.customFields.map((item) =>
                      item.id === field.id
                        ? { ...item, kind: kind as typeof field.kind }
                        : item,
                    ),
                  })
                }
              />
              {field.kind === "choice" && (
                <ChoiceOptions
                  options={field.options}
                  disabled={readOnly}
                  onChange={(options) =>
                    update({
                      ...value,
                      customFields: value.customFields.map((item) =>
                        item.id === field.id ? { ...item, options } : item,
                      ),
                    })
                  }
                />
              )}
              <Button
                variant="outline"
                disabled={readOnly}
                onClick={() =>
                  update({
                    ...value,
                    customFields: value.customFields.filter(
                      (item) => item.id !== field.id,
                    ),
                    pieceValues: Object.fromEntries(
                      Object.entries(value.pieceValues).map(
                        ([piece, fields]) => [
                          piece,
                          Object.fromEntries(
                            Object.entries(fields).filter(
                              ([key]) => key !== field.id,
                            ),
                          ),
                        ],
                      ),
                    ),
                    savedViews: value.savedViews.map((view) =>
                      view.fieldId === field.id
                        ? { ...view, fieldId: "", fieldValue: "" }
                        : view,
                    ),
                  })
                }
              >
                Remove field
              </Button>
            </div>
          ))}
          <Choice
            label="Piece to edit"
            value={selectedPiece?.id ?? ""}
            options={[
              { value: "", label: "Choose a piece" },
              ...pieces.map((piece) => ({
                value: piece.id,
                label: pieceName(piece),
              })),
            ]}
            onChange={setFieldPiece}
            disabled={!pieces.length}
          />
          {selectedPiece &&
            value.customFields.map((field) => {
              const current =
                value.pieceValues[selectedPiece.id]?.[field.id] ?? "";
              const change = (text: string) =>
                update({
                  ...value,
                  pieceValues: {
                    ...value.pieceValues,
                    [selectedPiece.id]: {
                      ...value.pieceValues[selectedPiece.id],
                      [field.id]: text,
                    },
                  },
                });
              return field.kind === "choice" ? (
                <Choice
                  key={field.id}
                  label={field.name || "Untitled field"}
                  value={current}
                  options={[
                    { value: "", label: "No value" },
                    ...field.options.map((option) => ({
                      value: option,
                      label: option,
                    })),
                  ]}
                  disabled={readOnly}
                  onChange={change}
                />
              ) : (
                <TextField
                  key={field.id}
                  label={field.name || "Untitled field"}
                  value={current}
                  max={2000}
                  type={field.kind === "text" ? "text" : field.kind}
                  disabled={readOnly}
                  onChange={change}
                />
              );
            })}
        </TabsContent>
        <TabsContent value="views" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Search titles and synopses"
              value={view.query}
              max={500}
              disabled={false}
              onChange={(query) => setView({ ...view, query })}
            />
            <Choice
              label="Status"
              value={view.status}
              options={[
                { value: "all", label: "All statuses" },
                ...Object.entries(PIECE_STATUSES).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
              disabled={false}
              onChange={(status) =>
                setView({ ...view, status: status as typeof view.status })
              }
            />
            <Choice
              label="Custom field filter"
              value={view.fieldId}
              options={[
                { value: "", label: "Any field" },
                ...value.customFields.map((field) => ({
                  value: field.id,
                  label: field.name || "Untitled field",
                })),
              ]}
              disabled={false}
              onChange={(fieldId) =>
                setView({ ...view, fieldId, fieldValue: "" })
              }
            />
            {view.fieldId && (
              <TextField
                label="Field equals"
                value={view.fieldValue}
                max={2000}
                disabled={false}
                onChange={(fieldValue) => setView({ ...view, fieldValue })}
              />
            )}
          </div>
          <TextField
            label="View name"
            value={view.name}
            disabled={readOnly}
            onChange={(name) => setView({ ...view, name })}
          />
          <Button
            disabled={
              readOnly || !view.name.trim() || value.savedViews.length >= 50
            }
            onClick={() =>
              update({
                ...value,
                savedViews: [
                  ...value.savedViews,
                  { ...view, id: newStructureId() },
                ],
              })
            }
          >
            Save view
          </Button>
          {value.savedViews.map((saved) => (
            <div key={saved.id} className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setView(saved)}>
                {saved.name || "Untitled view"}
              </Button>
              <Button
                variant="ghost"
                disabled={readOnly}
                aria-label={`Remove ${saved.name || "untitled view"}`}
                onClick={() =>
                  update({
                    ...value,
                    savedViews: value.savedViews.filter(
                      (item) => item.id !== saved.id,
                    ),
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <p role="status" className="text-sm">
            {filtered.length} matching pieces
          </p>
          {filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Piece</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Words</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((piece) => (
                  <TableRow key={piece.id}>
                    <TableCell>{pieceName(piece)}</TableCell>
                    <TableCell>
                      {PIECE_STATUSES[
                        piece.status as keyof typeof PIECE_STATUSES
                      ] ?? "No status"}
                    </TableCell>
                    <TableCell>{piece.wordCount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Blank title="No pieces match">
              Try a different search or fewer filters.
            </Blank>
          )}
        </TabsContent>
      </Tabs>
      {confirmation}
    </section>
  );
}
