import type { MagazineRankingRow } from "@missa/radar-adapters";
import type {
  ContributorPayKind,
  FactStatus,
  PillarStatusMap,
  RankedMagazinePlanningCandidate,
  ResponseTimeBand,
  SimultaneousPolicy,
} from "@missa/radar-engine";
// Client components use this file, so take values from the ranking module
// itself: the package root also exports Node-only modules (node:fs).
import {
  PILLAR_MAX,
  PRO_PAY_THRESHOLDS,
} from "@missa/radar-engine/dist/src/ranking/magazineRankingEngine.js";

/** What the index shows when no source records a fact. */
export const NOT_RECORDED = "Not recorded";

type FeeFacts = {
  regularFeeCents: number | null;
  chargesReadingFee?: boolean | null;
};
type PayFacts = {
  contributorPayCents: number | null;
  payKind?: ContributorPayKind | null;
};
type ResponseFacts = {
  medianResponseDays: number | null;
  responseTimeBand?: ResponseTimeBand | null;
};

const RESPONSE_BAND_LABELS: Record<ResponseTimeBand, string> = {
  under_3_months: "Under 3 months",
  "3_to_6_months": "3 to 6 months",
  over_6_months: "Over 6 months",
};

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function feeLabel(row: FeeFacts): string {
  if (row.regularFeeCents === 0 || row.chargesReadingFee === false)
    return "No submission fee";
  if (row.regularFeeCents != null)
    return `${dollars(row.regularFeeCents)} submission fee`;
  if (row.chargesReadingFee) return "Charges a fee (amount not recorded)";
  return `Fee: ${NOT_RECORDED.toLowerCase()}`;
}

export function payLabel(row: PayFacts): string {
  if (row.contributorPayCents != null && row.contributorPayCents > 0) {
    return `Pays ${dollars(row.contributorPayCents)}`;
  }
  if (row.payKind === "cash") return "Pays (amount not recorded)";
  if (row.payKind === "copies_only") return "Contributor copies";
  if (row.payKind === "unpaid") return "Unpaid";
  return `Pay: ${NOT_RECORDED.toLowerCase()}`;
}

export function responseLabel(row: ResponseFacts): string {
  if (row.medianResponseDays != null)
    return `${row.medianResponseDays} days median`;
  if (row.responseTimeBand)
    return `${RESPONSE_BAND_LABELS[row.responseTimeBand]} (listed)`;
  return NOT_RECORDED;
}

export function simultaneousLabel(policy: SimultaneousPolicy | null): string {
  if (policy === "allowed") return "Simultaneous submissions welcome";
  if (policy === "conditional")
    return "Simultaneous submissions with conditions";
  if (policy === "forbidden") return "No simultaneous submissions";
  return `Simultaneous policy ${NOT_RECORDED.toLowerCase()}`;
}

export function factStatusLabel(status: FactStatus): string {
  if (status === "recorded") return "Recorded";
  if (status === "partial") return "Range recorded";
  return NOT_RECORDED;
}

/** Filters pass only on recorded facts; an unknown never matches a filter. */
export const magazineFilters = {
  free: (row: FeeFacts) =>
    row.regularFeeCents === 0 || row.chargesReadingFee === false,
  paying: (row: PayFacts) =>
    row.payKind === "cash" || (row.contributorPayCents ?? 0) > 0,
  /** Same threshold the pay pillar uses: a recorded pro rate earns full points. */
  pro: (row: { payScore: number; pillarStatus: PillarStatusMap }) =>
    row.pillarStatus.pay === "recorded" && row.payScore >= PILLAR_MAX.pay,
  debut: (row: { debutFriendly: boolean | null }) => row.debutFriendly === true,
  simultaneous: (row: { simultaneousPolicy: SimultaneousPolicy | null }) =>
    row.simultaneousPolicy === "allowed",
  fast: (row: ResponseFacts) =>
    row.medianResponseDays != null
      ? row.medianResponseDays <= 90
      : row.responseTimeBand === "under_3_months",
};

export type MagazineFilterId = keyof typeof magazineFilters;

export const PRO_PAY_LABEL = `Pro pay (${PRO_PAY_THRESHOLDS.perWordCents}¢+/word, $${
  PRO_PAY_THRESHOLDS.perPoemCents / 100
}+/poem or $${PRO_PAY_THRESHOLDS.perPieceCents / 100}+/piece)`;

