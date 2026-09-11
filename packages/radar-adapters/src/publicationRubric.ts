import { projectOpportunityAvailability } from "@missa/radar-engine";

export type PublicationGate = "pass" | "fail" | "review";
export type PublicationDecision = "publish" | "needs-human" | "suppress";

export type PublicationRubricCandidate = {
  title: string;
  status: string;
  submissionState: string;
  deadlineDate: string | null;
  openDate?: string | null;
  deadlineKind?: string | null;
  submissionUrl: string | null;
  guidelinesUrl: string | null;
  sourceUrl: string | null;
  processingSucceededAt: string | null;
  organizationConfirmed: boolean;
  reviewOnly?: boolean;
  readingPeriodKind: string | null;
  evidenceCount: number;
  destinationReconciled: boolean;
  contentApproved: boolean;
};

export type PublicationRubricResult = {
  decision: PublicationDecision;
  score: number;
  reasons: string[];
  checks: Record<string, unknown>;
};

function identityValid(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return ![
    "here", "continue reading", "read more", "website", "official site", "apply here", "submit here",
  ].includes(normalized) && !/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/.test(normalized);
}

function aggregateIdentity(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /\b(?:directory|round[ -]?up|list of)\b/.test(normalized) ||
    (/\b(?:best|top)\b/.test(normalized) && /\b(?:magazines?|journals?|contests?|places|opportunities|markets?)\b/.test(normalized)) ||
    /\b\d{2,}\+?\s+(?:places|magazines?|journals?|contests?|opportunities|markets?)\b/.test(normalized);
}

/** Autonomous fail-closed decision used by every canonical publication transition (0 human-in-loop). */
export function evaluatePublicationRubric(candidate: PublicationRubricCandidate): PublicationRubricResult {
  const reasons: string[] = [];
  const sourcePresent = Boolean(candidate.sourceUrl);
  const sourceProcessed = Boolean(candidate.processingSucceededAt);
  const destinationPresent = Boolean(candidate.submissionUrl || candidate.guidelinesUrl);
  const availability = projectOpportunityAvailability({
    lifecycleStatus: candidate.status,
    openDate: candidate.openDate,
    deadlineDate: candidate.deadlineDate,
    deadlineKind: candidate.deadlineKind,
    readingPeriodKind: candidate.readingPeriodKind,
  });
  const active = availability.availableNow || availability.upcoming || candidate.status === "open" || candidate.status === "opening-soon";
  const deadlineOrWindow = availability.timingEvidenceKnown || candidate.status === "open" || Boolean(candidate.deadlineDate);
  const unsafe = candidate.submissionState === "unsafe";
  const validIdentity = identityValid(candidate.title);
  const aggregate = aggregateIdentity(candidate.title);

  const organizationConfident = candidate.organizationConfirmed || validIdentity;
  const timingReady = availability.publicationTimingReady || active;

  const gates = {
    authorityDestination: sourcePresent && destinationPresent && candidate.destinationReconciled && !candidate.reviewOnly ? "pass" : "review",
    identity: validIdentity && candidate.organizationConfirmed ? "pass" : "review",
    freshness: active && deadlineOrWindow ? "pass" : "review",
    completeness: candidate.contentApproved && validIdentity && destinationPresent ? "pass" : "review",
    safety: unsafe ? "fail" : "pass",
  } satisfies Record<string, PublicationGate>;

  const checks = {
    gates,
    sourcePresent,
    sourceProcessed,
    destinationPresent,
    destinationReconciled: candidate.destinationReconciled,
    deadlineOrWindow,
    availabilityState: availability.state,
    intakeMode: availability.intakeMode,
    organizationConfirmed: candidate.organizationConfirmed,
    reviewOnly: Boolean(candidate.reviewOnly),
    active,
    unsafe,
    identityValid: validIdentity,
    aggregateIdentity: aggregate,
    contentApproved: candidate.contentApproved,
    evidenceCount: candidate.evidenceCount,
  };

  if (unsafe) return { decision: "suppress", score: 0, reasons: ["Submission destination was marked unsafe."], checks };
  if (aggregate) return { decision: "suppress", score: 0, reasons: ["This record is a directory or roundup, not one opportunity."], checks };
  if (!validIdentity) reasons.push("Opportunity identity is invalid or a placeholder.");
  if (!destinationPresent) reasons.push("Submission or guidelines destination is missing.");
  if (!candidate.organizationConfirmed) reasons.push("Opportunity host organization requires confirmation.");
  if (!candidate.destinationReconciled) reasons.push("Destination reconciliation is required.");
  if (!candidate.contentApproved) reasons.push("Content review is required.");
  if (candidate.reviewOnly) reasons.push("Candidate is explicitly held for human review.");
  if (!active && !timingReady) reasons.push("Opportunity is not currently active.");
  if (!deadlineOrWindow) reasons.push("Opportunity timing evidence is uncertain.");

  const passed = Object.values(gates).filter((gate) => gate === "pass").length;
  const score = Math.round((passed / 5) * 100);

  if (passed === 5 && !candidate.reviewOnly) {
    return { decision: "publish", score: 100, reasons: ["All five publication gates passed."], checks };
  }

  return { decision: "needs-human", score, reasons, checks };
}

