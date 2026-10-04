/**
 * Creator fit is an optional ordering signal decided outside this package (a
 * confident, live `creator_opportunity.fit` decision). It only reorders items
 * that the deterministic gates already made eligible: it never adds, removes
 * or re-gates an item, and it never touches scores, contributions or
 * explanations, so every reason a creator reads stays rule-based.
 */
export type CreatorFitLevel = "mismatch" | "weak" | "possible" | "strong";

export const CREATOR_FIT_LEVELS: readonly CreatorFitLevel[] = [
  "mismatch",
  "weak",
  "possible",
  "strong",
];

// An item without a confident fit sits with "possible": no decision is not a demotion.
const TIER: Record<CreatorFitLevel, number> = {
  strong: 0,
  possible: 1,
  weak: 2,
  mismatch: 3,
};
const UNDECIDED_TIER = TIER.possible;

export function isCreatorFitLevel(value: unknown): value is CreatorFitLevel {
  return typeof value === "string" && Object.hasOwn(TIER, value);
}

/**
 * Stable reorder by fit tier. Items for which `isEligible` is false keep their
 * exact positions; eligible items fill the remaining positions in fit order,
 * with the incoming order breaking ties. An empty fit map returns the input
 * order unchanged.
 */
export function orderByCreatorFit<T>(
  items: readonly T[],
  idOf: (item: T) => string,
  fit: ReadonlyMap<string, CreatorFitLevel> | undefined,
  isEligible: (item: T) => boolean = () => true,
): T[] {
  if (!fit || fit.size === 0) return [...items];
  const slots: number[] = [];
  const eligible: Array<{ item: T; index: number; tier: number }> = [];
  items.forEach((item, index) => {
    if (!isEligible(item)) return;
    slots.push(index);
    const level = fit.get(idOf(item));
    eligible.push({ item, index, tier: level ? TIER[level] : UNDECIDED_TIER });
  });
  eligible.sort(
    (left, right) => left.tier - right.tier || left.index - right.index,
  );
  const ordered = [...items];
  slots.forEach((slot, position) => {
    ordered[slot] = eligible[position]!.item;
  });
  return ordered;
}
