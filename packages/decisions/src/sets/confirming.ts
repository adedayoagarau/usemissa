/**
 * Confirming: is a scraped page one real, current opportunity that Missa may
 * publish? These questions back the publication review worker, the lifecycle
 * reconciler, the ingestion v2 publisher gate and the direct-publish delta
 * harvesters. Every question reads public opportunity pages and published
 * facts only.
 */
import type { DeciderKind, DecisionRecord } from "../ledger.js";
import { questionOptions } from "../ledger.js";
import { defineQuestion } from "../questions.js";
import type {
  DecisionMode,
  DecisionRoute,
  QuestionDefinition,
} from "../types.js";

const NOUL_POLICY = {
  kind: "noul",
  acceptAtOrAbove: 0.9,
  rejectAtOrBelow: 0.1,
} as const;

export const confirmingPageKind = defineQuestion({
  key: "opportunity.page_kind",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "Classify the page in the state by what it is, using only what the page text and URL show.",
    criteria: {
      "single-opportunity":
        "The page describes one call, prize, grant, residency or fellowship with its own terms.",
      "rolling-submissions-page":
        "The page is one publication's or organization's standing submissions page with no fixed round.",
      "directory-or-roundup":
        "The page lists several opportunities from different calls or organizations.",
      "organization-home":
        "The page is an organization's home or about page, not a specific call.",
      "blog-or-news":
        "The page is an article, newsletter, announcement of winners or news item.",
      "closed-or-archive":
        "The page is a past round, results page or archive of an opportunity.",
      "not-an-opportunity":
        "The page is anything else: a shop, an event ticket, a service for sale, an error page.",
    },
  },
  policy: { kind: "choice", minProbability: 0.85 },
});

export const confirmingIsSingleRealOpportunity = defineQuestion({
  key: "opportunity.is_single_real_opportunity",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "Does the page state the terms of exactly one opportunity that creators can apply or submit to, rather than a list, an article or an organization overview?",
    criteria: {
      true: "The page states one opportunity's own terms: who may apply, what to send, or how to apply.",
      false:
        "The page lists several opportunities, reports news, describes an organization, or offers no way to apply.",
    },
  },
  policy: NOUL_POLICY,
});

export const confirmingLifecycleState = defineQuestion({
  key: "opportunity.lifecycle_state",
  version: 1,
  subjectType: "opportunity",
  fieldName: "status",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "What does the page state about whether this opportunity accepts submissions today? Compare stated dates with the date in the state. Do not infer an open window from a missing deadline.",
    criteria: {
      open: "The page states submissions are accepted now, or states a current window that includes today.",
      "opening-soon":
        "The page states a future opening date or says the next round opens later.",
      closed:
        "The page states submissions are closed, or states a deadline that has passed with no open round.",
      paused: "The page states intake is temporarily paused or on hiatus.",
      archived:
        "The page states the opportunity is discontinued, retired or no longer offered.",
      uncertain:
        "The page does not state the current intake clearly, or its statements conflict.",
    },
  },
  policy: { kind: "choice", minProbability: 0.85, alwaysReview: ["uncertain"] },
});

export const confirmingPublicationRoute = defineQuestion({
  key: "opportunity.publication_route",
  version: 1,
  subjectType: "opportunity",
  fieldName: "publication_state",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "Should Missa list this record as an opportunity? Judge only from the stated title, organization, links and page text in the state.",
    criteria: {
      publish:
        "The record is one real opportunity, the page states how to apply, and it is open or opening soon.",
      "needs-human":
        "The record may be a real opportunity but the page leaves its identity, host or timing unclear.",
      suppress:
        "The record is not one opportunity: a list, article, organization page, closed archive or unrelated page.",
    },
  },
  policy: {
    kind: "choice",
    minProbability: 0.85,
    alwaysReview: ["needs-human"],
  },
});

export const confirmingTitleIdentifiesOpportunity = defineQuestion({
  key: "opportunity.title_identifies_opportunity",
  version: 1,
  subjectType: "opportunity",
  fieldName: "title",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "Does the record's title, read with its organization name, name this specific opportunity so a creator could find it again?",
    criteria: {
      true: "The title names the opportunity, for example a prize, grant, residency or publication's submissions.",
      false:
        "The title is generic, a navigation label, a URL, a list heading or an article headline.",
    },
  },
  policy: NOUL_POLICY,
});

const FIELD_CERTAINTY_OPTIONS = {
  "confirmed-by-source": "The page states this fact plainly.",
  "stated-but-unclear":
    "The page mentions this fact but leaves the value ambiguous.",
  "not-stated": "The page does not state this fact.",
  conflicting: "The page states this fact in two or more conflicting ways.",
};

function fieldCertainty(field: string, label: string, fieldName?: string) {
  return defineQuestion({
    key: `opportunity.${field}_certainty`,
    version: 1,
    subjectType: "opportunity",
    ...(fieldName ? { fieldName } : {}),
    dataClass: "public",
    question: {
      type: "choice",
      instructions: `What does the page state about the ${label}? Only count what the page states, not what is typical.`,
      criteria: FIELD_CERTAINTY_OPTIONS,
    },
    policy: {
      kind: "choice",
      minProbability: 0.85,
      alwaysReview: ["stated-but-unclear", "conflicting"],
    },
  });
}

