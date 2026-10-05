import { defineQuestion } from "../questions.js";

/**
 * Sorting questions: how well an opportunity fits one creator, and whether a
 * weekly digest is worth sending. Both send the creator's declared practice,
 * stage and location, so both are creator-private and are refused until a
 * no-retention agreement allows that data (JEV_ALLOW_CREATOR_PRIVATE_DATA=1).
 *
 * Jev only orders here. Eligibility and every reason a creator reads stay
 * rule-based; a fit level never adds, removes or explains a recommendation.
 *
 * Search exclusion by listing kind is meant to reuse the confirming set's
 * page-kind question once it is exported; it is not redefined here.
 */

export const CREATOR_FIT_SCORE_LEVELS = [
  "mismatch",
  "weak",
  "possible",
  "strong",
] as const;
export type CreatorFitAnswer = (typeof CREATOR_FIT_SCORE_LEVELS)[number];

export const creatorFitQuestion = defineQuestion({
  key: "creator_opportunity.fit",
  version: 1,
  subjectType: "creator_opportunity",
  dataClass: "creator-private",
  question: {
    type: "score",
    instructions:
      "The state holds a creator's declared practice, career stage, location and preferences, and one opportunity's stated facts. Rate how well the opportunity fits this creator using only what is stated. " +
      "mismatch: a stated fact rules the creator out or contradicts a declared preference (wrong discipline, stage or location). " +
      "weak: little of the opportunity's stated focus overlaps the declared practice. " +
      "possible: nothing stated rules the creator out, but the fit depends on facts that are missing or unclear. " +
      "strong: the stated discipline, stage and location all match what the creator declared. " +
      "A fact the opportunity does not state is unknown, not a match.",
    criteria: [...CREATOR_FIT_SCORE_LEVELS],
  },
  policy: { kind: "score", minConfidence: 0.85 },
});

export const digestWorthSendingQuestion = defineQuestion({
  key: "weekly_digest.worth_sending",
  version: 1,
  subjectType: "weekly_digest",
  dataClass: "creator-private",
  question: {
    type: "noul",
    instructions:
      "The state holds a creator's declared practice and preferences and the items in this week's digest. Is the digest worth sending: does at least one item match the declared practice, or is a saved deadline coming up?",
    criteria: {
      true: "At least one item matches the declared practice, or a saved deadline is listed.",
      false:
        "No item matches the declared practice and no saved deadline is listed.",
    },
  },
  policy: { kind: "noul", acceptAtOrAbove: 0.9, rejectAtOrBelow: 0.1 },
});

export const SORTING_QUESTIONS = [
  creatorFitQuestion,
  digestWorthSendingQuestion,
] as const;

/** What a creator declared; only fields that help judge fit. */
export interface CreatorFitProfile {
  disciplines?: readonly string[];
  genres?: readonly string[];
  types?: readonly string[];
  careerStages?: readonly string[];
  locations?: readonly string[];
  countryCode?: string | null;
  city?: string | null;
  noFeeOnly?: boolean;
  travel?: string | null;
}

/** An opportunity's stored facts; only what the page states. */
export interface CreatorFitOpportunity {
  title: string;
  type?: string | null;
  organizationName?: string | null;
  discipline?: string | null;
  genres?: readonly string[];
  location?: string | null;
  countryCode?: string | null;
  feeStatus?: string | null;
  prize?: string | null;
  deadline?: string | null;
  eligibility?: readonly string[];
}

const MAX_LIST = 12;
const MAX_TEXT = 240;

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_TEXT) : undefined;
}

function list(values: readonly string[] | undefined): string[] | undefined {
  const cleaned = (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_LIST);
  return cleaned.length ? cleaned : undefined;
}

function compact(
  record: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const entries = Object.entries(record).filter(
    ([, value]) => value !== undefined,
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function creatorFitProfileState(
  profile: CreatorFitProfile,
): Record<string, unknown> {
  return (
    compact({
      disciplines: list(profile.disciplines),
      genres: list(profile.genres),
      opportunityTypes: list(profile.types),
      careerStages: list(profile.careerStages),
      locations: list(profile.locations),
      country: text(profile.countryCode),
      city: text(profile.city),
      noFeeOnly: profile.noFeeOnly || undefined,
      travel: text(profile.travel),
    }) ?? {}
  );
}

/** Compact state for one creator × opportunity question. */
export function creatorFitState(
  profile: CreatorFitProfile,
  opportunity: CreatorFitOpportunity,
): Record<string, unknown> {
  return {
    creator: creatorFitProfileState(profile),
    opportunity:
      compact({
        title: text(opportunity.title),
        type: text(opportunity.type),
        organization: text(opportunity.organizationName),
        discipline: text(opportunity.discipline),
        genres: list(opportunity.genres),
        location: text(opportunity.location),
        country: text(opportunity.countryCode),
        fee: text(opportunity.feeStatus),
        prize: text(opportunity.prize),
        deadline: text(opportunity.deadline),
        eligibility: list(opportunity.eligibility),
      }) ?? {},
  };
}

export interface DigestSummaryItem {
  title: string;
  type?: string | null;
  deadline?: string | null;
  reason?: string | null;
}

/** Compact state for one weekly digest. */
export function digestWorthSendingState(
  profile: CreatorFitProfile,
  digest: {
    newForYou: readonly DigestSummaryItem[];
    closingSoon: readonly DigestSummaryItem[];
    yourDeadlines: readonly DigestSummaryItem[];
  },
): Record<string, unknown> {
  const items = (section: readonly DigestSummaryItem[]) =>
    section.slice(0, MAX_LIST).map(
      (item) =>
        compact({
          title: text(item.title),
          type: text(item.type),
          deadline: text(item.deadline),
          reason: text(item.reason),
        }) ?? {},
    );
  return {
    creator: creatorFitProfileState(profile),
    newForYou: items(digest.newForYou),
    closingSoon: items(digest.closingSoon),
    savedDeadlines: items(digest.yourDeadlines),
  };
}

/** Subject id for a creator × opportunity decision. */
export const creatorOpportunitySubjectId = (
  accountId: string,
  opportunityId: string,
) => `${accountId}:${opportunityId}`;
