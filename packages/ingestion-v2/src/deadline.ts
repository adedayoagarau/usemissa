import type { ExtractionResult } from "./contracts.js";

export interface ResolvedDeadline {
  date: string | null;
  conflict: boolean;
  values: string[];
}

function explicitDate(value: string): string | undefined {
  if (!/\b(?:19|20)\d{2}\b/.test(value)) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function host(value: string | undefined): string {
  try {
    return value ? new URL(value).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

/** Resolve one explicit deadline from all evidence. Ambiguous dates without a
 * year are ignored, and contradictory explicit dates fail closed. */
export function resolveCurrentDeadline(
  fields: ExtractionResult["fields"],
  authoritativeUrl?: string | null,
  now = new Date(),
): ResolvedDeadline {
  const authoritativeHost = host(authoritativeUrl ?? undefined);
  const candidates = fields.flatMap((field) => {
    if (field.fieldName !== "deadline") return [];
    const value = typeof field.normalizedValue === "string" ? field.normalizedValue : field.rawValue;
    const date = value ? explicitDate(value) : undefined;
    if (!date) return [];
    const score = (host(field.provenance.sourceUrl) === authoritativeHost ? 2 : 0) + (field.provenance.method === "deepseek-json-shadow" ? 0 : 1);
    return [{ date, score }];
  });
  const values = [...new Set(candidates.map((candidate) => candidate.date))].sort();
  if (values.length > 1) return { date: null, conflict: true, values };
  const selected = candidates.sort((left, right) => right.score - left.score)[0]?.date ?? null;
  const today = now.toISOString().slice(0, 10);
  return { date: selected && selected >= today ? selected : null, conflict: false, values };
}