export const confirmingDeadlineCertainty = fieldCertainty(
  "deadline",
  "deadline or submission window",
  "deadline_date",
);
export const confirmingFeeCertainty = fieldCertainty(
  "fee",
  "entry or application fee",
  "fee_status",
);
export const confirmingEligibilityCertainty = fieldCertainty(
  "eligibility",
  "eligibility (who may apply)",
);
export const confirmingPrizeCertainty = fieldCertainty(
  "prize",
  "prize, award, payment or stipend",
);

export const CONFIRMING_FIELD_CERTAINTY_QUESTIONS = [
  confirmingDeadlineCertainty,
  confirmingFeeCertainty,
  confirmingEligibilityCertainty,
  confirmingPrizeCertainty,
] as const;

/** Every confirming question; a review or publisher pass asks all of them in one call. */
export const CONFIRMING_QUESTIONS: readonly QuestionDefinition[] = [
  confirmingPageKind,
  confirmingIsSingleRealOpportunity,
  confirmingLifecycleState,
  confirmingPublicationRoute,
  confirmingTitleIdentifiesOpportunity,
  ...CONFIRMING_FIELD_CERTAINTY_QUESTIONS,
];

/** The lifecycle reconciler only needs to know what the page is and what it says about intake. */
export const CONFIRMING_LIFECYCLE_QUESTIONS: readonly QuestionDefinition[] = [
  confirmingPageKind,
  confirmingIsSingleRealOpportunity,
  confirmingLifecycleState,
  confirmingDeadlineCertainty,
];

/** Direct-publish harvesters see a listing row, not a page: ask only what it is. */
export const CONFIRMING_DIRECT_PUBLISH_QUESTIONS: readonly QuestionDefinition[] =
  [
    confirmingPageKind,
    confirmingIsSingleRealOpportunity,
    confirmingTitleIdentifiesOpportunity,
  ];

/** Page kinds that are never one listable opportunity. */
export const NON_OPPORTUNITY_PAGE_KINDS: readonly string[] = [
  "directory-or-roundup",
  "organization-home",
  "blog-or-news",
  "closed-or-archive",
  "not-an-opportunity",
];

const PAGE_TEXT_LIMIT = 8_000;

export interface ConfirmingRecord {
  title?: string | null;
  organizationName?: string | null;
  sourceUrl?: string | null;
  submissionUrl?: string | null;
  guidelinesUrl?: string | null;
  status?: string | null;
  openDate?: string | null;
  deadlineDate?: string | null;
  deadlineKind?: string | null;
  feeStatus?: string | null;
  /** Where the record came from, e.g. "submittable-api" or "lifecycle-fetch". */
  origin?: string | null;
  /** Visible page text; HTML tags are stripped and long text is cut. */
  pageText?: string | null;
  /** Second page, such as a fetched application destination. */
  destinationText?: string | null;
  /** ISO date the decision is made on, so "closed" and "open" can be judged. */
  today?: string | null;
}

function compactText(value: string | null | undefined, limit: number) {
  if (!value) return undefined;
  const text = value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, limit) : undefined;
}

function present(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Builds compact Jev state from a record. Missing facts are left out rather
 * than sent as empty strings, so Jev never reads absence as a stated value.
 */
export function confirmingState(
  record: ConfirmingRecord,
): Record<string, unknown> {
  const state: Record<string, unknown> = {
    title: present(record.title),
    organization: present(record.organizationName),
    source_url: present(record.sourceUrl),
    submission_url: present(record.submissionUrl),
    guidelines_url: present(record.guidelinesUrl),
    recorded_status: present(record.status),
    recorded_open_date: present(record.openDate),
    recorded_deadline: present(record.deadlineDate),
    recorded_deadline_kind: present(record.deadlineKind),
    recorded_fee_status: present(record.feeStatus),
    origin: present(record.origin),
    today: present(record.today),
    page_text: compactText(record.pageText, PAGE_TEXT_LIMIT),
    destination_text: compactText(record.destinationText, PAGE_TEXT_LIMIT / 2),
  };
  for (const key of Object.keys(state))
    if (state[key] === undefined) delete state[key];
  return state;
}

/**
 * Records another decider's verdict (a rubric, a regex classifier, an LLM)
 * against the same question and input hash as Jev, so the two can be compared
 * row for row in data_decisions.
 */
export function confirmingVerdictRecord(input: {
  definition: QuestionDefinition;
  subjectId: string;
  inputHash: string;
  answer: string | null;
  route: Exclude<DecisionRoute, "unavailable">;
  mode: DecisionMode;
  deciderKind: Exclude<DeciderKind, "jev" | "human">;
  decider: string;
  deciderVersion?: string | null;
  evidenceUrl?: string | null;
}): DecisionRecord {
  const { definition } = input;
  return {
    subjectType: definition.subjectType,
    subjectId: input.subjectId,
    fieldName: definition.fieldName ?? null,
    questionKey: definition.key,
    questionVersion: definition.version,
    questionKind: definition.question.type,
    options: questionOptions(definition),
    inputHash: input.inputHash,
    evidenceUrl: input.evidenceUrl ?? null,
    answer: input.answer,
    probability: null,
    confidence: null,
    distribution: {},
    route: input.route,
    mode: input.mode,
    deciderKind: input.deciderKind,
    decider: input.decider,
    deciderVersion: input.deciderVersion ?? null,
    policyVersion: `${definition.key}@${definition.version}`,
  };
}
