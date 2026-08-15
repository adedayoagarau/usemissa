import { buildOpportunityIdentity, compareOpportunityIdentityDetailed, type IdentityMatchBasis, type OpportunityIdentity } from "./identity.js";
import { isPotentialDestination } from "./destinations.js";
import type { ExtractionResult, PageSnapshot, SourceDefinition } from "./contracts.js";

export type PublisherDecision = "approve" | "review" | "reject";

/** How reconciliation was satisfied. Identity-comparison bases plus the
 * publisher-level "first-party-source": the page is the organization's own
 * site, so it is the destination rather than needing to link to one. */
export type ReconciliationBasis = IdentityMatchBasis | "first-party-source";

export interface DestinationReconciliation {
  decision: "pass" | "review" | "reject";
  /** Records how the match was reached. Telemetry for resolution scoring; it must not
   * be used to skip review: for followed links, the destination URL is the link we
   * followed, so a canonical-URL match is tautological rather than independent
   * corroboration. */
  basis: ReconciliationBasis;
  authoritativeUrl: string | null;
  sourceIdentity: OpportunityIdentity;
  destinationIdentity: OpportunityIdentity | null;
  reasons: string[];
}

export interface PublisherReview {
  decision: PublisherDecision;
  model: "deterministic" | "deepseek";
  publicWrite: false;
  rationale: string[];
  reconciliation: DestinationReconciliation;
}

export interface PublisherInput {
  source: SourceDefinition;
  sourceSnapshot: PageSnapshot;
  sourceExtraction: ExtractionResult;
  relatedSnapshots: PageSnapshot[];
  relatedFields: ExtractionResult["fields"];
}

function fieldsForSnapshot(fields: ExtractionResult["fields"], snapshotId: string): ExtractionResult["fields"] {
  return fields.filter((field) => field.provenance.snapshotId === snapshotId);
}

function deterministicReconciliation(input: PublisherInput): DestinationReconciliation {
  // The source's own identity comes from the page it was fetched from, never
  // from a link it points to (see identity.ts) — isPotentialDestination widens
  // which outbound links count as candidates, but must not touch how the
  // source's own identity is built.
  const sourceIdentity = buildOpportunityIdentity(input.sourceExtraction, input.sourceSnapshot.finalUrl || input.sourceSnapshot.url);
  const candidates = input.sourceExtraction.candidateLinks.filter((candidate) => isPotentialDestination(input.source, candidate));

  /**
   * An organization's own page IS first-party: demanding it link outward to
   * prove itself is asking the destination to link to a destination. Measured
   * against production before this branch existed, that demand rejected 586 of
   * 589 completed runs in a day — 98% of the registry is organization-website
   * sources with no configured destination rules, so no link ever qualified.
   * The demand for an external first-party destination remains exactly as
   * strict for directories, where it is the correct test.
   *
   * A classified same-host candidate, when one exists, still refines the URL —
   * so the loop below runs first and this branch is the fallback, not a
   * bypass. The model review still runs after a first-party pass; its question
   * becomes "is this page a live, specific opportunity", which is the risk
   * that remains on an organization's own site.
   */
  const firstParty = input.source.kind === "organization-website" || input.source.kind === "profile";
  const firstPartyPass = (): DestinationReconciliation | null => {
    if (!firstParty) return null;
    if (input.sourceSnapshot.statusCode < 200 || input.sourceSnapshot.statusCode >= 300) return null;
    if (sourceIdentity.key === "unidentifiable" || !sourceIdentity.title) return null;
    const authoritativeUrl = input.sourceSnapshot.finalUrl || input.sourceSnapshot.url;
    return { decision: "pass", basis: "first-party-source", authoritativeUrl, sourceIdentity, destinationIdentity: sourceIdentity, reasons: ["The source is the organization's own page; it is the first-party destination for the opportunity it describes."] };
  };

  if (!candidates.length) {
    const pass = firstPartyPass();
    if (pass) return pass;
    return { decision: "reject", basis: "none", authoritativeUrl: null, sourceIdentity, destinationIdentity: null, reasons: ["No authoritative detail or application link was classified from the source page."] };
  }

  for (const candidate of candidates) {
    const destination = input.relatedSnapshots.find((snapshot) => snapshot.url === candidate.url || snapshot.finalUrl === candidate.url);
    if (!destination || destination.statusCode < 200 || destination.statusCode >= 300) continue;
    const destinationExtraction: ExtractionResult = { fields: fieldsForSnapshot(input.relatedFields, destination.id), candidateLinks: [], warnings: [] };
    const destinationIdentity = buildOpportunityIdentity(destinationExtraction, destination.finalUrl || destination.url);
    const identity = compareOpportunityIdentityDetailed(sourceIdentity, destinationIdentity);
    if (identity.decision === "same") return { decision: "pass", basis: identity.basis, authoritativeUrl: destination.finalUrl || destination.url, sourceIdentity, destinationIdentity, reasons: ["The source record reconciles to the fetched authoritative destination by canonical URL or title and organization."] };
    if (identity.decision === "review") return { decision: "review", basis: identity.basis, authoritativeUrl: destination.finalUrl || destination.url, sourceIdentity, destinationIdentity, reasons: ["The linked destination was fetched, but its identity is ambiguous against the source record."] };
  }
  // Candidates existed but none reconciled. For a directory that is a hard
  // stop; for an organization's own page it only means the outbound links were
  // navigation noise — the page itself still stands as the destination.
  const pass = firstPartyPass();
  if (pass) return pass;
  return { decision: "reject", basis: "none", authoritativeUrl: null, sourceIdentity, destinationIdentity: null, reasons: ["No fetched authoritative destination reconciled to the source record."] };
}

