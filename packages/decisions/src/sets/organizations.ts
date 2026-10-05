/**
 * Questions about organization workspaces and trust: decision letters,
 * submission triage, reviewer assignments, imports, guidelines, organization
 * claims and predatory-call risk.
 *
 * Every question here may only check, order or flag. People keep the final
 * say on applicant decisions, eligibility, scores and organization claims:
 * nothing answered here sends a message, changes a status, approves a claim or
 * unpublishes a call. Scopes that read these answers:
 *
 * - `decision_email_check`: a live, confident mismatch may stop a decision
 *   letter batch before anything is sent, so the organization can fix it.
 * - `import_column_mapping`: live answers may fill CSV columns the alias rules
 *   left unmapped; the organization still sees and edits the mapping.
 * - `trust_sweep`: live answers may open an admin review case. Never public.
 * - `submission_triage`, `reviewer_conflict`, `review_consistency`,
 *   `guideline_clauses`, `claim_queue`: recorded advisory flags only.
 */
import { defineQuestion } from "../questions.js";
import type {
  ChoiceQuestion,
  NoulQuestion,
  QuestionDefinition,
  ScoreQuestion,
} from "../types.js";

const NOUL_POLICY = {
  kind: "noul",
  acceptAtOrAbove: 0.9,
  rejectAtOrBelow: 0.1,
} as const;

