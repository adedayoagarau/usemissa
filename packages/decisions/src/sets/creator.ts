/**
 * Questions about what creators write, receive and track: application emails,
 * text replies, tracker imports, community reviews, reports and deadline risk.
 *
 * Every question here is creator-private, so the Jev client refuses them until
 * JEV_ALLOW_CREATOR_PRIVATE_DATA=1 (after a no-retention agreement). Answers
 * only order, route and flag. None may be shown to creators, and none may
 * apply an application decision: sensitive statuses always wait for the
 * creator, opt-outs stay rule-based, and moderation may only hold.
 *
 * Scopes (DECISIONS_MODE_<SCOPE>=live to act; shadow by default):
 *   email_status  email_application_status, email_is_personal_note
 *   email_match   email_about_tracked_call
 *   sms_intent    sms_reply_intent
 *   tracker_match tracker_row_matches_opportunity
 *   moderation    review_moderation, report_credibility
 *   nudges        deadline_at_risk
 */
import { defineQuestion } from "../questions.js";

export const CREATOR_DECISION_SCOPES = [
  "email_status",
  "email_match",
  "sms_intent",
  "tracker_match",
  "moderation",
  "nudges",
] as const;
export type CreatorDecisionScope = (typeof CREATOR_DECISION_SCOPES)[number];

const NOUL_POLICY = {
  kind: "noul",
  acceptAtOrAbove: 0.9,
  rejectAtOrBelow: 0.1,
} as const;

/**
 * Application statuses that change what a creator believes about their work.
 * They are never applied from a decision: the creator confirms them.
 */
export const SENSITIVE_EMAIL_STATUSES = [
  "longlisted",
  "shortlisted",
  "finalist",
  "accepted",
  "declined",
  "waitlisted",
  "revision-requested",
] as const;

export const emailApplicationStatus = defineQuestion({
  key: "creator.email_application_status",
  version: 1,
  subjectType: "email_candidate",
  dataClass: "creator-private",
  question: {
    type: "choice",
    instructions:
      "This is an email a writer forwarded or synced to track their applications. Which option describes what the email itself states about the writer's own submission or application? Choose newsletter-or-solicitation when the email is a newsletter, announcement, marketing or call for entries sent to many people, even if it uses words such as congratulations or selected. Choose unrelated when it says nothing about a submission by this writer.",
    criteria: {
      received: "It states the submission or application was received.",
      "in-review":
        "It states the submission is being read or is under review, with no decision.",
      longlisted: "It states this writer's work was longlisted.",
      shortlisted: "It states this writer's work was shortlisted.",
      finalist: "It states this writer's work is a finalist.",
      accepted:
        "It states this writer's work was accepted, selected or awarded.",
      declined: "It states this writer's work was declined or not selected.",
      waitlisted: "It states this writer's work was placed on a waitlist.",
      "revision-requested":
        "It asks this writer to revise and resubmit the work.",
      "newsletter-or-solicitation":
        "It is a newsletter, announcement, promotion or call for entries, not a decision about this writer's submission.",
      unrelated:
        "It does not concern a submission or application by this writer.",
    },
  },
  policy: {
    kind: "choice",
    minProbability: 0.85,
    alwaysReview: [...SENSITIVE_EMAIL_STATUSES],
  },
});

export const emailAboutTrackedCall = defineQuestion({
  key: "creator.email_about_tracked_call",
  version: 1,
  subjectType: "email_candidate_match",
  dataClass: "creator-private",
  question: {
    type: "noul",
    instructions:
      "Is this email about the writer's application to the call in state.call? Answer from what the email states (its subject, sender and text), not from a similar title alone.",
    criteria: {
      true: "The email names this call, its organization or its program, or comes from the call's own site.",
      false:
        "The email is about a different call, program or organization, or names none of them.",
    },
  },
  policy: NOUL_POLICY,
});

