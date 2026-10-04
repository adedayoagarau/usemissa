/**
 * Missa's submission decision model.
 *
 * Deterministic by construction: no randomness, no clock reads and no
 * language model. The same brief, the same recorded facts and the same
 * `asOf` date always give the same scores, the same order and the same plan.
 * Every point a score moves comes with a reason the writer can read, and a
 * fact Missa has not recorded never moves a score.
 *
 * 1. Rules: a magazine whose recorded guidelines rule the piece out is
 *    excluded, with the reason, instead of being marked down.
 * 2. Four scores, each 0 to 100 from a neutral 50:
 *    - fit: will this magazine want this piece?
 *    - odds: how likely is an acceptance? Prestige only ever lowers it.
 *    - payoff: what does an acceptance give the writer?
 *    - cost: what does submitting cost in fees, waiting and exclusivity?
 * 3. A tier from the odds score (long shot, good fit, likely) and a plan of
 *    rounds: magazines that allow simultaneous submissions go out together,
 *    exclusive ones one at a time.
 *
 * Change a weight or rule → bump DECISION_MODEL_VERSION.
 */
import {
  PRIZE_ROUTES,
  normalizeWriterName,
  writerKinship,
  type VenueRecognition,
} from "../literary/index.js";

export const DECISION_MODEL_VERSION = "1.0.0";

export type DecisionDimension = "fit" | "odds" | "payoff" | "cost";
export const DECISION_DIMENSIONS: DecisionDimension[] = [
  "fit",
  "odds",
  "payoff",
  "cost",
];

/** How the four scores combine into one ranking score. */
export const DECISION_WEIGHTS: Record<
  "standard" | "debut",
  Record<DecisionDimension, number>
> = {
  standard: { fit: 0.4, odds: 0.25, payoff: 0.2, cost: 0.15 },
  // A writer without publications gains most from a realistic acceptance.
  debut: { fit: 0.35, odds: 0.35, payoff: 0.15, cost: 0.15 },
};

/** Prestige marks odds down harder for a debut writer. */
export const DEBUT_PRESTIGE_MULTIPLIER = 1.5;

export const TIER_THRESHOLDS = { longShotBelow: 40, likelyFrom: 60 };

/** Picks per tier in a plan: a couple of reaches, mostly realistic choices. */
export const PLAN_SHAPE: Record<PlanTier, number> = {
  long_shot: 2,
  good_fit: 4,
  likely: 4,
};

export interface DecisionReason {
  text: string;
  /** Points this fact moved the score by; negative lowers it. */
  points: number;
}

export interface DimensionScore {
  score: number;
  /** False when no recorded fact moved the score off neutral. */
  known: boolean;
  reasons: DecisionReason[];
}

export type PlanTier = "long_shot" | "good_fit" | "likely";

export type ExclusionKind =
  "length" | "form" | "simultaneous" | "fee" | "pay" | "closed";

export interface Exclusion {
  kind: ExclusionKind;
  reason: string;
}

export interface ReadingWindow {
  /** The period as recorded, e.g. "Feb 1 to Mar 31". */
  label: string;
  allYear: boolean;
  openNow: boolean;
  /** ISO date the next window opens, when closed. */
  opensOn: string | null;
  /** ISO date the current window closes, when open and not all year. */
  closesOn: string | null;
}

export interface PrizeRouteMatch {
  id: string;
  name: string;
  rule: string;
  /** Recorded winners or picks this magazine first published, newest first. */
  examples: Array<{ year: number; writer: string; work: string | null }>;
  /**
   * true: the writer's country meets the rule. null: the rule does not
   * depend on nationality, or the brief gives no country.
   */
  eligible: true | null;
}

export interface KinWriter {
  /** A writer this magazine published recognised work by. */
  writer: string;
  /** The comparable writer from the brief they resemble. */
  likeComp: string;
  /** What links them, e.g. "Nigeria, fiction". */
  link: string;
}