function clip(value: string | null | undefined, max: number): string | null {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// --- Decision letters ---------------------------------------------------------

export const decisionMessageMatches = defineQuestion({
  key: "decision_message.matches_decision",
  version: 1,
  subjectType: "work_decision",
  dataClass: "creator-private",
  question: {
    type: "noul",
    instructions:
      "state.recordedDecision is the decision the organization recorded for this work. state.subject and state.letter are the email the recipient will read. Does the email, read as a whole, tell the recipient that same decision without saying or implying a different one?",
    criteria: {
      true: "The email states the recorded decision and nothing in it states a different outcome.",
      false:
        "The email states or implies a different outcome than the recorded decision, or contradicts itself about the outcome.",
    },
  } satisfies NoulQuestion,
  policy: NOUL_POLICY,
});

export const decisionMessageKind = defineQuestion({
  key: "decision_message.kind",
  version: 1,
  subjectType: "work_decision",
  dataClass: "creator-private",
  question: {
    type: "choice",
    instructions:
      "Which outcome do the organization's own words in state.subject and state.note tell the recipient? Judge only what the words state, not state.recordedDecision.",
    criteria: {
      accept: "The words state that the work is accepted or selected.",
      decline: "The words state that the work is declined or not selected.",
      waitlist:
        "The words state that the work is waitlisted or held for a later decision.",
      revise:
        "The words ask the recipient to revise and resubmit before a decision.",
      ambiguous:
        "The words do not state an outcome, or state more than one outcome.",
    },
  } satisfies ChoiceQuestion,
  policy: { kind: "choice", minProbability: 0.85, alwaysReview: ["ambiguous"] },
});

export const DECISION_MESSAGE_QUESTIONS: QuestionDefinition[] = [
  decisionMessageMatches,
  decisionMessageKind,
];

/** The recorded outcome each message kind agrees with. */
export const DECISION_MESSAGE_KIND_FOR_OUTCOME: Record<string, string> = {
  accepted: "accept",
  declined: "decline",
  waitlisted: "waitlist",
};

export interface DecisionMessageInput {
  recordedDecision: string;
  subject: string;
  /** The full letter text the recipient will read. */
  letter: string;
  /** Only the organization's own note, when it wrote one. */
  note?: string | null;
}

export function decisionMessageState(input: DecisionMessageInput) {
  return {
    recordedDecision: input.recordedDecision,
    subject: clip(input.subject, 300),
    letter: clip(input.letter, 4_000),
    note: clip(input.note, 3_000),
  };
}

// --- Submission triage (advisory flags; never eligibility or status) ----------

export const submissionWrongCategory = defineQuestion({
  key: "submission.wrong_category",
  version: 1,
  subjectType: "submission",
  dataClass: "creator-private",
  question: {
    type: "noul",
    instructions:
      "state.category is the category the applicant chose and state.categories lists the categories this call accepts. From state.works and state.answers, does the submission clearly belong to a different listed category than the one chosen?",
    criteria: {
      true: "The submitted work clearly fits a different listed category than the one chosen.",
      false:
        "The work fits the chosen category, or the evidence does not show a better fit.",
    },
  } satisfies NoulQuestion,
  policy: NOUL_POLICY,
});

export const submissionAuthorIdentifiedInBlindFile = defineQuestion({
  key: "submission.author_identified_in_blind_file",
  version: 1,
  subjectType: "submission",
  dataClass: "creator-private",
  question: {
    type: "noul",
    instructions:
      "This call reads submissions blind. state.applicant is the applicant's name. Does the text from the work files in state.fileText state the applicant's name or another detail that identifies them, such as a byline, contact details or a signed note?",
    criteria: {
      true: "The file text names or otherwise identifies the applicant.",
      false: "The file text does not identify the applicant.",
    },
  } satisfies NoulQuestion,
  policy: NOUL_POLICY,
});

/** Criterion ids become part of a question key, so keep them simple. */
export function criterionKeyPart(criterionId: string): string {
  const part = criterionId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return /^[a-z]/.test(part) ? part : `c_${part || "criterion"}`;
}

/**
 * One question per criterion the organization declared. The criterion text
 * travels in state.criteria, so editing it changes the input hash, not the
 * question. A flag only: an answer never changes eligibility or status.
 */
export function submissionCriterionMetQuestion(
  criterionId: string,
): QuestionDefinition<NoulQuestion> {
  const part = criterionKeyPart(criterionId);
  return defineQuestion({
    key: `submission.criterion_met.${part}`,
    version: 1,
    subjectType: "submission",
    fieldName: `criterion:${criterionId}`,
    dataClass: "creator-private",
    question: {
      type: "noul",
      instructions: `Read the criterion in state.criteria["${criterionId}"]. Do state.works and state.answers state facts that show the submission meets it? Answer from what the submission states, not from what it might imply.`,
      criteria: {
        true: "The submission states facts that show the criterion is met.",
        false:
          "The submission does not state facts that show the criterion is met.",
      },
    },
    policy: NOUL_POLICY,
  });
}

export interface SubmissionTriageInput {
  openCallTitle: string;
  categories: string[];
  category?: string | null;
  works: Array<{ title: string }>;
  /** Form answers, already keyed by field label. File URLs must be removed. */
  answers?: Record<string, string | string[]>;
  blind?: boolean;
  applicantName?: string | null;
  /** Text extracted from the work files, when available. */
  fileText?: string | null;
  criteria?: Record<string, string>;
}

export function submissionTriageQuestions(
  input: SubmissionTriageInput,
): QuestionDefinition[] {
  const questions: QuestionDefinition[] = [];
  if (input.categories.length > 1 && input.category)
    questions.push(submissionWrongCategory);
  if (input.blind && input.applicantName && input.fileText)
    questions.push(submissionAuthorIdentifiedInBlindFile);
  for (const id of Object.keys(input.criteria ?? {}))
    questions.push(submissionCriterionMetQuestion(id));
  const keys = new Set<string>();
  return questions.filter((question) => {
    if (keys.has(question.key)) return false;
    keys.add(question.key);
    return true;
  });
}

export function submissionTriageState(input: SubmissionTriageInput) {
  const answers = Object.fromEntries(
    Object.entries(input.answers ?? {}).map(([label, value]) => [
      clip(label, 120),
      Array.isArray(value)
        ? value.map((item) => clip(item, 500))
        : clip(value, 1_500),
    ]),
  );
  return {
    openCall: clip(input.openCallTitle, 200),
    categories: input.categories.slice(0, 30),
    category: input.category ?? null,
    works: input.works.slice(0, 20).map((work) => clip(work.title, 200)),
    answers,
    applicant: input.blind ? (input.applicantName ?? null) : null,
    fileText: input.blind ? clip(input.fileText, 6_000) : null,
    criteria: input.criteria ?? {},
  };
}

// --- Review -----------------------------------------------------------------

export const reviewerConflict = defineQuestion({
  key: "review_assignment.reviewer_conflict",
  version: 1,
  subjectType: "review_assignment",
  dataClass: "creator-private",
  question: {
    type: "noul",
    instructions:
      "Do the facts in state.reviewer and state.applicant show a relationship that could bias the review, such as the same person, a shared surname with the same address or employer, a shared email domain that is not a public mail provider, or one naming the other?",
    criteria: {
      true: "The stated facts show a personal or working relationship between reviewer and applicant.",
      false: "The stated facts show no such relationship.",
    },
  } satisfies NoulQuestion,
  policy: NOUL_POLICY,
});

export interface ReviewerConflictParty {
  name?: string | null;
  emailDomain?: string | null;
  affiliation?: string | null;
  location?: string | null;
}

export function reviewerConflictState(input: {
  reviewer: ReviewerConflictParty;
  applicant: ReviewerConflictParty;
  workTitles: string[];
}) {
  const party = (value: ReviewerConflictParty) => ({
    name: clip(value.name, 120),
    emailDomain: clip(value.emailDomain?.toLowerCase(), 120),
    affiliation: clip(value.affiliation, 200),
    location: clip(value.location, 120),
  });
  return {
    reviewer: party(input.reviewer),
    applicant: party(input.applicant),
    works: input.workTitles.slice(0, 20).map((title) => clip(title, 200)),
  };
}

export const reviewNotesContradictScore = defineQuestion({
  key: "review.notes_contradict_score",
  version: 1,
  subjectType: "review_assignment",
  dataClass: "creator-private",
  question: {
    type: "noul",
    instructions:
      "state.score is the reviewer's score on the scale in state.scale. Do the reviewer's notes in state.notes state a judgment clearly opposite to that score, such as strong praise with a low score or a firm rejection with a high score?",
    criteria: {
      true: "The notes clearly state the opposite judgment to the score.",
      false:
        "The notes agree with the score, are mixed, or do not state a judgment.",
    },
  } satisfies NoulQuestion,
  policy: NOUL_POLICY,
});

export function reviewNotesState(input: {
  score: number;
  scale: { min: number; max: number };
  notes: string;
}) {
  return {
    score: input.score,
    scale: input.scale,
    notes: clip(input.notes, 5_000),
  };
}

// --- Imports ----------------------------------------------------------------

/**
 * Target fields of the workspace CSV importers. Keep in step with
 * SUBMISSION_IMPORT_TARGETS and OPEN_CALL_IMPORT_TARGETS in workspace-engine;
 * its tests compare the two.
 */
export const SUBMISSION_IMPORT_COLUMN_TARGETS: Record<string, string> = {
  openCall: "The title of the open call or program the entry was sent to.",
  submitterEmail: "The applicant's email address.",
  workTitle: "The title of the submitted work or entry.",
  submittedAt: "The date or time the entry was submitted.",
  status: "The entry's review status or decision.",
};

export const OPEN_CALL_IMPORT_COLUMN_TARGETS: Record<string, string> = {
  title: "The open call's title.",
  team: "The team, entity or department that runs the call.",
  program: "The program, imprint or category the call belongs to.",
  status: "Whether the call is open, closed or a draft.",
  radarOpportunityId: "A Missa opportunity id linked to the call.",
};

function importColumnTargetQuestion(
  importer: "submission" | "open_call",
  targets: Record<string, string>,
) {
  return defineQuestion({
    key: `import.${importer}_column_target`,
    version: 1,
    subjectType: "import_column",
    dataClass: "operational",
    question: {
      type: "choice",
      instructions:
        "state.header is a CSV column header and state.samples are up to three values from that column. Which importer field does the column hold?",
      criteria: {
        ...targets,
        ignore: "The column holds none of these fields, or it is unclear.",
      },
    } satisfies ChoiceQuestion,
    policy: { kind: "choice", minProbability: 0.85, alwaysReview: ["ignore"] },
  });
}

export const submissionImportColumnTarget = importColumnTargetQuestion(
  "submission",
  SUBMISSION_IMPORT_COLUMN_TARGETS,
);
export const openCallImportColumnTarget = importColumnTargetQuestion(
  "open_call",
  OPEN_CALL_IMPORT_COLUMN_TARGETS,
);

/** Header plus at most three non-empty sample values; nothing else of the file. */
export function importColumnState(header: string, values: string[]) {
  return {
    header: clip(header, 120),
    samples: values
      .map((value) => clip(value, 80))
      .filter((value): value is string => value !== null)
      .slice(0, 3),
  };
}

// --- Guidelines -------------------------------------------------------------

export const guidelineClauseKind = defineQuestion({
  key: "guideline_clause.kind",
  version: 1,
  subjectType: "guideline_clause",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "state.clause is one clause from a call's published guidelines. What does the clause state a rule about?",
    criteria: {
      "word-limit": "A length limit: words, pages, lines or poems.",
      fee: "An entry, reading or submission fee, or a fee waiver.",
      "file-type": "File formats, fonts or how to prepare the file.",
      eligibility: "Who may apply: age, residence, career stage or identity.",
      deadline: "When submissions open or close.",
      rights: "Rights, licences, prior publication or simultaneous submission.",
      "ai-policy": "Whether AI tools may be used to make the work.",
      other: "Something else, or more than one of these.",
    },
  } satisfies ChoiceQuestion,
  policy: { kind: "choice", minProbability: 0.85, alwaysReview: ["other"] },
});

