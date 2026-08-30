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
 * Short-label similarity: edit distance, with a substring bonus for the
 * "Casa na Ilha" / "Casa Na Ilha Residency" shape (one name embedded in a
 * longer variant of itself). This is the same technique @missa/taxonomy's
 * resolver uses to match a source phrase against a controlled vocabulary
 * label — reused here because organization names have the same shape
 * problem: short, mostly-exact strings with minor suffix/prefix variation.
 * It is deliberately not reused for TITLE matching below; taxonomy labels
 * and organization names are short, but opportunity titles are sentence-like
 * and structured differently across a directory and a host page (dates and
 * location on one side, none on the other), so edit distance on the full
 * string is the wrong tool there.
 */
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = a[i - 1] === b[j - 1] ? diagonal : Math.min(diagonal + 1, row[j] + 1, row[j - 1] + 1);
      diagonal = above;
    }
  }
  return row[b.length];
}

function labelSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.length >= 5 && (a.includes(b) || b.includes(a))) return 0.88;
  const distance = editDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length, 1);
}

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "of", "for", "in", "at", "to", "on", "by", "with", "from"]);

/**
 * Titles are sentence-like and vary in structure across a directory and a
 * host page, so they are compared by significant-word overlap rather than
 * edit distance. This is intentionally coarse: it is only ever used to
 * strengthen an organization match that has already passed, never to
 * establish identity by itself (see the "review" band below).
 */
/** A crude 6-character-prefix stem, so "residence"/"residency" and "grant"/"grants" count as the same word without a real stemmer. */
function significantWords(value: string): Set<string> {
  return new Set(
    value.split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word))
      .map((word) => word.slice(0, Math.min(word.length, 6))),
  );
}

function titleOverlap(a: string, b: string): number {
  const left = significantWords(a);
  const right = significantWords(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / Math.min(left.size, right.size);
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

/**
 * Follows Gary's documented organization-matching bands
 * (tools/pw-grants-crawler/PROFILE_SCHEMA.md): an exact host/name match
 * attaches directly; a similar name creates a review candidate, never an
 * automatic merge; a single shared, weak signal never merges by itself.
 *
 * "Title and organization" now accepts fuzzy agreement, not only exact
 * strings — a directory's phrasing rarely matches a host page's verbatim
 * ("Multidisciplinary Residence Oct/Nov/Dec 26 — Ilhabela Island, Brazil" vs
 * "The Multidisciplinary Residency Program"). But per Gary's rule, a strong
 * organization match by itself still only earns "review": it is corroboration
 * for a title match, not a title substitute. Two records with the same
 * organization can legitimately be two different opportunities.
 */
export function compareOpportunityIdentityDetailed(left: OpportunityIdentity, right: OpportunityIdentity): IdentityComparison {
  if (left.key === "unidentifiable" || right.key === "unidentifiable") return { decision: "review", basis: "none" };
  if (left.canonicalUrl && right.canonicalUrl && left.canonicalUrl === right.canonicalUrl) return { decision: "same", basis: "canonical-url" };

  const leftTitle = keyPart(left.title);
  const rightTitle = keyPart(right.title);
  const leftOrg = keyPart(left.organization);
  const rightOrg = keyPart(right.organization);
  if (leftTitle && leftTitle === rightTitle && leftOrg === rightOrg) return { decision: "same", basis: "title-and-organization" };

  const orgSimilarity = leftOrg && rightOrg ? labelSimilarity(leftOrg, rightOrg) : 0;
  // 0.85, not 0.9: the substring-containment case ("Casa na Ilha" inside "Casa Na
  // Ilha Residency") is scored at a flat 0.88 by labelSimilarity, and that is
  // the single most common real-world variant. A 0.9 floor would exclude it.
  const strongOrgMatch = orgSimilarity >= 0.85;
  const overlap = leftTitle && rightTitle ? titleOverlap(leftTitle, rightTitle) : 0;
  if (strongOrgMatch && overlap >= 0.6) return { decision: "same", basis: "title-and-organization" };
  if (strongOrgMatch || overlap >= 0.6 || (leftTitle && leftTitle === rightTitle) || (left.deadline && left.deadline === right.deadline)) {
    return { decision: "review", basis: "weak" };
  }
  return { decision: "different", basis: "none" };
}

export function compareOpportunityIdentity(left: OpportunityIdentity, right: OpportunityIdentity): "same" | "different" | "review" {
  return compareOpportunityIdentityDetailed(left, right).decision;
}

/** Aggregator indexes are discovery evidence, never a single opportunity. */
export function isAggregateOpportunityPage(result: ExtractionResult, canonicalUrl?: string | null): boolean {
  const title = value(result, "title")?.toLowerCase() ?? "";
  const url = canonicalizeOpportunityUrl(canonicalUrl)?.toLowerCase() ?? "";
  const explicitDirectory = /\b(?:directory|round[ -]?up|list of)\b/.test(title);
  const rankedCollection = /\b(?:best|top)\b/.test(title) && /\b(?:magazines?|journals?|contests?|places|opportunities|markets?)\b/.test(title);
  const countedCollection = /\b\d{2,}\+?\s+(?:places|magazines?|journals?|contests?|opportunities|markets?)\b/.test(title);
  const collectionUrl = /\/(?:resources\/literary-magazines|director(?:y|ies))(?:\/|$)/.test(url);
  const knownDirectoryUrl = /^https?:\/\/(?:www\.)?on-the-move\.org\/(?:news\/deadlines|resources\/funding(?:\/.*)?)$/.test(url)
    || /^https?:\/\/(?:www\.)?openartsforum\.com\/opportunities\/\?[^#]*\btag=/.test(url)
    || /^https?:\/\/(?:www\.)?curatorspace\.com\/opportunities\/index(?:\/.*)?(?:\?.*)?$/.test(url)
    || /^https?:\/\/(?:www\.)?transartists\.org\/en\/(?:air\/.*|deadlines|transartists-calls)$/.test(url);
  return explicitDirectory || rankedCollection || countedCollection || collectionUrl || knownDirectoryUrl;
}
