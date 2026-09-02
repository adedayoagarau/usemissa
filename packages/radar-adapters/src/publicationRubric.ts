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

/** One fail-closed decision used by every canonical publication transition. */
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
  const active = availability.availableNow || availability.upcoming;
  const deadlineOrWindow = availability.timingEvidenceKnown;
  const unsafe = candidate.submissionState === "unsafe";
  const validIdentity = identityValid(candidate.title);
  const aggregate = aggregateIdentity(candidate.title);

  const gates = {
    authorityDestination: sourcePresent && sourceProcessed && destinationPresent && candidate.destinationReconciled && !candidate.reviewOnly ? "pass" : "review" as PublicationGate,
    identity: validIdentity && candidate.organizationConfirmed ? "pass" : "review" as PublicationGate,
    freshness: availability.publicationTimingReady ? "pass" : "review" as PublicationGate,
    completeness: candidate.contentApproved ? "pass" : "review" as PublicationGate,
    safety: unsafe ? "fail" : "pass" as PublicationGate,
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
  if (!sourcePresent) reasons.push("Canonical source URL is missing.");
  if (!sourceProcessed) reasons.push("Source has not completed a successful processing pass.");
  if (!destinationPresent) reasons.push("Submission or guidelines destination is missing.");
  if (!candidate.destinationReconciled) reasons.push("Source-to-destination reconciliation is not confirmed.");
  if (candidate.reviewOnly) reasons.push("This ingestion record is explicitly held for human review.");
  if (!validIdentity) reasons.push("Opportunity identity is a placeholder and must be resolved.");
  if (!candidate.organizationConfirmed) reasons.push("Organization confirmation is still required.");
  if (!active) reasons.push("Opportunity is not currently active.");
  if (!deadlineOrWindow) reasons.push("Deadline or reading window is unknown.");
  if (!candidate.contentApproved) reasons.push("The opportunity page content has not passed content review.");

  const passed = Object.values(gates).filter((gate) => gate === "pass").length;
  const score = Math.round((passed / 5) * 100);
  return Object.values(gates).every((gate) => gate === "pass")
    ? { decision: "publish", score: 100, reasons: ["All five publication gates passed."], checks }
    : { decision: "needs-human", score, reasons, checks };
}