export function guidelineClauseState(clause: string, openCallTitle?: string) {
  return { call: clip(openCallTitle, 200), clause: clip(clause, 1_200) };
}

// --- Organization claims ------------------------------------------------------

export const claimEvidenceSupports = defineQuestion({
  key: "claim.evidence_supports",
  version: 1,
  subjectType: "claim",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "state.organization is the organization asking to manage this listing and state.opportunity is the published listing. Do the published facts show that this organization runs the call, for example the listing page names it as organizer or links to its website?",
    criteria: {
      true: "The published facts name or link this organization as the call's organizer.",
      false:
        "The published facts name a different organizer, or do not connect this organization to the call.",
    },
  } satisfies NoulQuestion,
  policy: NOUL_POLICY,
});

export function claimEvidenceState(input: {
  organization: { name: string; website?: string | null };
  opportunity: {
    title: string;
    sourceUrl: string;
    organizerName?: string | null;
    submissionUrl?: string | null;
    guidelinesUrl?: string | null;
  };
}) {
  return {
    organization: {
      name: clip(input.organization.name, 200),
      website: input.organization.website ?? null,
    },
    opportunity: {
      title: clip(input.opportunity.title, 200),
      sourceUrl: input.opportunity.sourceUrl,
      organizerName: clip(input.opportunity.organizerName, 200),
      submissionUrl: input.opportunity.submissionUrl ?? null,
      guidelinesUrl: input.opportunity.guidelinesUrl ?? null,
    },
  };
}

