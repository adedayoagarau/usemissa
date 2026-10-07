import type { RubricCriterion } from '@missa/workspace-engine';

/**
 * Client-safe rubric helpers. The server recomputes and stores the weighted
 * score with the engine's weightedRubricScore; this preview must match it.
 */
export const RUBRIC_UI_LIMITS = { maxCriteria: 10, minWeight: 1, maxWeight: 10, minScale: 3, maxScale: 10 } as const;

export function previewRubricScore(criteria: Pick<RubricCriterion, 'id' | 'weight' | 'maxScore'>[], scores: Record<string, number | undefined>): number | undefined {
  if (!criteria.length || criteria.some((criterion) => scores[criterion.id] === undefined)) return undefined;
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (!totalWeight) return undefined;
  const weighted = criteria.reduce((sum, criterion) => sum + criterion.weight * ((scores[criterion.id] ?? 0) / criterion.maxScore), 0);
  return Math.round((weighted / totalWeight) * 100);
}