/** Recorded facts about one magazine, normalised by the engine. */
export interface MagazineFacts {
  prestigeTier: "tier_1" | "tier_2" | "tier_3" | "unranked";
  /** "fiction", "poetry", "nonfiction", "translation"; null when unrecorded. */
  acceptedForms: string[] | null;
  readingPeriod: string | null;
  maxWords: number | null;
  minWords: number | null;
  allowsSimultaneous: boolean | null;
  blindReading: boolean | null;
  chargesFee: boolean | null;
  submissionFeeCents: number | null;
  hasFeeWaivers: boolean;
  paysContributors: boolean | null;
  isProRate: boolean;
  payKind: string | null;
  contributorPayCents: number | null;
  medianResponseDays: number | null;
  responseBand: string | null;
  acceptanceRatePercent: number | null;
  slushRatioPercent: number | null;
  isDebutFriendly: boolean;
  writingStyles: string[];
  poetryForms: string[];
  authorComps: string[];
  pushcart: { rank: number; genre: string; edition: number } | null;
  anthologyCount: number;
  anthologyAuthors: string[];
  prizePieces: VenueRecognition[];
}

export interface DecisionBrief {
  form: "fiction" | "poetry" | "nonfiction" | "flash" | "hybrid";
  wordCount: number | null;
  aestheticTags: string[];
  compAuthors: string[];
  isDebutAuthor: boolean;
  feeTolerance: "free_only" | "fee_ok_with_waivers" | "any";
  minPayRate: "pro_rates_only" | "any_paying" | "all";
  /** The writer sends this piece to several magazines at once. */
  allowSimultaneous: boolean;
  writerCountry: string | null;
}

export interface MagazineDecision {
  scores: Record<DecisionDimension, DimensionScore>;
  /** Weighted blend of the four scores; the ranking score. */
  composite: number;
  tier: PlanTier;
  /** Empty when the magazine's recorded rules allow the piece now. */
  exclusions: Exclusion[];
  readingWindow: ReadingWindow | null;
  prizeRoutes: PrizeRouteMatch[];
  publishedComps: string[];
  kinWriters: KinWriter[];
}

const FORM_LABELS: Record<string, string> = {
  fiction: "fiction",
  poetry: "poetry",
  nonfiction: "nonfiction",
  translation: "translation",
};

const BAND_LABELS: Record<string, string> = {
  under_3_months: "under 3 months",
  "3_to_6_months": "3 to 6 months",
  over_6_months: "over 6 months",
};

/** Normalise a recorded genre label to a form key, or null when unrelated. */
export function formFromGenreLabel(label: string): string | null {
  const value = label.toLowerCase();
  if (value.includes("nonfiction") || value.includes("non-fiction"))
    return "nonfiction";
  if (value.includes("essay") || value.includes("memoir")) return "nonfiction";
  if (value.includes("poetry") || value.includes("poem")) return "poetry";
  if (value.includes("translation")) return "translation";
  if (value.includes("fiction") || value.includes("flash")) return "fiction";
  return null;
}