export const emailIsPersonalNote = defineQuestion({
  key: "creator.email_is_personal_note",
  version: 1,
  subjectType: "email_candidate",
  dataClass: "creator-private",
  question: {
    type: "noul",
    instructions:
      "Is this email a personal note from a friend, colleague or family member rather than a message from the organization that runs a call?",
    criteria: {
      true: "The email is a personal message, such as congratulations or news from someone the writer knows.",
      false:
        "The email is sent by or on behalf of an organization, publication or program.",
    },
  },
  policy: NOUL_POLICY,
});

export const smsReplyIntent = defineQuestion({
  key: "creator.sms_reply_intent",
  version: 1,
  subjectType: "sms_inbound",
  dataClass: "creator-private",
  question: {
    type: "choice",
    instructions:
      "This is a text message a writer sent in reply to a Missa deadline reminder. What does the writer ask for?",
    criteria: {
      done: "They say the application is sent or the task is finished.",
      snooze: "They ask to be reminded later.",
      drop: "They say they will not apply to this call.",
      stop: "They ask Missa to stop texting them, in any wording.",
      help: "They ask what the texts are or how to manage them.",
      question: "They ask a question about the call or the reminder.",
      other: "Anything else, or the intent is unclear.",
    },
  },
  policy: {
    kind: "choice",
    minProbability: 0.85,
    alwaysReview: ["question", "other"],
  },
});

export const trackerRowMatchesOpportunity = defineQuestion({
  key: "creator.tracker_row_matches_opportunity",
  version: 1,
  subjectType: "tracker_import_match",
  dataClass: "creator-private",
  question: {
    type: "noul",
    instructions:
      "A writer imported a row from their own submissions spreadsheet. Is state.row about the same call as state.opportunity (the same program and cycle, not just the same organization)?",
    criteria: {
      true: "The row and the opportunity name the same call.",
      false:
        "The row is about a different call, prize, issue or program from the same organization, or the evidence does not connect them.",
    },
  },
  policy: NOUL_POLICY,
});

export const reviewModeration = defineQuestion({
  key: "creator.review_moderation",
  version: 1,
  subjectType: "residency_review",
  dataClass: "creator-private",
  question: {
    type: "choice",
    instructions:
      "A writer submitted this review of an artist residency for public display. Which option describes the review text?",
    criteria: {
      ok: "An account of the writer's own experience of the residency, critical or not.",
      "personal-attack-or-defamation":
        "It attacks a named or identifiable person, or states unproven wrongdoing as fact.",
      "spam-or-promotion":
        "It advertises something, links elsewhere for promotion, or is repeated filler.",
      "personal-data":
        "It includes someone's private contact details, address or other personal data.",
      "off-topic": "It is not about this residency.",
      impersonation:
        "It claims to be written by the residency, its staff or another person.",
    },
  },
  policy: { kind: "choice", minProbability: 0.85 },
});

export const reportCredibility = defineQuestion({
  key: "creator.report_credibility",
  version: 1,
  subjectType: "creator_report",
  dataClass: "creator-private",
  question: {
    type: "score",
    instructions:
      "A writer sent this report about a published listing. How specific and checkable is it? Judge only what the report states; a missing detail is not evidence either way.",
    criteria: [
      "low: vague, contradictory or unrelated to the listing",
      "medium: plausible but gives little that can be checked",
      "high: specific, consistent and points to checkable evidence",
    ],
  },
  policy: { kind: "score", minConfidence: 0.85 },
});

export const deadlineAtRisk = defineQuestion({
  key: "creator.deadline_at_risk",
  version: 1,
  subjectType: "tracked_application",
  dataClass: "creator-private",
  question: {
    type: "noul",
    instructions:
      "From the tracked application's recorded status, deadline and activity, is the writer likely to miss this deadline without a reminder?",
    criteria: {
      true: "Little recorded progress for the time left before the deadline.",
      false:
        "Recorded progress fits the time left, or the deadline is far away.",
    },
  },
  policy: NOUL_POLICY,
});

