import { z } from "zod";

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const note = z.string().max(2000);
const name = z.string().max(120);
const date = z
  .string()
  .refine(
    (value) => value === "" || validDate(value),
    "Use a real calendar date.",
  );
const values = z
  .record(id, note)
  .refine((v) => Object.keys(v).length <= 500, "Too many values.");
export const structureRecordSchema = z.object({
  id,
  kind: z.enum(["person", "place", "item"]),
  name,
  notes: note.default(""),
  pieceIds: z.array(id).max(500).default([]),
});
export const gridRowSchema = z.object({
  id,
  kind: z.enum(["plot", "argument", "motif"]),
  label: name,
  cells: values.default({}),
});
export const timelineEventSchema = z.object({
  id,
  label: name,
  pieceId: id.or(z.literal("")).default(""),
  start: date.default(""),
  end: date.default(""),
  tellingOrder: z.number().int().min(0).max(10000).default(0),
  afterId: id.or(z.literal("")).default(""),
  notes: note.default(""),
});
export const customFieldSchema = z.object({
  id,
  name,
  kind: z.enum(["text", "number", "date", "choice"]),
  options: z.array(z.string().min(1).max(120)).max(40).default([]),
});
export const savedViewSchema = z.object({
  id,
  name,
  query: z.string().max(500).default(""),
  status: z
    .enum(["all", "", "idea", "draft", "revised", "final"])
    .default("all"),
  fieldId: id.or(z.literal("")).default(""),
  fieldValue: note.default(""),
});
const coreSchema = z.object({
  records: z.array(structureRecordSchema).max(200).default([]),
  gridRows: z.array(gridRowSchema).max(60).default([]),
  goal: z
    .object({
      target: z.number().int().min(0).max(10000000).default(0),
      deadline: date.default(""),
      daysOff: z.array(z.number().int().min(0).max(6)).max(7).default([]),
      pieceIds: z.array(id).max(500).default([]),
    })
    .default({}),
  timeline: z.array(timelineEventSchema).max(500).default([]),
  customFields: z.array(customFieldSchema).max(30).default([]),
  pieceValues: z
    .record(id, values)
    .default({})
    .refine((v) => Object.keys(v).length <= 500, "Too many pieces."),
  savedViews: z.array(savedViewSchema).max(50).default([]),
});
export interface StructureState extends z.infer<typeof coreSchema> {
  records: z.infer<typeof structureRecordSchema>[];
}
export const structureSchema = coreSchema.superRefine((state, ctx) => {
  for (const key of [
    "records",
    "gridRows",
    "timeline",
    "customFields",
    "savedViews",
  ] as const) {
    const ids = state[key].map((item) => item.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: "Each entry needs its own id.",
      });
  }
  for (const [pieceId, fields] of Object.entries(state.pieceValues))
    for (const [fieldId, value] of Object.entries(fields)) {
      const field = state.customFields.find((item) => item.id === fieldId);
      if (
        !field ||
        (value &&
          ((field.kind === "date" && !validDate(value)) ||
            (field.kind === "number" &&
              (!/^-?\d+(\.\d+)?$/.test(value) ||
                !Number.isFinite(Number(value)))) ||
            (field.kind === "choice" && !field.options.includes(value))))
      )
        ctx.addIssue({
          code: "custom",
          path: ["pieceValues", pieceId, fieldId],
          message: "Check this field value.",
        });
    }
});
export const EMPTY_STRUCTURE: StructureState = coreSchema.parse({});
export function newStructureId() {
  return `structure_${crypto.randomUUID().replaceAll("-", "")}`;
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
/** Inclusive calendar arithmetic in UTC; no DST or automatic prose interpretation. */
export function writingDays(
  today: string,
  deadline: string,
  daysOff: number[],
) {
  if (!validDate(today) || !validDate(deadline) || deadline < today) return 0;
  const start = Date.parse(`${today}T00:00:00Z`);
  const total =
    Math.floor((Date.parse(`${deadline}T00:00:00Z`) - start) / 86400000) + 1;
  const off = new Set(
    daysOff.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
  );
  const weeks = Math.floor(total / 7);
  let count = weeks * (7 - off.size);
  const weekday = new Date(start).getUTCDay();
  for (let index = 0; index < total % 7; index++)
    if (!off.has((weekday + index) % 7)) count++;
  return count;
}
export function goalSummary(
  goal: StructureState["goal"],
  pieces: { id: string; wordCount: number }[],
  today: string,
) {
  const words = pieces
    .filter(
      (piece) => !goal.pieceIds.length || goal.pieceIds.includes(piece.id),
    )
    .reduce((sum, piece) => sum + Math.max(0, piece.wordCount), 0);
  const remaining = Math.max(0, goal.target - words);
  const days = writingDays(today, goal.deadline, goal.daysOff);
  return {
    words,
    remaining,
    days,
    daily: days ? Math.ceil(remaining / days) : null,
    percent: goal.target
      ? Math.min(100, Math.round((words / goal.target) * 100))
      : 0,
  };
}
export function continuityAlerts(
  events: StructureState["timeline"],
): { id: string; message: string }[] {
  return events.flatMap((event) => {
    const messages: string[] = [];
    if (event.start && event.end && event.end < event.start)
      messages.push("The end date is before the start date.");
    const previous = events.find((item) => item.id === event.afterId);
    if (event.afterId && !previous)
      messages.push("The event marked as earlier is missing.");
    if (
      previous &&
      event.start &&
      (previous.end || previous.start) &&
      event.start < (previous.end || previous.start)
    )
      messages.push(
        `Starts before ${previous.label || "the earlier event"} ends.`,
      );
    const visited = new Set([event.id]);
    let cursor = previous;
    while (cursor) {
      if (visited.has(cursor.id)) {
        messages.push("The earlier-event links form a loop.");
        break;
      }
      visited.add(cursor.id);
      cursor = events.find((item) => item.id === cursor?.afterId);
    }
    return messages.map((message) => ({ id: event.id, message }));
  });
}
export function filterStructurePieces<
  T extends { id: string; title: string; synopsis: string; status: string },
>(
  pieces: T[],
  view: z.infer<typeof savedViewSchema>,
  pieceValues: StructureState["pieceValues"],
) {
  const query = view.query.toLocaleLowerCase();
  return pieces.filter(
    (piece) =>
      (view.status === "all" || view.status === piece.status) &&
      `${piece.title}\n${piece.synopsis}`.toLocaleLowerCase().includes(query) &&
      (!view.fieldId ||
        (pieceValues[piece.id]?.[view.fieldId] ?? "") === view.fieldValue),
  );
}
export const STRUCTURE_TEMPLATES = {
  narrative: {
    label: "Narrative",
    kind: "plot",
    rows: ["Opening", "Change", "Consequences", "Ending"],
  },
  essay: {
    label: "Essay",
    kind: "argument",
    rows: ["Question", "Claim", "Evidence", "Counterpoint"],
  },
  collection: {
    label: "Collection",
    kind: "motif",
    rows: ["Recurring image", "Theme", "Connection"],
  },
} as const;
