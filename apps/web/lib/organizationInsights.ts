import type { TaxonomyFacetKey, TaxonomySeedTerm } from '@missa/taxonomy';

export interface InsightsSubmissionInput {
  id: string;
  submittedAt: string;
  workIds: string[];
}

export interface InsightsDecisionInput {
  workId: string;
  decidedAt: string;
}

export interface CompleteOutcomeTime {
  medianDays: number | null;
  includedSubmissions: number;
  incompleteSubmissions: number;
  invalidDateSubmissions: number;
}

export function decidedWorkCoverage(workIds: string[], decisions: Array<Pick<InsightsDecisionInput, 'workId'>>) {
  const inScope = new Set(workIds);
  const decided = new Set(decisions.filter((decision) => inScope.has(decision.workId)).map((decision) => decision.workId));
  return { decidedWorks: decided.size, totalWorks: inScope.size, ratio: inScope.size ? decided.size / inScope.size : null };
}

export function completeOutcomeTime(submissions: InsightsSubmissionInput[], decisions: InsightsDecisionInput[]): CompleteOutcomeTime {
  const decisionByWork = new Map(decisions.map((decision) => [decision.workId, decision]));
  const days: number[] = [];
  let incompleteSubmissions = 0;
  let invalidDateSubmissions = 0;
  for (const submission of submissions) {
    if (submission.workIds.length === 0 || submission.workIds.some((workId) => !decisionByWork.has(workId))) {
      incompleteSubmissions += 1;
      continue;
    }
    const submittedAt = Date.parse(submission.submittedAt);
    const decisionTimes = submission.workIds.map((workId) => Date.parse(decisionByWork.get(workId)!.decidedAt));
    if (!Number.isFinite(submittedAt) || decisionTimes.some((value) => !Number.isFinite(value))) {
      invalidDateSubmissions += 1;
      continue;
    }
    const latestDecision = Math.max(...decisionTimes);
    if (latestDecision < submittedAt) {
      invalidDateSubmissions += 1;
      continue;
    }
    days.push((latestDecision - submittedAt) / 86_400_000);
  }
  days.sort((a, b) => a - b);
  const middle = Math.floor(days.length / 2);
  const median = days.length === 0 ? null : days.length % 2 ? days[middle]! : (days[middle - 1]! + days[middle]!) / 2;
  return { medianDays: median === null ? null : Math.round(median * 10) / 10, includedSubmissions: days.length, incompleteSubmissions, invalidDateSubmissions };
}

export interface TaxonomyWorkInput { id: string; taxonomyTermIds?: string[] }

export function taggedWorkCounts(works: TaxonomyWorkInput[], terms: TaxonomySeedTerm[], facet: TaxonomyFacetKey) {
  const termsById = new Map(terms.map((term) => [term.id, term]));
  const counts = new Map<string, number>();
  let untaggedWorks = 0;
  let unresolvedReferences = 0;
  for (const work of works) {
    const resolved = [...new Set(work.taxonomyTermIds ?? [])].flatMap((termId) => {
      const term = termsById.get(termId);
      if (!term) {
        unresolvedReferences += 1;
        return [];
      }
      return term.facet === facet ? [term] : [];
    });
    if (resolved.length === 0) untaggedWorks += 1;
    for (const term of resolved) counts.set(term.id, (counts.get(term.id) ?? 0) + 1);
  }
  const rows = [...counts.entries()].map(([termId, worksTagged]) => ({ termId, label: termsById.get(termId)!.preferredLabel, worksTagged })).sort((a, b) => b.worksTagged - a.worksTagged || a.label.localeCompare(b.label));
  return { rows, untaggedWorks, unresolvedReferences };
}
