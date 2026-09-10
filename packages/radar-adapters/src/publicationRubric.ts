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

const ACTIVE_STATUSES = new Set(["opening-soon", "open", "closing-soon", "deadline-extended"]);

function identityValid(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return ![
    "here", "continue reading", "read more", "website", "official site", "apply here", "submit here",
  ].includes(normalized) && !/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/.test(normalized);
}

function aggregateIdentity(title: string): boolean {
  const normalized = title.toLowerCase();
  return normalized.includes("directory") || normalized.includes("roundup") || normalized.includes("list of");
}

function projectOpportunityAvailability(params: {
  lifecycleStatus: string;
  openDate?: string | null;
  deadlineDate?: string | null;
  deadlineKind?: string | null;
  readingPeriodKind?: string | null;
}) {
  const active = ACTIVE_STATUSES.has(params.lifecycleStatus) || params.lifecycleStatus === "open";
  return {
    availableNow: active,
    upcoming: params.lifecycleStatus === "opening-soon",
    timingEvidenceKnown: Boolean(params.deadlineDate || params.readingPeriodKind),
    publicationTimingReady: active || Boolean(params.deadlineDate),
    state: active ? "active" : "inactive",
    intakeMode: "standard",
  };
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
    authorityDestination: sourcePresent && destinationPresent && !candidate.reviewOnly ? "pass" : "fail",
    identity: validIdentity && organizationConfident ? "pass" : "fail",
    freshness: timingReady ? "pass" : "fail",
    completeness: validIdentity && destinationPresent ? "pass" : "fail",
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
  if (!destinationPresent) return { decision: "suppress", score: 0, reasons: ["Submission or guidelines destination is missing."], checks };
  if (!validIdentity) return { decision: "suppress", score: 0, reasons: ["Opportunity identity is a placeholder or invalid."], checks };
  if (!active && !timingReady) return { decision: "suppress", score: 0, reasons: ["Opportunity is not currently active."], checks };

  const passed = Object.values(gates).filter((gate) => gate === "pass").length;
  const score = Math.round((passed / 5) * 100);

  if (passed >= 4 && !candidate.reviewOnly) {
    return { decision: "publish", score, reasons: ["All autonomous publication criteria passed."], checks };
  }

  return { decision: "suppress", score, reasons: ["Autonomous review criteria not met."], checks };
}
