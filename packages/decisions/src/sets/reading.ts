/**
 * Reading an opportunity's call page as typed questions. Each answer says
 * what the page *states*: a fact the page leaves out is "not stated", never a
 * "no". So a Noul here is "does the page state X?" — false means the page
 * says otherwise or says nothing, and must never write false into a column.
 * Use `readingColumnValue` to turn an outcome into a column value safely.
 */
import { defineQuestion } from "../questions.js";
import type {
  DecisionOutcome,
  NoulQuestion,
  QuestionDefinition,
} from "../types.js";

const SUBJECT = "opportunity";
const NOUL_POLICY = {
  kind: "noul",
  acceptAtOrAbove: 0.9,
  rejectAtOrBelow: 0.1,
} as const;

function choicePolicy(alwaysReview: string[]) {
  return { kind: "choice", minProbability: 0.85, alwaysReview } as const;
}

function stated(input: {
  name: string;
  fieldName?: string;
  instructions: string;
  statedMeans: string;
}): QuestionDefinition<NoulQuestion> {
  return defineQuestion({
    key: `opportunity.reading.${input.name}`,
    version: 1,
    subjectType: SUBJECT,
    ...(input.fieldName ? { fieldName: input.fieldName } : {}),
    dataClass: "public",
    question: {
      type: "noul",
      instructions: input.instructions,
      criteria: {
        true: `The page states ${input.statedMeans}.`,
        false: `The page does not state ${input.statedMeans}: it says otherwise or does not mention it.`,
      },
    },
    policy: NOUL_POLICY,
  });
}

export const readingFeeStatus = defineQuestion({
  key: "opportunity.reading.fee_status",
  version: 1,
  subjectType: SUBJECT,
  fieldName: "fee_status",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "What does the page say about a fee to apply, enter or submit? Ignore fees for attending, membership or a residency stay.",
    criteria: {
      "no-fee": "The page states there is no fee to apply or submit.",
      paid: "The page states a fee to apply or submit and mentions no waiver or free option.",
      "waiver-available":
        "The page states a fee and that it can be waived or reduced, or offers free slots or a free window.",
      unstated: "The page does not say whether there is a fee.",
    },
  },
  policy: choicePolicy(["unstated"]),
});

export const readingArtistPayment = defineQuestion({
  key: "opportunity.reading.artist_payment",
  version: 1,
  subjectType: SUBJECT,
  fieldName: "opportunity_call_profiles.payment_type",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "What does the page say selected or published creators are paid? Prize money paid only to winners is not payment.",
    criteria: {
      cash: "The page states money paid for the work: per piece, per word, per page or a flat fee.",
      stipend:
        "The page states a stipend, honorarium, grant award or living allowance paid to the selected creator.",
      "contributor-copies":
        "The page states payment is contributor copies or a subscription only.",
      "exposure-only":
        "The page states creators are not paid: publication, exhibition or exposure only.",
      "none-stated": "The page does not say whether creators are paid.",
    },
  },
  policy: choicePolicy(["none-stated"]),
});

export const readingRightsAcquired = defineQuestion({
  key: "opportunity.reading.rights_acquired",
  version: 1,
  subjectType: SUBJECT,
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "Which publication rights does the page say the publisher acquires? Pick the strongest rights stated.",
    criteria: {
      "first-north-american":
        "The page states first North American serial rights.",
      "first-world":
        "The page states first serial, first publication or first world rights, not limited to North America.",
      "all-rights":
        "The page states all rights, copyright transfer or work-for-hire.",
      "exclusive-period":
        "The page states exclusive rights for a set period other than first serial rights.",
      unstated: "The page does not say which rights are acquired.",
    },
  },
  policy: choicePolicy(["unstated"]),
});

export const readingDeadlineKind = defineQuestion({
  key: "opportunity.reading.deadline_kind",
  version: 1,
  subjectType: SUBJECT,
  fieldName: "deadline_kind",
  dataClass: "public",
  question: {
    type: "choice",
    instructions: "What kind of deadline does the page state for this call?",
    criteria: {
      exact: "The page states one specific closing date for this call.",
      rolling:
        "The page states submissions are accepted year-round or on a rolling basis, with no closing date.",
      "until-filled":
        "The page states the call stays open until places are filled or a submission cap is reached.",
      "reading-period":
        "The page states recurring reading periods (for example, open every March) rather than one closing date.",
      conflicting:
        "The page gives two or more different closing dates for the same call.",
      unstated: "The page gives no deadline or reading period.",
    },
  },
  policy: choicePolicy(["conflicting", "unstated"]),
});

