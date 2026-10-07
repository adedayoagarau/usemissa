import type { RubricCriterion } from "./domain/types.js";

/**
 * Rubric rules shared by the engine and the web layer. Pure functions only,
 * so a client component can use them without the Postgres driver.
 */

export const RUBRIC_LIMITS = { maxCriteria: 10, labelLength: 80, descriptionLength: 400, minWeight: 1, maxWeight: 10, minScale: 3, maxScale: 10 } as const;

export interface RubricCriterionInput {
  id?: string;
  label: string;
  description?: string;
  weight?: number;
  maxScore?: number;
}

function slug(label: string): string {
  return label.toLocaleLowerCase("en").normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "criterion";
}

/** Validates and normalizes criteria. Ids are kept when given, otherwise derived from the label and made unique. */
export function normalizeRubricCriteria(input: RubricCriterionInput[]): RubricCriterion[] {
  if (!Array.isArray(input)) throw new Error("Send criteria as a list");
  if (input.length > RUBRIC_LIMITS.maxCriteria) throw new Error(`A rubric can have at most ${RUBRIC_LIMITS.maxCriteria} criteria`);
  const used = new Set<string>();
  return input.map((item, index) => {
    const label = typeof item?.label === "string" ? item.label.trim() : "";
    if (!label) throw new Error(`Criterion ${index + 1} needs a name`);
    if (label.length > RUBRIC_LIMITS.labelLength) throw new Error(`Keep criterion names under ${RUBRIC_LIMITS.labelLength} characters`);
    const description = typeof item.description === "string" ? item.description.trim() : "";
    if (description.length > RUBRIC_LIMITS.descriptionLength) throw new Error(`Keep criterion guidance under ${RUBRIC_LIMITS.descriptionLength} characters`);
    const weight = item.weight ?? 1;
    if (!Number.isInteger(weight) || weight < RUBRIC_LIMITS.minWeight || weight > RUBRIC_LIMITS.maxWeight) throw new Error(`Weight for “${label}” must be a whole number from ${RUBRIC_LIMITS.minWeight} to ${RUBRIC_LIMITS.maxWeight}`);
    const maxScore = item.maxScore ?? 5;
    if (!Number.isInteger(maxScore) || maxScore < RUBRIC_LIMITS.minScale || maxScore > RUBRIC_LIMITS.maxScale) throw new Error(`The scale for “${label}” must top out between ${RUBRIC_LIMITS.minScale} and ${RUBRIC_LIMITS.maxScale}`);
    let id = typeof item.id === "string" && /^[a-z0-9-]{1,40}$/.test(item.id) ? item.id : slug(label);
    for (let n = 2; used.has(id); n += 1) id = `${slug(label)}-${n}`;
    used.add(id);
    return { id, label, ...(description ? { description } : {}), weight, maxScore };
  });
}

/** Checks a reader's scores against a rubric: every criterion scored, whole numbers within its scale. */
export function validateCriterionScores(criteria: RubricCriterion[], scores: Record<string, unknown>): Record<string, number> {
  const clean: Record<string, number> = {};
  for (const criterion of criteria) {
    const value = scores?.[criterion.id];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > criterion.maxScore) throw new Error(`Score “${criterion.label}” with a whole number from 0 to ${criterion.maxScore}`);
    clean[criterion.id] = value;
  }
  return clean;
}

/** The weighted rubric result on the 0-100 scale the rest of review uses (ranking, calibration). */
export function weightedRubricScore(criteria: RubricCriterion[], scores: Record<string, number>): number {
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (!totalWeight) return 0;
  const weighted = criteria.reduce((sum, criterion) => sum + criterion.weight * ((scores[criterion.id] ?? 0) / criterion.maxScore), 0);
  return Math.round((weighted / totalWeight) * 100);
}