/** The recorded form a brief needs a magazine to read; null for hybrid work. */
function requiredForm(form: DecisionBrief["form"]): string | null {
  if (form === "fiction" || form === "flash") return "fiction";
  if (form === "poetry") return "poetry";
  if (form === "nonfiction") return "nonfiction";
  return null;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function money(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

class Tally {
  private reasons: DecisionReason[] = [];
  add(points: number, text: string) {
    if (points !== 0) this.reasons.push({ text, points: Math.round(points) });
  }
  result(): DimensionScore {
    const total = this.reasons.reduce((sum, reason) => sum + reason.points, 0);
    return {
      score: clamp(50 + total),
      known: this.reasons.length > 0,
      reasons: this.reasons,
    };
  }
}

// Reading periods ----------------------------------------------------------

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const PERIOD_PATTERN =
  /^\s*([a-z]{3})[a-z]*\.?\s+(\d{1,2})\s*(?:to|-|–|—|through)\s*([a-z]{3})[a-z]*\.?\s+(\d{1,2})\s*$/i;

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Read a recorded period such as "Feb 1 to Mar 31" against a date. Windows
 * may run over New Year ("Nov 1 to Jan 31"). Unreadable labels give null:
 * an unknown window never excludes a magazine.
 */
export function readingWindow(
  label: string | null,
  asOf: string,
): ReadingWindow | null {
  if (!label) return null;
  const match = PERIOD_PATTERN.exec(label);
  const today = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOf);
  if (!match || !today) return null;
  const startMonth = MONTHS.indexOf(match[1].toLowerCase()) + 1;
  const endMonth = MONTHS.indexOf(match[3].toLowerCase()) + 1;
  const startDay = Number(match[2]);
  const endDay = Number(match[4]);
  if (!startMonth || !endMonth || startDay > 31 || endDay > 31) return null;

  const year = Number(today[1]);
  const now = Number(today[2]) * 100 + Number(today[3]);
  const start = startMonth * 100 + startDay;
  const end = endMonth * 100 + endDay;
  const trimmed = label.trim();

  if (start === 101 && end === 1231) {
    return {
      label: trimmed,
      allYear: true,
      openNow: true,
      opensOn: null,
      closesOn: null,
    };
  }
  const wraps = start > end;
  const openNow = wraps
    ? now >= start || now <= end
    : now >= start && now <= end;
  if (openNow) {
    const closeYear = wraps && now >= start ? year + 1 : year;
    return {
      label: trimmed,
      allYear: false,
      openNow,
      opensOn: null,
      closesOn: isoDate(closeYear, endMonth, endDay),
    };
  }
  const openYear = start > now ? year : year + 1;
  return {
    label: trimmed,
    allYear: false,
    openNow,
    opensOn: isoDate(openYear, startMonth, startDay),
    closesOn: null,
  };
}

function readableDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  const name = MONTHS[month - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${day}`;
}

// Rules ----------------------------------------------------------------------

export function exclusionsFor(
  facts: MagazineFacts,
  brief: DecisionBrief,
  window: ReadingWindow | null,
): Exclusion[] {
  const exclusions: Exclusion[] = [];
  const words = brief.wordCount;

  if (words && facts.maxWords && words > facts.maxWords) {
    exclusions.push({
      kind: "length",
      reason: `Over its ${facts.maxWords.toLocaleString("en-US")}-word limit`,
    });
  }
  if (words && facts.minWords && words < facts.minWords) {
    exclusions.push({
      kind: "length",
      reason: `Under its ${facts.minWords.toLocaleString("en-US")}-word minimum`,
    });
  }

  const needed = requiredForm(brief.form);
  if (
    needed &&
    facts.acceptedForms &&
    facts.acceptedForms.length > 0 &&
    !facts.acceptedForms.includes(needed)
  ) {
    const reads = facts.acceptedForms
      .map((form) => FORM_LABELS[form] ?? form)
      .join(", ");
    exclusions.push({
      kind: "form",
      reason: `Doesn't read ${FORM_LABELS[needed]} (reads ${reads})`,
    });
  }

  if (brief.allowSimultaneous && facts.allowsSimultaneous === false) {
    exclusions.push({
      kind: "simultaneous",
      reason: "Doesn't accept simultaneous submissions",
    });
  }

  if (
    brief.feeTolerance === "free_only" &&
    facts.chargesFee === true &&
    !facts.hasFeeWaivers
  ) {
    exclusions.push({
      kind: "fee",
      reason:
        facts.submissionFeeCents && facts.submissionFeeCents > 0
          ? `Charges a ${money(facts.submissionFeeCents)} reading fee`
          : "Charges a reading fee",
    });
  }

  if (brief.minPayRate !== "all" && facts.paysContributors === false) {
    exclusions.push({
      kind: "pay",
      reason:
        facts.payKind === "copies_only"
          ? "Pays in copies only"
          : "Doesn't pay contributors",
    });
  }

  if (window && !window.openNow && window.opensOn) {
    exclusions.push({
      kind: "closed",
      reason: `Closed until ${readableDate(window.opensOn)} (reads ${window.label})`,
    });
  }

  return exclusions;
}

// Scores ---------------------------------------------------------------------