export const readingOpportunityType = defineQuestion({
  key: "opportunity.reading.type",
  version: 1,
  subjectType: SUBJECT,
  fieldName: "type",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "What kind of opportunity does the page describe? Judge from what the page offers, not from the listed type.",
    criteria: {
      "open-call":
        "A general call for submissions or entries that no option below fits better.",
      magazine:
        "A magazine or literary journal reading submissions for publication.",
      grant: "Funding that creators apply for, for work or a project.",
      award:
        "A prize recognising finished work or a career, often by nomination.",
      fellowship: "A fellowship: a paid position or program for a set term.",
      residency: "A residency offering time and space at a place.",
      festival: "A festival accepting work or participants.",
      scholarship: "Money toward study, tuition or a course.",
      conference:
        "A conference, workshop or retreat accepting applicants or speakers.",
      rfp: "A request for proposals or qualifications for paid work.",
      contest:
        "A competition judged on submitted work, usually with a prize and an entry deadline.",
      pitch:
        "A call for pitches for articles or projects to an editor or commissioner.",
      exhibition: "A call for work to show in an exhibition.",
      commission: "A call to make new commissioned work.",
      job: "Employment: a paid role with ongoing duties.",
      other:
        "A real opportunity for creators that none of the options above describes.",
      "not-an-opportunity":
        "Not one opportunity: a list of many calls, a news post, a closed archive or an unrelated page.",
    },
  },
  policy: choicePolicy(["other", "not-an-opportunity"]),
});

export const readingMarketKind = defineQuestion({
  key: "opportunity.reading.market_kind",
  version: 1,
  subjectType: SUBJECT,
  fieldName: "opportunity_call_profiles.market_kind",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "What kind of organization runs this call, as the page states?",
    criteria: {
      magazine: "A magazine, online or in print.",
      journal: "A literary or academic journal.",
      press: "A book publisher or small press.",
      anthology: "A one-off anthology or collection.",
      contest: "A contest run as its own program.",
      award: "An award or prize program.",
      organization:
        "Another organization: a foundation, arts council, gallery, residency or school.",
      unknown: "The page does not make clear who runs the call.",
    },
  },
  policy: choicePolicy(["unknown"]),
});

export const readingSimultaneousAllowed = stated({
  name: "simultaneous_allowed",
  fieldName: "simultaneous_allowed",
  instructions:
    "Does the page state that simultaneous submissions (sending the same work elsewhere at the same time) are allowed?",
  statedMeans: "that simultaneous submissions are allowed",
});

export const readingPreviouslyUnpublishedRequired = stated({
  name: "previously_unpublished_required",
  fieldName: "opportunity_call_profiles.previously_unpublished_required",
  instructions: "Does the page state that work must be previously unpublished?",
  statedMeans: "that submitted work must be previously unpublished",
});

export const readingMultipleSubmissionsAllowed = stated({
  name: "multiple_submissions_allowed",
  fieldName: "opportunity_call_profiles.multiple_submissions_allowed",
  instructions:
    "Does the page state that a creator may send more than one submission or entry to this call?",
  statedMeans: "that more than one submission or entry per creator is allowed",
});

export const readingReprintsAllowed = stated({
  name: "reprints_allowed",
  fieldName: "opportunity_call_profiles.reprints_allowed",
  instructions:
    "Does the page state that previously published work (reprints) is accepted?",
  statedMeans: "that previously published work is accepted",
});

export const readingBlindReview = stated({
  name: "blind_review",
  instructions:
    "Does the page state that work is judged or read anonymously (blind), for example by asking applicants to remove their names?",
  statedMeans: "that work is read or judged anonymously",
});

export const readingInternationalApplicantsAccepted = stated({
  name: "international_applicants_accepted",
  instructions:
    "Does the page state that applicants from any country, or from outside the host country, may apply?",
  statedMeans: "that international applicants may apply",
});

export const readingEmergingOnly = stated({
  name: "emerging_only",
  instructions:
    "Does the page state that the call is limited to emerging, early-career, debut or unpublished creators?",
  statedMeans: "that only emerging or early-career creators may apply",
});

export const readingAgeLimitStated = stated({
  name: "age_limit_stated",
  instructions:
    "Does the page state a minimum or maximum age for applicants (18+ only to sign a contract counts)?",
  statedMeans: "a minimum or maximum age for applicants",
});

export const readingCitizenshipOrResidencyRequired = stated({
  name: "citizenship_or_residency_required",
  instructions:
    "Does the page state that applicants must be citizens or residents of a particular country, region or city?",
  statedMeans: "a citizenship or residency requirement for applicants",
});

