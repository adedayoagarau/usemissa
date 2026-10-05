import type {
  ResidencyAmount,
  ResidencyRankingRow,
} from "@missa/radar-adapters";
import type { FactStatus } from "@missa/radar-engine";

/** What the index shows when no source records a fact. */
export const NOT_RECORDED = "Not recorded";

/** "$1,500", "€500", "CA$300" from an amount in the currency the program lists. */
export function money(value: ResidencyAmount): string {
  const code = value.currency?.match(/\(([A-Z]{3})\)/)?.[1];
  if (!code) return value.amount.toLocaleString("en-US");
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value.amount);
  } catch {
    return `${value.amount.toLocaleString("en-US")} ${code}`;
  }
}

type Row = ResidencyRankingRow;

/** Short table values; null when no source records the fact. */
export function costCell(
  row: Pick<Row, "freeToAttend" | "residencyFee">,
): string | null {
  if (row.freeToAttend) return "Free";
  if (row.residencyFee && row.residencyFee.amount > 0)
    return money(row.residencyFee);
  return null;
}

export function stipendCell(
  row: Pick<Row, "hasStipend" | "stipend">,
): string | null {
  if (row.hasStipend && row.stipend) return money(row.stipend);
  if (row.hasStipend === false) return "None";
  return null;
}

export function ratingCell(
  row: Pick<Row, "rating" | "ratingCount">,
): string | null {
  if (row.rating == null || row.ratingCount <= 0) return null;
  return `${row.rating.toFixed(1)} from ${row.ratingCount}`;
}

/** Sentences for the details panel. */
export function costLabel(
  row: Pick<Row, "freeToAttend" | "residencyFee">,
): string {
  if (row.freeToAttend) return "No residency fee";
  if (row.residencyFee && row.residencyFee.amount > 0)
    return `${money(row.residencyFee)} residency fee`;
  return NOT_RECORDED;
}

export function stipendLabel(row: Pick<Row, "hasStipend" | "stipend">): string {
  if (row.hasStipend && row.stipend)
    return `${money(row.stipend)} artist stipend`;
  if (row.hasStipend === false) return "No stipend";
  return NOT_RECORDED;
}

export function mealsLabel(meals: Row["meals"]): string {
  if (meals === "all") return "All meals provided";
  if (meals === "some") return "Some meals provided";
  if (meals === "none") return "No meals provided";
  return NOT_RECORDED;
}

export function studioLabel(privateStudio: Row["privateStudio"]): string {
  if (privateStudio === true) return "Private studio";
  if (privateStudio === false) return "Shared studio";
  return NOT_RECORDED;
}

export function ratingLabel(row: Pick<Row, "rating" | "ratingCount">): string {
  if (row.rating == null || row.ratingCount <= 0) return "No ratings yet";
  return `${row.rating.toFixed(1)} out of 5 from ${row.ratingCount} ${row.ratingCount === 1 ? "rating" : "ratings"}`;
}

export function selectionLabel(
  row: Pick<Row, "acceptedCount" | "applicantPool">,
): string | null {
  if (row.acceptedCount == null || !row.applicantPool) return null;
  const percent = (row.acceptedCount / row.applicantPool) * 100;
  const share = percent < 1 ? "under 1%" : `${Math.round(percent)}%`;
  return `${row.acceptedCount.toLocaleString("en-US")} of ${row.applicantPool.toLocaleString("en-US")} applicants accepted (${share})`;
}

export function applicationFeeLabel(
  row: Pick<Row, "applicationFee">,
): string | null {
  if (!row.applicationFee) return null;
  return row.applicationFee.amount === 0
    ? "No application fee"
    : `${money(row.applicationFee)} to apply`;
}

export function factStatusLabel(status: FactStatus): string {
  if (status === "recorded") return "Recorded";
  if (status === "partial") return "Partly recorded";
  return NOT_RECORDED;
}

/** "artistcommunities.org" from a source URL, for a compact citation. */
export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Filters pass only on recorded facts; an unknown never matches a filter. */
export const residencyFilters = {
  free: (row: Pick<Row, "freeToAttend">) => row.freeToAttend === true,
  stipend: (row: Pick<Row, "hasStipend">) => row.hasStipend === true,
  meals: (row: Pick<Row, "meals">) =>
    row.meals === "all" || row.meals === "some",
  studio: (row: Pick<Row, "privateStudio">) => row.privateStudio === true,
  open: (row: Pick<Row, "openCall">) => row.openCall != null,
};

export type ResidencyFilterId = keyof typeof residencyFilters;

export type ResidencySort =
  "rank" | "rating" | "free" | "stipend" | "selective";

export const RESIDENCY_SORT_LABELS: Record<ResidencySort, string> = {
  rank: "Missa rank",
  rating: "Best rated",
  free: "Free to attend",
  stipend: "Pays a stipend",
  selective: "Most selective",
};

type SortableRow = Pick<
  Row,
  | "rankPosition"
  | "ratingScore"
  | "pillarStatus"
  | "freeToAttend"
  | "hasStipend"
  | "acceptedCount"
  | "applicantPool"
>;

/** Smaller is better; null when no source records the fact. */
function sortValue(sort: ResidencySort, row: SortableRow): number | null {
  switch (sort) {
    case "rank":
      return row.rankPosition;
    case "rating":
      return row.pillarStatus.ratings === "unknown" ? null : -row.ratingScore;
    case "free":
      return row.freeToAttend == null ? null : row.freeToAttend ? 0 : 1;
    case "stipend":
      return row.hasStipend == null ? null : row.hasStipend ? 0 : 1;
    case "selective":
      return row.acceptedCount != null && row.applicantPool
        ? row.acceptedCount / row.applicantPool
        : null;
  }
}

/** Orders rows for a sort: facts not on record go last, ties keep Missa rank. */
export function compareResidencies(sort: ResidencySort) {
  return (a: SortableRow, b: SortableRow): number => {
    const x = sortValue(sort, a);
    const y = sortValue(sort, b);
    if (x == null && y != null) return 1;
    if (y == null && x != null) return -1;
    if (x != null && y != null && x !== y) return x - y;
    return a.rankPosition - b.rankPosition;
  };
}
