/**
 * The planner's index cards: what a writer notes about each piece of a
 * project (point of view, who is in it, where and when, the plotlines it
 * carries, its goal, conflict and outcome, a word target), and the project's
 * plotlines. Every field is optional; writers start with a few and add more.
 * Pure data and checks, shared by the browser and the server. Nothing here
 * reads the writing itself.
 */

export type PieceCard = {
  /** Whose eyes the piece is seen through. */
  pov?: string;
  /** Who is in it. */
  characters?: string[];
  place?: string;
  /** When it happens in the story, in the writer's words: "Day 3, evening". */
  storyTime?: string;
  /** Ids of the project's plotlines this piece carries. */
  plotlines?: string[];
  tags?: string[];
  goal?: string;
  conflict?: string;
  outcome?: string;
  /** Words the writer means this piece to have. */
  target?: number;
};

export type Plotline = { id: string; name: string };

/** What a project keeps for its planner. */
export type ProjectPlan = { plotlines: Plotline[] };

export const CARD_NAME_MAX = 120;
export const CARD_NOTE_MAX = 500;
export const CARD_LIST_MAX = 40;
export const PLOTLINES_MAX = 30;
export const TARGET_MAX = 1_000_000;

const PLOTLINE_ID = /^plot_[0-9a-z]{6,40}$/;

export function newPlotlineId(): string {
  return `plot_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export const EMPTY_PLAN: ProjectPlan = { plotlines: [] };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, max: number): string | undefined | false {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > max) return false;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function list(
  value: unknown,
  max: number,
  itemMax: number,
  valid: (item: string) => boolean = () => true,
): string[] | undefined | false {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > max) return false;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length > itemMax) return false;
    const trimmed = item.trim();
    if (!trimmed || !valid(trimmed)) return false;
    if (!items.includes(trimmed)) items.push(trimmed);
  }
  return items.length ? items : undefined;
}

/** Checks a card from storage or the network; empty fields are dropped. */
export function parseCard(value: unknown): PieceCard | { error: string } {
  const source = record(value);
  if (!source) return { error: "The card could not be read." };
  const card: PieceCard = {};
  for (const key of ["pov", "place", "storyTime"] as const) {
    const parsed = text(source[key], CARD_NAME_MAX);
    if (parsed === false)
      return { error: `Keep each name to ${CARD_NAME_MAX} characters.` };
    if (parsed) card[key] = parsed;
  }
  for (const key of ["goal", "conflict", "outcome"] as const) {
    const parsed = text(source[key], CARD_NOTE_MAX);
    if (parsed === false)
      return { error: `Keep each note to ${CARD_NOTE_MAX} characters.` };
    if (parsed) card[key] = parsed;
  }
  const characters = list(source.characters, CARD_LIST_MAX, CARD_NAME_MAX);
  if (characters === false)
    return { error: "The characters could not be read." };
  if (characters) card.characters = characters;
  const tags = list(source.tags, CARD_LIST_MAX, 60);
  if (tags === false) return { error: "The tags could not be read." };
  if (tags) card.tags = tags;
  const plotlines = list(source.plotlines, PLOTLINES_MAX, 50, (id) =>
    PLOTLINE_ID.test(id),
  );
  if (plotlines === false) return { error: "The plotlines could not be read." };
  if (plotlines) card.plotlines = plotlines;
  const target = source.target;
  if (target !== undefined && target !== null && target !== 0) {
    if (
      typeof target !== "number" ||
      !Number.isInteger(target) ||
      target < 0 ||
      target > TARGET_MAX
    )
      return { error: "A word target is a whole number of words." };
    card.target = target;
  }
  return card;
}

/** A card read from storage, or an empty card when it is not one. */
export function storedCard(value: unknown): PieceCard {
  const parsed = parseCard(value ?? {});
  return "error" in parsed ? {} : parsed;
}

/** Checks a project's plan: plotlines with unique ids and names. */
export function parseProjectPlan(
  value: unknown,
): ProjectPlan | { error: string } {
  const source = record(value);
  if (!source) return { error: "The plan could not be read." };
  const raw = source.plotlines ?? [];
  if (!Array.isArray(raw) || raw.length > PLOTLINES_MAX)
    return { error: `A project can have up to ${PLOTLINES_MAX} plotlines.` };
  const plotlines: Plotline[] = [];
  for (const item of raw) {
    const plotline = record(item);
    const id = plotline?.id;
    const name = text(plotline?.name, 60);
    if (typeof id !== "string" || !PLOTLINE_ID.test(id) || !name)
      return { error: "Each plotline needs a name of up to 60 characters." };
    if (plotlines.some((existing) => existing.id === id))
      return { error: "Each plotline needs its own id." };
    plotlines.push({ id, name });
  }
  return { plotlines };
}

/** A plan read from storage, or an empty plan when it is not one. */
export function storedPlan(value: unknown): ProjectPlan {
  const parsed = parseProjectPlan(value ?? {});
  return "error" in parsed ? EMPTY_PLAN : parsed;
}

/** Splits "Ada, Kemi, Tunde" or one name per line into names. */
export function splitNames(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,\n]/u)
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
}

/** Words written against a target, for progress: 0 to 1, or null without a target. */
export function targetProgress(words: number, target: number | undefined) {
  return target ? Math.min(1, words / target) : null;
}
