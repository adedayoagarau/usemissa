import type { ExtractionResult, PageSnapshot } from "./contracts.js";

export interface EvidenceQuality {
  decision: "review" | "reject";
  score: number;
  reasons: string[];
}

/** Deterministic gate used for measurement now and promotion safety later. */
export function assessEvidenceQuality(snapshot: PageSnapshot, extraction: ExtractionResult): EvidenceQuality {
  const reasons: string[] = [];
  let score = 0;
  if (snapshot.statusCode >= 200 && snapshot.statusCode < 300) score += 0.25; else reasons.push(`HTTP ${snapshot.statusCode} is not a successful source response`);
  if (extraction.fields.some((field) => field.fieldName === "title" && field.rawValue)) score += 0.3; else reasons.push("missing authoritative title");
  if (extraction.candidateLinks.some((candidate) => candidate.role === "detail" || candidate.role === "apply")) score += 0.2;
  else reasons.push("no classified destination link");
  if (extraction.fields.some((field) => ["deadline", "description", "eligibility"].includes(field.fieldName))) score += 0.15;
  else reasons.push("missing core opportunity evidence");
  if (!extraction.warnings.some((warning) => /failed|invalid|disallow|403|404|not found|challenge|blocked/i.test(warning))) score += 0.1;
  else reasons.push("extraction contains warnings requiring review");
  return { decision: score >= 0.75 ? "review" : "reject", score: Number(score.toFixed(3)), reasons };
}