// --- Predatory-call risk (admin only; never shown publicly) -------------------

export const PREDATORY_RISK_LEVELS = [
  "legitimate",
  "needs-review",
  "likely-predatory",
] as const;

export const predatoryRisk = defineQuestion({
  key: "opportunity.predatory_risk",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "score",
    instructions:
      "From what the published listing states, how likely is this call to exploit applicants: fees out of line with what is offered, payment to be published, rights taken without fair terms, or an organizer who cannot be identified? Do not treat a missing fact as a warning sign on its own.",
    criteria: [...PREDATORY_RISK_LEVELS],
  } satisfies ScoreQuestion,
  policy: { kind: "score", minConfidence: 0.85 },
});

export const feeDisproportionateToAward = defineQuestion({
  key: "opportunity.fee_disproportionate_to_award",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "Does the listing state an entry fee that is large compared with the award, payment or publication it states it offers?",
    criteria: {
      true: "The stated fee is large compared with the stated award or payment.",
      false:
        "There is no fee, the fee is modest for what is offered, or the listing does not state both.",
    },
  } satisfies NoulQuestion,
  policy: NOUL_POLICY,
});

export const payToPublishOrVanity = defineQuestion({
  key: "opportunity.pay_to_publish_or_vanity",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "Does the listing state that accepted applicants must pay to be published, exhibited or included, or buy copies, or that nearly every applicant is accepted?",
    criteria: {
      true: "The listing states a payment on acceptance, a required purchase, or near-universal acceptance.",
      false: "The listing states none of these.",
    },
  } satisfies NoulQuestion,
  policy: NOUL_POLICY,
});