export const CREATOR_QUESTIONS = [
  emailApplicationStatus,
  emailAboutTrackedCall,
  emailIsPersonalNote,
  smsReplyIntent,
  trackerRowMatchesOpportunity,
  reviewModeration,
  reportCredibility,
  deadlineAtRisk,
] as const;

// ---------------------------------------------------------------------------
// State builders: compact, bounded state with no account ids, names, phone
// numbers or email addresses. Only what the question needs is sent.
// ---------------------------------------------------------------------------

function clip(value: string | null | undefined, max: number): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export interface EmailStateInput {
  subject: string;
  body: string;
  senderDomain?: string | null;
}

export function emailDecisionState(input: EmailStateInput) {
  return {
    subject: clip(input.subject, 300),
    senderDomain: input.senderDomain ?? null,
    text: clip(input.body, 4_000),
  };
}

export function emailMatchState(
  input: EmailStateInput & {
    call: {
      title: string;
      organizationName?: string | null;
      sourceUrl?: string | null;
    };
  },
) {
  return {
    ...emailDecisionState(input),
    call: {
      title: clip(input.call.title, 240),
      organization: input.call.organizationName
        ? clip(input.call.organizationName, 240)
        : null,
      site: hostOf(input.call.sourceUrl),
    },
  };
}

export function smsReplyState(text: string) {
  return { message: clip(text, 480) };
}

export function trackerMatchState(input: {
  row: {
    title: string;
    organization?: string | null;
    sourceUrl?: string | null;
    deadline?: string | null;
  };
  opportunity: {
    title: string;
    organizationName?: string | null;
    sourceUrl?: string | null;
    deadline?: string | null;
  };
}) {
  return {
    row: {
      title: clip(input.row.title, 240),
      organization: input.row.organization
        ? clip(input.row.organization, 240)
        : null,
      site: hostOf(input.row.sourceUrl),
      deadline: input.row.deadline ?? null,
    },
    opportunity: {
      title: clip(input.opportunity.title, 240),
      organization: input.opportunity.organizationName
        ? clip(input.opportunity.organizationName, 240)
        : null,
      site: hostOf(input.opportunity.sourceUrl),
      deadline: input.opportunity.deadline ?? null,
    },
  };
}

export function reviewModerationState(input: {
  title?: string | null;
  body: string;
  ratingScore: number;
}) {
  return {
    title: input.title ? clip(input.title, 200) : null,
    review: clip(input.body, 5_000),
    rating: input.ratingScore,
  };
}

export function contentIssueReportState(input: {
  subjectType: string;
  issueType: string;
  correction: string;
  evidenceUrl?: string | null;
}) {
  return {
    kind: "content-issue",
    listing: input.subjectType,
    issue: input.issueType,
    correction: clip(input.correction, 2_000),
    evidenceSite: hostOf(input.evidenceUrl),
  };
}

export function responseReportState(input: {
  genre?: string | null;
  submittedDate: string;
  decisionDate?: string | null;
  responseDays?: number | null;
  outcome?: string | null;
  rejectionType?: string | null;
  feePaidCents?: number;
}) {
  return {
    kind: "response-time",
    genre: input.genre ?? null,
    submitted: input.submittedDate,
    decided: input.decisionDate ?? null,
    responseDays: input.responseDays ?? null,
    outcome: input.outcome ?? null,
    rejectionType: input.rejectionType ?? null,
    feePaidCents: input.feePaidCents ?? 0,
  };
}

export function deadlineRiskState(input: {
  status: string;
  daysUntilDeadline: number;
  daysSinceLastUpdate: number | null;
  hasReminder: boolean;
  hasWorkAttached: boolean;
}) {
  return {
    status: input.status,
    daysUntilDeadline: input.daysUntilDeadline,
    daysSinceLastUpdate: input.daysSinceLastUpdate,
    hasReminder: input.hasReminder,
    hasWorkAttached: input.hasWorkAttached,
  };
}