function promptFor(input: PublisherInput, reconciliation: DestinationReconciliation): string {
  const sourceText = input.sourceSnapshot.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 8_000);
  const destinationText = input.relatedSnapshots.map((snapshot) => `${snapshot.finalUrl || snapshot.url}\n${snapshot.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 5_000)}`).join("\n\n");
  // The old prompt told the model a source page "is not authoritative" — the
  // right instruction for a followed directory link, and a guaranteed
  // rejection for a first-party page. The question asked must match the case
  // being reviewed.
  if (reconciliation.basis === "first-party-source") {
    return `You are the Missa evidence publisher reviewer. This page is the organization's own website, so it is already the first-party source. Decide only whether it presents a live, specific opportunity: a named call, residency, grant, award, or submission window with concrete details a person could act on. Reject a generic homepage, an expired or archived call, or a page that is not an opportunity at all. Never invent facts. Return JSON only: {"decision":"approve"|"review"|"reject","reason":"..."}.\n\nDeterministic reconciliation:\n${JSON.stringify(reconciliation)}\n\nPage:\n${sourceText}`;
  }
  return `You are the Missa evidence publisher reviewer. Decide only whether a candidate is safe to move from shadow evidence to human publication review. Never invent facts. A source/landing page is not authoritative when an official detail or application page exists. Approve only when the fetched destination clearly represents the same opportunity and the source link points to it. Return JSON only: {"decision":"approve"|"review"|"reject","reason":"..."}.\n\nDeterministic reconciliation:\n${JSON.stringify(reconciliation)}\n\nSource page:\n${sourceText}\n\nFetched destinations:\n${destinationText}`;
}

async function deepSeekDecision(input: PublisherInput, reconciliation: DestinationReconciliation, apiKey: string): Promise<{ decision: PublisherDecision; reason: string }> {
  const response = await fetch(process.env.DEEPSEEK_PUBLISHER_ENDPOINT ?? "https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: process.env.DEEPSEEK_PUBLISHER_MODEL ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat", temperature: 0, max_tokens: 256, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Return only the requested JSON object." }, { role: "user", content: promptFor(input, reconciliation) }] }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`DeepSeek publisher review HTTP ${response.status}`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const raw = body.choices?.[0]?.message?.content;
  if (!raw) throw new Error("DeepSeek publisher review returned empty content");
  const parsed = JSON.parse(raw) as { decision?: PublisherDecision; reason?: string };
  const decision = parsed.decision === "approve" || parsed.decision === "review" || parsed.decision === "reject" ? parsed.decision : "review";
  return { decision, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 500) : "DeepSeek returned no review rationale." };
}

export async function reviewForPublication(input: PublisherInput, options: { apiKey?: string } = {}): Promise<PublisherReview> {
  const reconciliation = deterministicReconciliation(input);
  if (reconciliation.decision !== "pass") return { decision: reconciliation.decision === "reject" ? "reject" : "review", model: "deterministic", publicWrite: false, rationale: reconciliation.reasons, reconciliation };
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return { decision: "review", model: "deterministic", publicWrite: false, rationale: ["DeepSeek publisher review is not configured; no automatic publication decision was made."], reconciliation };
  try {
    const model = await deepSeekDecision(input, reconciliation, apiKey);
    return { decision: model.decision, model: "deepseek", publicWrite: false, rationale: [model.reason], reconciliation };
  } catch (error) {
    return { decision: "review", model: "deepseek", publicWrite: false, rationale: [`DeepSeek publisher review failed closed: ${error instanceof Error ? error.message : String(error)}`], reconciliation };
  }
}