/** Portfolio-plan candidate built from a stored ranking row, facts unchanged. */
export function planningCandidate(
  item: MagazineRankingRow,
): RankedMagazinePlanningCandidate {
  return {
    profileId: item.profileId,
    name: item.name,
    slug: item.slug,
    websiteUrl: item.websiteUrl,
    rankPosition: item.rankPosition,
    totalScore: item.totalScore,
    prestigeTier: item.prestigeTier,
    medianResponseDays: item.medianResponseDays,
    responseTimeBand: item.responseTimeBand,
    regularFeeCents: item.regularFeeCents,
    chargesReadingFee: item.chargesReadingFee,
    contributorPayCents: item.contributorPayCents,
    payKind: item.payKind,
    simultaneousPolicy: item.simultaneousPolicy,
    debutFriendly: item.debutFriendly,
    formatEthicsScore: item.formatEthicsScore,
    activeOpportunity: item.activeOpportunity,
    schedule: item.schedule,
  };
}

/** Short cell values for the rankings table; null when no source records the fact. */
export function feeCell(row: FeeFacts): string | null {
  if (row.regularFeeCents === 0 || row.chargesReadingFee === false)
    return "Free";
  if (row.regularFeeCents != null) return dollars(row.regularFeeCents);
  if (row.chargesReadingFee) return "Charged";
  return null;
}

export function payCell(
  row: PayFacts & { payScore: number; pillarStatus: PillarStatusMap },
): string | null {
  if (magazineFilters.pro(row)) return "Pro rate";
  if (row.payKind === "cash" || (row.contributorPayCents ?? 0) > 0)
    return "Pays";
  if (row.payKind === "copies_only") return "Copies";
  if (row.payKind === "unpaid") return "Unpaid";
  return null;
}

export function replyCell(row: ResponseFacts): string | null {
  if (row.medianResponseDays != null) return `${row.medianResponseDays} days`;
  if (row.responseTimeBand) return RESPONSE_BAND_LABELS[row.responseTimeBand];
  return null;
}

/** "pw.org" from a source URL, for a compact citation. */
export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const GENRE_WORDS = {
  fiction: "fiction",
  poetry: "poetry",
  nonfiction: "nonfiction",
} as const;

/**
 * The honours behind a magazine's score, in words: its Pushcart tally rank
 * and the anthology selections counted. An empty list means none on record.
 */
export function honoursLines(
  row: Pick<
    MagazineRankingRow,
    "genre" | "pushcartRank" | "pushcartGenre" | "anthologySelections"
  >,
): string[] {
  const lines: string[] = [];
  if (row.pushcartRank != null) {
    const genre =
      row.genre === "overall" && row.pushcartGenre
        ? ` in ${GENRE_WORDS[row.pushcartGenre]}`
        : "";
    lines.push(`Pushcart rank ${row.pushcartRank}${genre}`);
  }
  if (row.anthologySelections > 0) {
    lines.push(
      `${row.anthologySelections} anthology ${row.anthologySelections === 1 ? "pick" : "picks"}`,
    );
  }
  return lines;
}

export type MagazineSort = "rank" | "honours" | "fee" | "pay" | "replies";

export const MAGAZINE_SORT_LABELS: Record<MagazineSort, string> = {
  rank: "Missa rank",
  honours: "Most honored",
  fee: "Lowest fee",
  pay: "Best pay",
  replies: "Fastest replies",
};

const BAND_DAYS: Record<ResponseTimeBand, number> = {
  under_3_months: 45,
  "3_to_6_months": 135,
  over_6_months: 270,
};

type SortableRow = Pick<
  MagazineRankingRow,
  | "rankPosition"
  | "accoladesScore"
  | "regularFeeCents"
  | "chargesReadingFee"
  | "contributorPayCents"
  | "payKind"
  | "payScore"
  | "pillarStatus"
  | "medianResponseDays"
  | "responseTimeBand"
>;

/** Smaller is better; null when no source records the fact. */
function sortValue(sort: MagazineSort, row: SortableRow): number | null {
  switch (sort) {
    case "rank":
      return row.rankPosition;
    case "honours":
      return -row.accoladesScore;
    case "fee":
      if (row.regularFeeCents === 0 || row.chargesReadingFee === false)
        return 0;
      if (row.regularFeeCents != null) return row.regularFeeCents;
      return row.chargesReadingFee ? Number.MAX_SAFE_INTEGER : null;
    case "pay": {
      const pay = payCell(row);
      if (pay === "Pro rate") return 0;
      if (pay === "Pays") return 1;
      if (pay === "Copies") return 2;
      if (pay === "Unpaid") return 3;
      return null;
    }
    case "replies":
      if (row.medianResponseDays != null) return row.medianResponseDays;
      return row.responseTimeBand ? BAND_DAYS[row.responseTimeBand] : null;
  }
}

/** Orders rows for a sort: facts not on record go last, ties keep Missa rank. */
export function compareMagazines(sort: MagazineSort) {
  return (a: SortableRow, b: SortableRow): number => {
    const x = sortValue(sort, a);
    const y = sortValue(sort, b);
    if (x == null && y != null) return 1;
    if (y == null && x != null) return -1;
    if (x != null && y != null && x !== y) return x - y;
    return a.rankPosition - b.rankPosition;
  };
}