export const readingAiUsePolicyStated = stated({
  name: "ai_use_policy_stated",
  instructions:
    "Does the page state a policy on work made with generative AI, whether it allows or forbids it?",
  statedMeans: "a policy on work made with generative AI",
});

export const readingFeeWaiverAvailable = stated({
  name: "fee_waiver_available",
  instructions:
    "Does the page state that the entry or application fee can be waived or reduced, or that free entries are offered?",
  statedMeans: "a fee waiver, reduced fee or free entries",
});

export const readingStipendPaidToArtist = stated({
  name: "stipend_paid_to_artist",
  instructions:
    "Does the page state that selected creators receive a stipend, honorarium or living allowance? Prize money paid only to winners does not count.",
  statedMeans: "a stipend, honorarium or allowance paid to selected creators",
});

export const readingStudioProvided = stated({
  name: "studio_provided",
  instructions:
    "Does the page state that participants get a studio or dedicated workspace, private or shared?",
  statedMeans: "that a studio or workspace is provided",
});

export const readingHousingProvided = stated({
  name: "housing_provided",
  instructions:
    "Does the page state that housing or accommodation is provided to participants, whether free or paid?",
  statedMeans: "that housing or accommodation is provided",
});

export const readingMealsProvided = stated({
  name: "meals_provided",
  instructions:
    "Does the page state that some or all meals are provided to participants?",
  statedMeans: "that some or all meals are provided",
});

export const readingWheelchairAccessStated = stated({
  name: "wheelchair_access_stated",
  instructions:
    "Does the page state that the site or program is wheelchair accessible, fully or in part?",
  statedMeans:
    "that the site or program is wheelchair accessible, fully or in part",
});

const MATERIALS = {
  artist_statement: "an artist statement or statement of intent",
  cv: "a CV or résumé",
  work_sample: "a work sample, portfolio or manuscript",
  budget: "a budget",
  bio: "a short biography",
  proposal: "a project proposal or description",
  references: "references or letters of recommendation",
} as const;

export type ReadingMaterial = keyof typeof MATERIALS;

export const readingMaterialQuestions = Object.fromEntries(
  Object.entries(MATERIALS).map(([name, label]) => [
    name,
    stated({
      name: `material_${name}`,
      instructions: `Does the page ask applicants to submit ${label}?`,
      statedMeans: `that applicants submit ${label}`,
    }),
  ]),
) as Record<ReadingMaterial, QuestionDefinition<NoulQuestion>>;

/** Every reading question, asked together in one call per opportunity. */
export const readingQuestions: readonly QuestionDefinition[] = Object.freeze([
  readingFeeStatus,
  readingArtistPayment,
  readingRightsAcquired,
  readingDeadlineKind,
  readingOpportunityType,
  readingMarketKind,
  readingSimultaneousAllowed,
  readingPreviouslyUnpublishedRequired,
  readingMultipleSubmissionsAllowed,
  readingReprintsAllowed,
  readingBlindReview,
  readingInternationalApplicantsAccepted,
  readingEmergingOnly,
  readingAgeLimitStated,
  readingCitizenshipOrResidencyRequired,
  readingAiUsePolicyStated,
  readingFeeWaiverAvailable,
  readingStipendPaidToArtist,
  readingStudioProvided,
  readingHousingProvided,
  readingMealsProvided,
  readingWheelchairAccessStated,
  ...Object.values(readingMaterialQuestions),
]);

/**
 * Choice answers → stored column values. null means the answer has no exact
 * column value (a person maps it) or that nothing should be written.
 */
export const READING_COLUMN_VALUES: Readonly<
  Record<string, Readonly<Record<string, string | null>>>
> = Object.freeze({
  [readingFeeStatus.key]: {
    "no-fee": "no-fee",
    paid: "paid",
    "waiver-available": "paid",
    unstated: "unknown",
  },
  [readingArtistPayment.key]: {
    cash: null,
    stipend: null,
    "contributor-copies": "contributor-copy",
    "exposure-only": "none",
    "none-stated": "unknown",
  },
  // opportunities.deadline_kind has no reading-period value; that belongs in
  // opportunity_call_profiles.reading_period_kind and needs a person.
  [readingDeadlineKind.key]: {
    exact: "exact",
    rolling: "rolling",
    "until-filled": "until-filled",
    "reading-period": null,
    conflicting: "conflicting",
    unstated: "unknown",
  },
  [readingMarketKind.key]: Object.fromEntries(
    Object.keys(readingMarketKind.question.criteria).map((id) => [id, id]),
  ),
  [readingOpportunityType.key]: Object.fromEntries(
    Object.keys(readingOpportunityType.question.criteria).map((id) => [
      id,
      id === "not-an-opportunity" ? null : id,
    ]),
  ),
});

