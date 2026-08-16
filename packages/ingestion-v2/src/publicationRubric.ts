/**
 * The publication decision, owned by ingestion v2.
 *
 * Ported from the Radar review agent rather than reinvented: this rubric is the
 * boundary the product depends on, and Radar is being retired. Until v2 owns
 * this transition, switching Radar off stops the catalog growing.
 *
 * Every gate must pass. A model may interpret evidence upstream, but nothing
 * here consults one — a publication decision is deterministic and reviewable.
 */

export type PublicationGate = "pass" | "fail" | "review";
export type PublicationDecision = "publish" | "needs-human" | "suppress";

export interface PublicationCandidate {
  opportunityId: string;
  title: string;
  status: string;
  submissionState: string;
  deadlineDate: string | null;
  submissionUrl: string | null;
  guidelinesUrl: string | null;
  sourceUrl: string | null;
  processingSucceededAt: string | null;
  organizationConfirmed: boolean;
  destinationReconciled: boolean;
  contentApproved: boolean;
  readingPeriodKind: string | null;
}

export interface PublicationRubricResult {
  decision: PublicationDecision;
  score: number;
  reasons: string[];
  checks: Record<string, unknown>;
}

const ACTIVE_STATUSES = new Set(["opening-soon", "open", "closing-soon", "deadline-extended"]);

/** A link label captured instead of a title, or a bare domain, is not an identity. */
function identityValid(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  if (!normalized) return false;
  // Seen in production: a submission page whose only extracted heading was
  // "SUBMIT" reached the rubric and was held only by the deadline gate — the
  // identity gate should have caught it. Single navigation words and generic
  // section headings are page chrome, not opportunity identities.
  const placeholders = [
    "here", "continue reading", "read more", "website", "official site", "apply here", "submit here",
    "learn more", "more info", "apply now", "view details",
    "submit", "submissions", "apply", "subscribe", "donate", "about", "about us", "home", "news",
    "blog", "events", "contact", "grants", "awards", "opportunities", "open call", "open calls",
    "recent books", "guidelines", "faq",
  ];
  return !placeholders.includes(normalized) && !/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/.test(normalized);
}

export function evaluatePublicationRubric(candidate: PublicationCandidate): PublicationRubricResult {
  const reasons: string[] = [];
  const sourcePresent = Boolean(candidate.sourceUrl);
  const sourceProcessed = Boolean(candidate.processingSucceededAt);
  const destinationPresent = Boolean(candidate.submissionUrl || candidate.guidelinesUrl);
  const active = ACTIVE_STATUSES.has(candidate.status);
  const deadlineOrWindow = Boolean(candidate.deadlineDate || (candidate.readingPeriodKind && candidate.readingPeriodKind !== "unknown"));
  const unsafe = candidate.submissionState === "unsafe";
  const validIdentity = identityValid(candidate.title);

  const gates: Record<string, PublicationGate> = {
    authorityDestination: sourcePresent && sourceProcessed && destinationPresent && candidate.destinationReconciled ? "pass" : "review",
    identity: validIdentity && candidate.organizationConfirmed ? "pass" : "review",
    freshness: active && deadlineOrWindow ? "pass" : "review",
    completeness: candidate.contentApproved ? "pass" : "review",
    safety: unsafe ? "fail" : "pass",
  };

  const checks = {
    gates, sourcePresent, sourceProcessed, destinationPresent,
    destinationReconciled: candidate.destinationReconciled,
    deadlineOrWindow, organizationConfirmed: candidate.organizationConfirmed,
    active, unsafe, identityValid: validIdentity, contentApproved: candidate.contentApproved,
  };

  if (unsafe) return { decision: "suppress", score: 0, reasons: ["The submission destination was marked unsafe."], checks };

  if (!sourcePresent) reasons.push("The canonical source URL is missing.");
  if (!sourceProcessed) reasons.push("The source has not completed a successful processing pass.");
  if (!destinationPresent) reasons.push("A first-party submission or guidelines destination is missing.");
  if (!candidate.destinationReconciled) reasons.push("Source-to-destination reconciliation is not confirmed.");
  if (!validIdentity) reasons.push("The opportunity title is a placeholder and must be resolved.");
  if (!candidate.organizationConfirmed) reasons.push("The host organization is not yet confirmed.");
  if (!active) reasons.push("The opportunity is not currently active.");
  if (!deadlineOrWindow) reasons.push("The deadline or reading window is unknown.");
  if (!candidate.contentApproved) reasons.push("The opportunity page content has not passed content review.");

  const passed = Object.values(gates).filter((gate) => gate === "pass").length;
  return Object.values(gates).every((gate) => gate === "pass")
    ? { decision: "publish", score: 100, reasons: ["All five publication gates passed."], checks }
    : { decision: "needs-human", score: Math.round((passed / 5) * 100), reasons, checks };
}
