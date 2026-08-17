import type { ExtractionResult } from "./contracts.js";

export interface OpportunityIdentity {
  key: string;
  canonicalUrl: string | null;
  title: string | null;
  organization: string | null;
  deadline: string | null;
}

function value(result: ExtractionResult, name: string): string | null {
  const field = result.fields.find((candidate) => candidate.fieldName === name);
  return field?.normalizedValue == null ? null : String(field.normalizedValue).trim() || null;
}

export function canonicalizeOpportunityUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    return url.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function keyPart(value: string | null): string {
  return (value ?? "").toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Stable, source-independent identity used for dedupe review; it never publishes by itself. */
export function buildOpportunityIdentity(result: ExtractionResult, canonicalUrl?: string | null): OpportunityIdentity {
  const title = value(result, "title");
  const organization = value(result, "organization");
  const deadline = value(result, "deadline") ?? value(result, "deadlineDate");
  const url = canonicalizeOpportunityUrl(canonicalUrl ?? result.candidateLinks.find((candidate) => candidate.role === "detail" || candidate.role === "apply")?.url);
  const identity = [keyPart(title), keyPart(organization), keyPart(deadline), keyPart(url)].filter(Boolean).join("|");
  return { key: identity || "unidentifiable", canonicalUrl: url, title, organization, deadline };
}

export function compareOpportunityIdentity(left: OpportunityIdentity, right: OpportunityIdentity): "same" | "different" | "review" {
  if (left.key === "unidentifiable" || right.key === "unidentifiable") return "review";
  if (left.canonicalUrl && right.canonicalUrl && left.canonicalUrl === right.canonicalUrl) return "same";
  if (keyPart(left.title) && keyPart(left.title) === keyPart(right.title) && keyPart(left.organization) === keyPart(right.organization)) return "same";
  if (keyPart(left.title) === keyPart(right.title) || (left.deadline && left.deadline === right.deadline)) return "review";
  return "different";
}

/** Aggregator indexes are discovery evidence, never a single opportunity. */
export function isAggregateOpportunityPage(result: ExtractionResult, canonicalUrl?: string | null): boolean {
  const title = value(result, "title")?.toLowerCase() ?? "";
  const url = canonicalizeOpportunityUrl(canonicalUrl)?.toLowerCase() ?? "";
  const explicitDirectory = /\b(?:directory|round[ -]?up|list of)\b/.test(title);
  const rankedCollection = /\b(?:best|top)\b/.test(title) && /\b(?:magazines?|journals?|contests?|places|opportunities|markets?)\b/.test(title);
  const countedCollection = /\b\d{2,}\+?\s+(?:places|magazines?|journals?|contests?|opportunities|markets?)\b/.test(title);
  const collectionUrl = /\/(?:resources\/literary-magazines|director(?:y|ies))(?:\/|$)/.test(url);
  return explicitDirectory || rankedCollection || countedCollection || collectionUrl;
}
