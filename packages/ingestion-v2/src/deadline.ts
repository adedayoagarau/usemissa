import type { ExtractionResult } from "./contracts.js";

export interface ResolvedDeadline {
  date: string | null;
  conflict: boolean;
  values: string[];
  kind: "exact" | "rolling" | "year-round" | "seasonal" | "until-filled" | "unknown";
}

function explicitDate(value: string): string | undefined {
  if (!/\b(?:19|20)\d{2}\b/.test(value)) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function canonicalPage(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/$/, "") || "/"}`;
  } catch {
    return undefined;
  }
}

/** Resolve one explicit deadline from all evidence. Ambiguous dates without a
 * year are ignored, and contradictory explicit dates fail closed. */
export function resolveCurrentDeadline(
  fields: ExtractionResult["fields"],
  authoritativeUrl?: string | null,
  now = new Date(),
): ResolvedDeadline {
  const declaredKinds = fields.flatMap((field) => {
    if (field.fieldName !== "deadlineKind") return [];
    const value = String(field.normalizedValue ?? field.rawValue ?? "").trim().toLowerCase();
    return ["rolling", "year-round", "seasonal", "until-filled"].includes(value) ? [value] : [];
  });
  const candidates = fields.flatMap((field) => {
    if (field.fieldName !== "deadline") return [];
    const value = typeof field.normalizedValue === "string" ? field.normalizedValue : field.rawValue;
    const date = value ? explicitDate(value) : undefined;
    if (!date) return [];
    return [{
      date,
      deterministic: field.provenance.method !== "deepseek-json-shadow",
      sourcePage: canonicalPage(field.provenance.sourceUrl),
    }];
  });
  const values = [...new Set(candidates.map((candidate) => candidate.date))].sort();
  const deterministicCandidates = candidates.filter((candidate) => candidate.deterministic);
  const sourceCardCandidates = deterministicCandidates.filter((candidate) =>
    fields.some((field) => field.fieldName === "deadline" && field.provenance.method === "html-link-context-deadline" && explicitDate(typeof field.normalizedValue === "string" ? field.normalizedValue : field.rawValue ?? "") === candidate.date),
  );
  const authoritativePage = canonicalPage(authoritativeUrl);
  const authoritativeCandidates = authoritativePage
    ? deterministicCandidates.filter((candidate) => candidate.sourcePage === authoritativePage)
    : [];
  const preferred = sourceCardCandidates.length
    ? sourceCardCandidates
    : authoritativeCandidates.length
    ? authoritativeCandidates
    : deterministicCandidates.length
      ? deterministicCandidates
      : candidates;
  const preferredValues = [...new Set(preferred.map((candidate) => candidate.date))];
  const today = now.toISOString().slice(0, 10);
  const currentPreferredValues = preferredValues.filter((value) => value >= today).sort();
  const selected = currentPreferredValues[0] ?? null;

  // Multiple deterministic deadline labels on the same authoritative page
  // are phased windows (early, regular, final), not contradictory sources.
  // Model-only disagreement remains a conflict and therefore fails closed.
  const preferredPages = new Set(preferred.map((candidate) => candidate.sourcePage).filter(Boolean));
  const deterministicMultiWindow = preferred.length > 1 && preferred.every((candidate) => candidate.deterministic) && preferredPages.size === 1;
  if (preferredValues.length > 1 && !deterministicMultiWindow) {
    return { date: null, conflict: true, values, kind: "unknown" };
  }
  if (selected) return { date: selected, conflict: false, values, kind: "exact" };
  if (declaredKinds.includes("rolling")) return { date: null, conflict: false, values, kind: "rolling" };
  if (declaredKinds.includes("year-round")) return { date: null, conflict: false, values, kind: "year-round" };
  if (declaredKinds.includes("seasonal")) return { date: null, conflict: false, values, kind: "seasonal" };
  if (declaredKinds.includes("until-filled")) return { date: null, conflict: false, values, kind: "until-filled" };
  return { date: null, conflict: false, values, kind: "unknown" };
}

/** A current exact date or an explicit open-ended intake declaration can
 * enter human review. Unknown dates and conflicts cannot. */
export function hasCurrentDeadlineOrWindow(
  fields: ExtractionResult["fields"],
  authoritativeUrl?: string | null,
  now = new Date(),
): boolean {
  const resolved = resolveCurrentDeadline(fields, authoritativeUrl, now);
  return !resolved.conflict && resolved.kind !== "unknown";
}