function writersPublished(facts: MagazineFacts): string[] {
  const names = new Map<string, string>();
  for (const piece of facts.prizePieces) {
    names.set(normalizeWriterName(piece.writer), piece.writer);
  }
  for (const author of facts.anthologyAuthors) {
    if (!names.has(normalizeWriterName(author)))
      names.set(normalizeWriterName(author), author);
  }
  return [...names.values()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function scoreFit(
  facts: MagazineFacts,
  brief: DecisionBrief,
  publishedComps: string[],
  kinWriters: KinWriter[],
): DimensionScore {
  const fit = new Tally();

  if (publishedComps.length > 0) {
    fit.add(
      Math.min(25, publishedComps.length * 15),
      `Published ${publishedComps.join(", ")}`,
    );
  }
  if (kinWriters.length > 0) {
    const shown = kinWriters
      .slice(0, 3)
      .map((kin) => `${kin.writer} (${kin.link})`)
      .join(", ");
    const comps = [...new Set(kinWriters.map((kin) => kin.likeComp))];
    fit.add(
      Math.min(15, kinWriters.length * 5),
      `Published writers like ${comps.join(" and ")}: ${shown}`,
    );
  }

  const needed = requiredForm(brief.form);
  if (needed && facts.acceptedForms?.includes(needed)) {
    fit.add(8, `Reads ${FORM_LABELS[needed]}`);
  }
  if (brief.wordCount && facts.maxWords && brief.wordCount <= facts.maxWords) {
    fit.add(
      6,
      `Within its ${facts.maxWords.toLocaleString("en-US")}-word limit`,
    );
  }

  const compKeys = new Map(
    brief.compAuthors.map((name) => [normalizeWriterName(name), name]),
  );
  const listedComps = facts.authorComps
    .map((name) => compKeys.get(normalizeWriterName(name)))
    .filter((name): name is string => Boolean(name));
  if (listedComps.length > 0) {
    fit.add(
      Math.min(16, listedComps.length * 8),
      `Lists ${listedComps.join(", ")} among writers it compares itself to`,
    );
  }

  const styles = brief.aestheticTags
    .map((tag) => tag.toLowerCase().trim())
    .filter(
      (tag) =>
        tag &&
        (facts.writingStyles.some((style) =>
          style.toLowerCase().includes(tag),
        ) ||
          facts.poetryForms.some((form) => form.toLowerCase().includes(tag))),
    );
  if (styles.length > 0) {
    fit.add(
      Math.min(12, styles.length * 4),
      `Publishes ${styles.join(", ")} work`,
    );
  }

  return fit.result();
}

function prestigePenalty(points: number, brief: DecisionBrief): number {
  return brief.isDebutAuthor ? points * DEBUT_PRESTIGE_MULTIPLIER : points;
}

function scoreOdds(facts: MagazineFacts, brief: DecisionBrief): DimensionScore {
  const odds = new Tally();

  if (facts.isDebutFriendly) {
    odds.add(brief.isDebutAuthor ? 15 : 8, "Publishes debut writers");
  }
  if (facts.slushRatioPercent !== null && facts.slushRatioPercent >= 70) {
    odds.add(
      10,
      `${facts.slushRatioPercent}% of published work came from open submissions`,
    );
  }
  if (facts.blindReading === true) {
    odds.add(4, "Reads submissions without names");
  }
  const rate = facts.acceptanceRatePercent;
  if (rate !== null) {
    if (rate < 1) odds.add(-15, "Accepts under 1% of submissions");
    else if (rate < 3) odds.add(-8, `Accepts about ${rate}% of submissions`);
    else if (rate >= 10) odds.add(10, `Accepts about ${rate}% of submissions`);
  }

  // Prestige only ever lowers the odds.
  if (facts.prestigeTier === "tier_1") {
    odds.add(
      -prestigePenalty(20, brief),
      "One of the most competitive magazines (Missa Tier 1)",
    );
  } else if (facts.prestigeTier === "tier_2") {
    odds.add(-prestigePenalty(8, brief), "Highly competitive (Missa Tier 2)");
  }
  if (facts.pushcart && facts.pushcart.rank <= 75) {
    odds.add(
      -prestigePenalty(facts.pushcart.rank <= 25 ? 10 : 5, brief),
      `Ranked #${facts.pushcart.rank} for Pushcart Prizes: strong competition`,
    );
  }
  const picked = facts.prizePieces.length;
  if (picked >= 3) {
    odds.add(
      -prestigePenalty(picked >= 10 ? 10 : 5, brief),
      `${plural(picked, "story", "stories")} picked for prizes: strong competition`,
    );
  }

  return odds.result();
}

function prizeRoutesFor(
  facts: MagazineFacts,
  brief: DecisionBrief,
): PrizeRouteMatch[] {
  const routes: PrizeRouteMatch[] = [];
  const form = requiredForm(brief.form) ?? "fiction";
  for (const route of PRIZE_ROUTES) {
    const examples = facts.prizePieces
      .filter((piece) => piece.sourceId === route.id)
      .map((piece) => ({
        year: piece.year,
        writer: piece.writer,
        work: piece.work,
      }));
    if (examples.length === 0) continue;
    if (!route.forms.includes(form as (typeof route.forms)[number])) continue;
    const words = brief.wordCount;
    if (words && route.minWords && words < route.minWords) continue;
    if (words && route.maxWords && words > route.maxWords) continue;

    let eligible: true | null = null;
    if (route.openToCountry) {
      if (brief.writerCountry) {
        if (!route.openToCountry(brief.writerCountry)) continue;
        eligible = true;
      }
    }
    routes.push({
      id: route.id,
      name: route.name,
      rule: route.rule,
      examples,
      eligible,
    });
  }
  return routes;
}

function scorePayoff(
  facts: MagazineFacts,
  brief: DecisionBrief,
  routes: PrizeRouteMatch[],
): DimensionScore {
  const payoff = new Tally();

  if (facts.isProRate) {
    payoff.add(20, "Pays professional rates");
  } else if (facts.paysContributors === true) {
    payoff.add(
      12,
      facts.contributorPayCents
        ? `Pays contributors (about ${money(facts.contributorPayCents)})`
        : "Pays contributors",
    );
  } else if (facts.payKind === "copies_only") {
    payoff.add(-5, "Pays in copies");
  } else if (facts.paysContributors === false) {
    payoff.add(-10, "Doesn't pay contributors");
  }

  if (facts.pushcart) {
    payoff.add(
      facts.pushcart.rank <= 25 ? 15 : facts.pushcart.rank <= 75 ? 10 : 5,
      `Ranked #${facts.pushcart.rank} for Pushcart Prizes in ${facts.pushcart.genre} (${facts.pushcart.edition})`,
    );
  }
  const picked = facts.prizePieces.length;
  if (picked > 0) {
    payoff.add(
      Math.min(15, picked * 3),
      `${plural(picked, "story", "stories")} picked for the O. Henry Prize, Best American Short Stories or a major prize`,
    );
  }
  if (facts.anthologyCount > 0) {
    const weight =
      brief.form === "flash"
        ? 2
        : requiredForm(brief.form) === "fiction"
          ? 1
          : 0.5;
    payoff.add(
      Math.min(10, facts.anthologyCount * weight),
      `${plural(facts.anthologyCount, "piece")} chosen for Best Microfiction or Best Small Fictions`,
    );
  }

  let routePoints = 0;
  for (const route of routes) {
    const latest = route.examples[0];
    const points = route.eligible ? 10 : 5;
    if (routePoints + points > 20) break;
    routePoints += points;
    payoff.add(
      points,
      `Route to ${route.name}: first published ${latest.writer}'s ${latest.year} pick`,
    );
  }

  return payoff.result();
}

function scoreCost(facts: MagazineFacts, brief: DecisionBrief): DimensionScore {
  const cost = new Tally();

  if (facts.chargesFee === false) {
    cost.add(brief.feeTolerance === "free_only" ? 15 : 10, "Free to submit");
  } else if (facts.chargesFee === true) {
    const fee =
      facts.submissionFeeCents && facts.submissionFeeCents > 0
        ? `Charges a ${money(facts.submissionFeeCents)} reading fee`
        : "Charges a reading fee";
    if (facts.hasFeeWaivers) cost.add(-5, `${fee}; waivers available`);
    else cost.add(-15, fee);
  }

  const days = facts.medianResponseDays;
  if (days !== null) {
    if (days <= 60) cost.add(12, `Replies in about ${days} days`);
    else if (days <= 120) cost.add(4, `Replies in about ${days} days`);
    else if (days > 180) cost.add(-12, `Takes about ${days} days to reply`);
  } else if (facts.responseBand === "under_3_months") {
    cost.add(10, `Usually replies in ${BAND_LABELS.under_3_months}`);
  } else if (facts.responseBand === "over_6_months") {
    cost.add(-12, `Usually takes ${BAND_LABELS.over_6_months} to reply`);
  }

  if (facts.allowsSimultaneous === true) {
    cost.add(10, "Accepts simultaneous submissions");
  } else if (facts.allowsSimultaneous === false && !brief.allowSimultaneous) {
    cost.add(
      -15,
      "Wants an exclusive submission: the piece can't go elsewhere while it reads",
    );
  }

  return cost.result();
}

function kinshipFor(
  facts: MagazineFacts,
  brief: DecisionBrief,
): { publishedComps: string[]; kinWriters: KinWriter[] } {
  const published = writersPublished(facts);
  const publishedKeys = new Map(
    published.map((writer) => [normalizeWriterName(writer), writer]),
  );
  const publishedComps: string[] = [];
  for (const comp of brief.compAuthors) {
    if (publishedKeys.has(normalizeWriterName(comp))) publishedComps.push(comp);
  }

  const compKeys = new Set(brief.compAuthors.map(normalizeWriterName));
  const kinWriters: KinWriter[] = [];
  for (const writer of published) {
    if (compKeys.has(normalizeWriterName(writer))) continue;
    for (const comp of brief.compAuthors) {
      const kinship = writerKinship(comp, writer);
      if (!kinship) continue;
      const link = `${kinship.country}, ${kinship.form}`;
      kinWriters.push({ writer, likeComp: comp, link });
      break;
    }
  }
  return { publishedComps, kinWriters };
}

export function tierForOdds(odds: number): PlanTier {
  if (odds < TIER_THRESHOLDS.longShotBelow) return "long_shot";
  if (odds >= TIER_THRESHOLDS.likelyFrom) return "likely";
  return "good_fit";
}

/** Run the rules and the four scores for one magazine. */
export function decideMagazine(
  facts: MagazineFacts,
  brief: DecisionBrief,
  asOf: string,
): MagazineDecision {
  const window = readingWindow(facts.readingPeriod, asOf);
  const { publishedComps, kinWriters } = kinshipFor(facts, brief);
  const prizeRoutes = prizeRoutesFor(facts, brief);
  const scores: Record<DecisionDimension, DimensionScore> = {
    fit: scoreFit(facts, brief, publishedComps, kinWriters),
    odds: scoreOdds(facts, brief),
    payoff: scorePayoff(facts, brief, prizeRoutes),
    cost: scoreCost(facts, brief),
  };
  const weights = DECISION_WEIGHTS[brief.isDebutAuthor ? "debut" : "standard"];
  const composite = clamp(
    DECISION_DIMENSIONS.reduce(
      (sum, dimension) => sum + scores[dimension].score * weights[dimension],
      0,
    ),
  );
  return {
    scores,
    composite,
    tier: tierForOdds(scores.odds.score),
    exclusions: exclusionsFor(facts, brief, window),
    readingWindow: window,
    prizeRoutes,
    publishedComps,
    kinWriters,
  };
}

// Ordering and plan ----------------------------------------------------------

export interface DecisionCandidate {
  profileId: string;
  name: string;
  slug: string;
  decision: MagazineDecision;
  allowsSimultaneous: boolean | null;
  medianResponseDays: number | null;
  responseBand: string | null;
}

function codepointCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The one ordering every list uses: ranking score, then fit, then odds,
 * then name and id. The last two make ties impossible, so two runs over the
 * same facts always list magazines in the same order.
 */
export function compareCandidates(
  a: Pick<DecisionCandidate, "profileId" | "name" | "decision">,
  b: Pick<DecisionCandidate, "profileId" | "name" | "decision">,
): number {
  return (
    b.decision.composite - a.decision.composite ||
    b.decision.scores.fit.score - a.decision.scores.fit.score ||
    b.decision.scores.odds.score - a.decision.scores.odds.score ||
    codepointCompare(a.name.toLowerCase(), b.name.toLowerCase()) ||
    codepointCompare(a.profileId, b.profileId)
  );
}

export interface PlanPick {
  profileId: string;
  name: string;
  slug: string;
  tier: PlanTier;
  composite: number;
  allowsSimultaneous: boolean | null;
  /** Shown when the simultaneous policy is not recorded. */
  checkPolicy: boolean;
  closesOn: string | null;
}

export interface PlanRound {
  round: number;
  send: "together" | "alone";
  note: string;
  picks: PlanPick[];
}

export interface SubmissionPlan {
  rounds: PlanRound[];
  /** Strong candidates closed today, soonest opening first. */
  opensLater: Array<PlanPick & { opensOn: string }>;
  counts: Record<PlanTier, number>;
  /** Tiers that had fewer candidates than the plan asks for. */
  shortTiers: PlanTier[];
}

const BAND_ORDER: Record<string, number> = {
  under_3_months: 60,
  "3_to_6_months": 135,
  over_6_months: 240,
};

function replyDays(candidate: DecisionCandidate): number {
  return (
    candidate.medianResponseDays ??
    (candidate.responseBand ? BAND_ORDER[candidate.responseBand] : undefined) ??
    9999
  );
}

function hasRecordedFacts(decision: MagazineDecision): boolean {
  return DECISION_DIMENSIONS.some(
    (dimension) => decision.scores[dimension].known,
  );
}

function toPick(candidate: DecisionCandidate): PlanPick {
  return {
    profileId: candidate.profileId,
    name: candidate.name,
    slug: candidate.slug,
    tier: candidate.decision.tier,
    composite: candidate.decision.composite,
    allowsSimultaneous: candidate.allowsSimultaneous,
    checkPolicy: candidate.allowsSimultaneous === null,
    closesOn: candidate.decision.readingWindow?.closesOn ?? null,
  };
}

/**
 * Pick a plan: up to two long shots (best fit plus payoff), four good fits and
 * four likely acceptances, all open now, none below a neutral fit and each
 * with at least one recorded fact. Magazines that allow simultaneous
 * submissions go out together in round one; exclusive ones follow one per
 * round, fastest reply first.
 */
export function buildSubmissionPlan(
  candidates: DecisionCandidate[],
): SubmissionPlan {
  const usable = candidates.filter(
    (candidate) =>
      candidate.decision.scores.fit.score >= 50 &&
      hasRecordedFacts(candidate.decision),
  );
  const open = usable
    .filter((candidate) => candidate.decision.exclusions.length === 0)
    .sort(compareCandidates);

  const byTier = (tier: PlanTier) =>
    open.filter((candidate) => candidate.decision.tier === tier);
  // A long shot is worth sending for what it gives if it lands, so reaches
  // are chosen on fit and payoff together.
  const reach = (candidate: DecisionCandidate) =>
    candidate.decision.scores.fit.score +
    candidate.decision.scores.payoff.score;
  const longShots = byTier("long_shot").sort(
    (a, b) => reach(b) - reach(a) || compareCandidates(a, b),
  );
  const chosen = [
    ...longShots.slice(0, PLAN_SHAPE.long_shot),
    ...byTier("good_fit").slice(0, PLAN_SHAPE.good_fit),
    ...byTier("likely").slice(0, PLAN_SHAPE.likely),
  ];

  const counts: Record<PlanTier, number> = {
    long_shot: 0,
    good_fit: 0,
    likely: 0,
  };
  for (const candidate of chosen) counts[candidate.decision.tier]++;
  const shortTiers = (Object.keys(PLAN_SHAPE) as PlanTier[]).filter(
    (tier) => counts[tier] < PLAN_SHAPE[tier],
  );

  const together = chosen
    .filter((candidate) => candidate.allowsSimultaneous !== false)
    .sort(compareCandidates);
  const alone = chosen
    .filter((candidate) => candidate.allowsSimultaneous === false)
    .sort((a, b) => replyDays(a) - replyDays(b) || compareCandidates(a, b));

  const rounds: PlanRound[] = [];
  if (together.length > 0) {
    rounds.push({
      round: 1,
      send: "together",
      note: "Send these at the same time. Withdraw the piece everywhere else as soon as one accepts.",
      picks: together.map(toPick),
    });
  }
  for (const candidate of alone) {
    rounds.push({
      round: rounds.length + 1,
      send: "alone",
      note: "This magazine wants an exclusive submission. Send it once the piece is free: after earlier rounds reply or you withdraw it.",
      picks: [toPick(candidate)],
    });
  }

  const opensLater = usable
    .filter(
      (candidate) =>
        candidate.decision.exclusions.length > 0 &&
        candidate.decision.exclusions.every(
          (exclusion) => exclusion.kind === "closed",
        ) &&
        candidate.decision.readingWindow?.opensOn,
    )
    .sort(
      (a, b) =>
        codepointCompare(
          a.decision.readingWindow!.opensOn!,
          b.decision.readingWindow!.opensOn!,
        ) || compareCandidates(a, b),
    )
    .slice(0, 6)
    .map((candidate) => ({
      ...toPick(candidate),
      opensOn: candidate.decision.readingWindow!.opensOn!,
    }));

  return { rounds, opensLater, counts, shortTiers };
}