export const rightsGrab = defineQuestion({
  key: "opportunity.rights_grab",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "Does the listing state that the organizer takes all rights, copyright or permanent exclusive rights to submitted work, including work that is not selected?",
    criteria: {
      true: "The listing states that the organizer takes all, permanent or exclusive rights.",
      false:
        "The listing states limited or first rights, or does not state rights terms.",
    },
  } satisfies NoulQuestion,
  policy: NOUL_POLICY,
});

export const organizerUnverifiable = defineQuestion({
  key: "opportunity.organizer_unverifiable",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "Does the listing fail to name an organizer that can be identified, for example no organization name, no website of its own, and no named people?",
    criteria: {
      true: "The listing names no identifiable organizer.",
      false: "The listing names an organizer with a website or named people.",
    },
  } satisfies NoulQuestion,
  policy: NOUL_POLICY,
});

export const TRUST_SWEEP_QUESTIONS: QuestionDefinition[] = [
  predatoryRisk,
  feeDisproportionateToAward,
  payToPublishOrVanity,
  rightsGrab,
  organizerUnverifiable,
];

export interface PredatoryRiskInput {
  title: string;
  type?: string | null;
  feeStatus?: string | null;
  feeCents?: number | null;
  feeCurrency?: string | null;
  prize?: string | null;
  prizes?: Array<{
    title?: string | null;
    amountCents?: number | null;
    currency?: string | null;
  }>;
  organizationName?: string | null;
  organizationWebsite?: string | null;
  sourceUrl?: string | null;
  submissionHost?: string | null;
  guidelinesUrl?: string | null;
  /** Published listing text. */
  text?: string | null;
}

export function predatoryRiskState(input: PredatoryRiskInput) {
  return {
    title: clip(input.title, 200),
    type: input.type ?? null,
    fee:
      input.feeCents != null
        ? {
            status: input.feeStatus ?? null,
            amount: input.feeCents / 100,
            currency: input.feeCurrency ?? null,
          }
        : { status: input.feeStatus ?? null },
    prize: clip(input.prize, 300),
    prizes: (input.prizes ?? []).slice(0, 10).map((prize) => ({
      title: clip(prize.title, 120),
      amount: prize.amountCents != null ? prize.amountCents / 100 : null,
      currency: prize.currency ?? null,
    })),
    organizer: {
      name: clip(input.organizationName, 200),
      website: input.organizationWebsite ?? null,
    },
    sourceUrl: input.sourceUrl ?? null,
    submissionHost: input.submissionHost ?? null,
    guidelinesUrl: input.guidelinesUrl ?? null,
    text: clip(input.text, 6_000),
  };
}

/** Every fixed question in this set, for validation and evaluation. */
export const ORGANIZATION_QUESTIONS: QuestionDefinition[] = [
  ...DECISION_MESSAGE_QUESTIONS,
  submissionWrongCategory,
  submissionAuthorIdentifiedInBlindFile,
  reviewerConflict,
  reviewNotesContradictScore,
  submissionImportColumnTarget,
  openCallImportColumnTarget,
  guidelineClauseKind,
  claimEvidenceSupports,
  ...TRUST_SWEEP_QUESTIONS,
];
