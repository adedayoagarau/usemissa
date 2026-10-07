/**
 * Picks the live calls the homepage's product examples are drawn from: the
 * hero tour, the feature cards and the closing panel. Pure, so it is tested
 * in homepageShowcase.test.ts.
 */

export type ShowcaseSource = {
  id: string;
  title: string;
  type?: string;
  organizationName?: string | null;
  deadline: { kind: string; date?: string | null };
};

export type VignetteCall = {
  id: string;
  title: string;
  /** The raw call type, for the illustrated cover. */
  type: string;
  typeLabel: string;
  organizationName: string | null;
  /** ISO date (YYYY-MM-DD) of the deadline. */
  date: string;
  /** Whole days from today to the deadline, at least 1. */
  daysLeft: number;
};

export type Showcase = {
  /** Closes within a week, so it shows the urgency badge. */
  urgent: VignetteCall | null;
  /** Two weeks or more away, from another organization. */
  lead: VignetteCall | null;
};

const TYPE_LABELS: Record<string, string> = {
  "open-call": "Open call",
  grant: "Grant",
  residency: "Residency",
  award: "Award",
  fellowship: "Fellowship",
  magazine: "Magazine",
  contest: "Contest",
  exhibition: "Exhibition",
};

/** The card's type label, as opportunity-browse-project-card.tsx prints it. */
export function typeLabel(type: string | undefined) {
  if (!type) return "Open call";
  return (
    TYPE_LABELS[type] ??
    type.replace(/-/g, " ").replace(/^./, (character) => character.toUpperCase())
  );
}

function noon(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).getTime();
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((noon(toIso) - noon(fromIso)) / 86_400_000);
}

/**
 * Titles set in capitals read as shouting at vignette scale: mostly capitals,
 * or two or more capitalised words ("2026 EVENT ... STUDENTS").
 */
export function shouts(title: string) {
  const letters = title.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 12 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6) {
    return true;
  }
  return (title.match(/\b[A-Z]{4,}\b/g) ?? []).length >= 2;
}

/**
 * Imported names sometimes arrive as run-together slugs ("Driftdribblemiscellany",
 * "Eventmagazine"): one long word, capitalised only at the start.
 */
export function sluglike(name: string | null | undefined) {
  if (!name || /\s/.test(name)) return false;
  return name.length > 14 || (name.length >= 10 && /^[A-Z]?[a-z]+$/.test(name));
}

/**
 * Only clean, dated calls with at least a day left qualify, so every date an
 * example shows is still ahead of the visitor; the two picks come from
 * different organizations.
 */
export function pickShowcase(pool: ShowcaseSource[], today: string): Showcase {
  const seen = new Set<string>();
  const calls = pool
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return (
        item.deadline.kind === "exact" &&
        Boolean(item.deadline.date) &&
        Number.isFinite(Date.parse(item.deadline.date ?? "")) &&
        item.title.length <= 90 &&
        !shouts(item.title) &&
        !sluglike(item.organizationName)
      );
    })
    .map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type ?? "open-call",
      typeLabel: typeLabel(item.type),
      organizationName: item.organizationName ?? null,
      date: item.deadline.date!.slice(0, 10),
      daysLeft: daysBetween(today, item.deadline.date!),
    }))
    .filter((call) => call.daysLeft >= 1)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const urgent =
    calls.find((call) => call.daysLeft >= 2 && call.daysLeft <= 7) ?? calls[0] ?? null;
  const owner = (call: VignetteCall) => call.organizationName ?? call.title;
  const other = (call: VignetteCall) =>
    call.id !== urgent?.id && (!urgent || owner(call) !== owner(urgent));
  const lead =
    calls.find((call) => call.daysLeft >= 14 && other(call)) ??
    calls.find(other) ??
    null;
  return { urgent, lead };
}

/** The reminder a creator receives a week before the deadline, never later. */
export function weekBeforeReminder(call: VignetteCall): VignetteCall {
  return { ...call, daysLeft: Math.min(7, call.daysLeft) };
}
