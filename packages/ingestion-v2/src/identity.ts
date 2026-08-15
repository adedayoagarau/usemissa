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

/**
 * Stable, source-independent identity used for dedupe review; it never
 * publishes by itself.
 *
 * `canonicalUrl` must be the URL of the page this extraction came FROM, never
 * a URL the page merely links to. `result.candidateLinks` holds outbound
 * links — pages the page is pointing at, not claiming to be. A prior version
 * fell back to the first outbound detail/apply link when no canonicalUrl was
 * given, which made a page's "identity" quietly equal to a destination it had
 * not been verified against yet. Verified live: a directory listing titled
 * "Creative Professionals Talent Recruitment Initiative" reconciled as the
 * SAME opportunity as a destination titled "Pollock-Krasner Foundation
 * Grants" purely because that destination was the very link the fallback had
 * borrowed as the source's own canonical URL — a comparison against itself,
 * not against independent evidence.
 *
 * There is no safe fallback for a self-referential URL: an extraction result
 * has no built-in notion of "the URL I was fetched from." Callers must pass
 * canonicalUrl explicitly from the snapshot that produced the extraction.
 * Omitting it is not an error — many extractions (e.g. a destination fetched
 * before its own URL is known) legitimately have none — but it must never be
 * silently invented from an outbound link.
 */
export function buildOpportunityIdentity(result: ExtractionResult, canonicalUrl?: string | null): OpportunityIdentity {
  const title = value(result, "title");
  const organization = value(result, "organization");
  const deadline = value(result, "deadline") ?? value(result, "deadlineDate");
  const url = canonicalizeOpportunityUrl(canonicalUrl ?? null);
  const identity = [keyPart(title), keyPart(organization), keyPart(deadline), keyPart(url)].filter(Boolean).join("|");
  return { key: identity || "unidentifiable", canonicalUrl: url, title, organization, deadline };
}

export type IdentityMatchBasis = "canonical-url" | "title-and-organization" | "weak" | "none";

export interface IdentityComparison {
  decision: "same" | "different" | "review";
  /** How the decision was reached. A canonical-URL match needs no further judgement. */
  basis: IdentityMatchBasis;
}

export function compareOpportunityIdentityDetailed(left: OpportunityIdentity, right: OpportunityIdentity): IdentityComparison {
  if (left.key === "unidentifiable" || right.key === "unidentifiable") return { decision: "review", basis: "none" };
  if (left.canonicalUrl && right.canonicalUrl && left.canonicalUrl === right.canonicalUrl) return { decision: "same", basis: "canonical-url" };
  if (keyPart(left.title) && keyPart(left.title) === keyPart(right.title) && keyPart(left.organization) === keyPart(right.organization)) return { decision: "same", basis: "title-and-organization" };
  if (keyPart(left.title) === keyPart(right.title) || (left.deadline && left.deadline === right.deadline)) return { decision: "review", basis: "weak" };
  return { decision: "different", basis: "none" };
}

export function compareOpportunityIdentity(left: OpportunityIdentity, right: OpportunityIdentity): "same" | "different" | "review" {
  return compareOpportunityIdentityDetailed(left, right).decision;
}