/**
 * The column value an applied or rejected outcome supports, or null when
 * nothing may be written. A stated Noul writes true; "not stated" writes
 * nothing, because a missing fact is not a "no".
 */
export function readingColumnValue(
  definition: QuestionDefinition,
  outcome: DecisionOutcome,
): { fieldName: string; value: string | boolean } | null {
  if (!definition.fieldName || outcome.route !== "apply") return null;
  if (definition.question.type === "noul") {
    return outcome.answer === "true"
      ? { fieldName: definition.fieldName, value: true }
      : null;
  }
  const value =
    outcome.answer === null
      ? null
      : (READING_COLUMN_VALUES[definition.key]?.[outcome.answer] ?? null);
  return value === null ? null : { fieldName: definition.fieldName, value };
}

export interface ReadingOpportunityInput {
  title: string;
  organizationName?: string | null;
  /** The type Missa currently lists, as context only. */
  type?: string | null;
  /** The page the text was read from. */
  url?: string | null;
  /** Main page text, e.g. the fetched snapshot content. */
  pageText?: string | null;
  /** Separate guidelines text, when stored apart from the page. */
  guidelines?: string | null;
  eligibility?:
    | string
    | Array<string | { description?: string | null; value?: string | null }>
    | null;
  requiredMaterials?: Array<
    string | { label?: string | null; description?: string | null }
  > | null;
}

export interface ReadingStateOptions {
  /** Total characters of page, guidelines and eligibility text. Default 8000. */
  maxTextChars?: number;
}

export interface ReadingState {
  title: string;
  organization?: string;
  listedType?: string;
  url?: string;
  pageText?: string;
  guidelines?: string;
  eligibility?: string;
  requiredMaterials?: string;
}

/** Collapses whitespace and cuts at a word boundary, marking the cut with "…". */
export function trimReadingText(
  text: string | null | undefined,
  maxChars: number,
): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (maxChars <= 0) return "";
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, Math.max(0, maxChars - 1));
  const space = cut.lastIndexOf(" ");
  return `${space > maxChars * 0.8 ? cut.slice(0, space) : cut}…`;
}

function listText(
  items: Array<string | Record<string, unknown>> | string | null | undefined,
  fields: string[],
): string {
  if (!items) return "";
  if (typeof items === "string") return items;
  return items
    .map((item) =>
      typeof item === "string"
        ? item
        : fields
            .map((field) => item[field])
            .filter((value) => typeof value === "string" && value.trim())
            .join(": "),
    )
    .filter((line) => line.trim())
    .join("; ");
}

/**
 * Compact Jev state for the reading questions. Short fields keep a small
 * budget first (eligibility 1,500, materials 500, guidelines 2,500) and the
 * page text gets the rest of `maxTextChars`.
 */
export function readingStateFromOpportunity(
  input: ReadingOpportunityInput,
  options: ReadingStateOptions = {},
): ReadingState {
  let budget = Math.max(0, options.maxTextChars ?? 8_000);
  const take = (text: string, cap: number) => {
    const trimmed = trimReadingText(text, Math.min(cap, budget));
    budget -= trimmed.length;
    return trimmed;
  };

  const pageClean = trimReadingText(input.pageText, Number.MAX_SAFE_INTEGER);
  const guidelinesClean = trimReadingText(
    input.guidelines,
    Number.MAX_SAFE_INTEGER,
  );
  const eligibility = take(
    listText(input.eligibility, ["description", "value"]),
    1_500,
  );
  const requiredMaterials = take(
    listText(input.requiredMaterials, ["label", "description"]),
    500,
  );
  const guidelines =
    guidelinesClean && !pageClean.includes(guidelinesClean)
      ? take(guidelinesClean, 2_500)
      : "";
  const pageText = take(pageClean, budget);

  const state: ReadingState = { title: trimReadingText(input.title, 300) };
  const organization = trimReadingText(input.organizationName, 200);
  if (organization) state.organization = organization;
  if (input.type) state.listedType = input.type;
  if (input.url) state.url = input.url;
  if (pageText) state.pageText = pageText;
  if (guidelines) state.guidelines = guidelines;
  if (eligibility) state.eligibility = eligibility;
  if (requiredMaterials) state.requiredMaterials = requiredMaterials;
  return state;
}

/** Characters of evidence text in a reading state, to skip records with too little to read. */
export function readingEvidenceLength(state: ReadingState): number {
  return (
    (state.pageText?.length ?? 0) +
    (state.guidelines?.length ?? 0) +
    (state.eligibility?.length ?? 0) +
    (state.requiredMaterials?.length ?? 0)
  );
}
