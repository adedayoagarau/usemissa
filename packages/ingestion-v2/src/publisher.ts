import { buildOpportunityIdentity, compareOpportunityIdentity, type OpportunityIdentity } from "./identity.js";
import { isPotentialDestination } from "./destinations.js";
import type { ExtractionResult, PageSnapshot, SourceDefinition } from "./contracts.js";

export type PublisherDecision = "approve" | "review" | "reject";

export interface DestinationReconciliation {
  decision: "pass" | "review" | "reject";
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
  const sourceIdentity = buildOpportunityIdentity(input.sourceExtraction);
  const candidates = input.sourceExtraction.candidateLinks.filter((candidate) => isPotentialDestination(input.source, candidate));
  if (!candidates.length) return { decision: "reject", authoritativeUrl: null, sourceIdentity, destinationIdentity: null, reasons: ["No authoritative detail or application link was classified from the source page."] };

  for (const candidate of candidates) {
    const destination = input.relatedSnapshots.find((snapshot) => snapshot.url === candidate.url || snapshot.finalUrl === candidate.url);
    if (!destination || destination.statusCode < 200 || destination.statusCode >= 300) continue;
    const destinationExtraction: ExtractionResult = { fields: fieldsForSnapshot(input.relatedFields, destination.id), candidateLinks: [], warnings: [] };
    const destinationIdentity = buildOpportunityIdentity(destinationExtraction, destination.finalUrl || destination.url);
    const sourceIdentityForCandidate = buildOpportunityIdentity(input.sourceExtraction, candidate.url);
    const identityDecision = compareOpportunityIdentity(sourceIdentityForCandidate.key === "unidentifiable" ? sourceIdentity : sourceIdentityForCandidate, destinationIdentity);
    if (identityDecision === "same") return { decision: "pass", authoritativeUrl: destination.finalUrl || destination.url, sourceIdentity, destinationIdentity, reasons: ["The source record reconciles to the fetched authoritative destination by canonical URL or title and organization."] };
    if (identityDecision === "review") return { decision: "review", authoritativeUrl: destination.finalUrl || destination.url, sourceIdentity, destinationIdentity, reasons: ["The linked destination was fetched, but its identity is ambiguous against the source record."] };
  }
  return { decision: "reject", authoritativeUrl: null, sourceIdentity, destinationIdentity: null, reasons: ["No fetched authoritative destination reconciled to the source record."] };
}

function promptFor(input: PublisherInput, reconciliation: DestinationReconciliation): string {
  const sourceText = input.sourceSnapshot.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 8_000);
  const destinationText = input.relatedSnapshots.map((snapshot) => `${snapshot.finalUrl || snapshot.url}\n${snapshot.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 5_000)}`).join("\n\n");
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
