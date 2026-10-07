/**
 * The signed-out shortlist on the homepage. Calls a visitor marks before they
 * have an account live in the browser only, labelled as not yet saved, and
 * move into the Tracker once they sign in (see ShortlistSync).
 */

export const SHORTLIST_STORAGE_KEY = "missa.shortlist.v1";
export const SHORTLIST_LIMIT = 12;

export interface ShortlistEntry {
  id: string;
  title: string;
  organization?: string | null;
  deadline?: string | null;
  addedAt: string;
}

export interface ShortlistState {
  version: 1;
  items: ShortlistEntry[];
}

export function emptyShortlist(): ShortlistState {
  return { version: 1, items: [] };
}

function isEntry(value: unknown): value is ShortlistEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    /^[A-Za-z0-9_-]{1,200}$/u.test(entry.id) &&
    typeof entry.title === "string" &&
    typeof entry.addedAt === "string"
  );
}

/** Tolerant: anything malformed reads as an empty shortlist. */
export function parseShortlist(raw: string | null | undefined): ShortlistState {
  if (!raw) return emptyShortlist();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyShortlist();
    const items = (parsed as { items?: unknown }).items;
    if (!Array.isArray(items)) return emptyShortlist();
    const seen = new Set<string>();
    const valid = items.filter((item): item is ShortlistEntry => {
      if (!isEntry(item) || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return { version: 1, items: valid.slice(0, SHORTLIST_LIMIT) };
  } catch {
    return emptyShortlist();
  }
}

export function serializeShortlist(state: ShortlistState): string {
  return JSON.stringify({ version: 1, items: state.items });
}

export function isShortlisted(state: ShortlistState, id: string): boolean {
  return state.items.some((item) => item.id === id);
}

/** Newest first, no duplicates, capped so the bar never becomes a list page. */
export function addToShortlist(
  state: ShortlistState,
  entry: Omit<ShortlistEntry, "addedAt">,
  now: Date = new Date(),
): ShortlistState {
  if (isShortlisted(state, entry.id)) return state;
  const next: ShortlistEntry = { ...entry, addedAt: now.toISOString() };
  return {
    version: 1,
    items: [next, ...state.items].slice(0, SHORTLIST_LIMIT),
  };
}

export function removeFromShortlist(
  state: ShortlistState,
  id: string,
): ShortlistState {
  if (!isShortlisted(state, id)) return state;
  return { version: 1, items: state.items.filter((item) => item.id !== id) };
}

export function toggleShortlist(
  state: ShortlistState,
  entry: Omit<ShortlistEntry, "addedAt">,
  now: Date = new Date(),
): ShortlistState {
  return isShortlisted(state, entry.id)
    ? removeFromShortlist(state, entry.id)
    : addToShortlist(state, entry, now);
}

/** "1 call" / "3 calls": the word creators use for something they can apply to. */
export function shortlistCountLabel(count: number): string {
  return `${count} ${count === 1 ? "call" : "calls"}`;
}
