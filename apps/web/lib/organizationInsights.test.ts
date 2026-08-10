import assert from 'node:assert/strict';
import test from 'node:test';
import type { TaxonomySeedTerm } from '@missa/taxonomy';
import { completeOutcomeTime, decidedWorkCoverage, taggedWorkCounts } from './organizationInsights';

test('decided Work coverage deduplicates decisions and keeps the Work denominator explicit', () => {
  assert.deepEqual(decidedWorkCoverage(['w1', 'w2', 'w3'], [{ workId: 'w1' }, { workId: 'w1' }, { workId: 'foreign' }]), { decidedWorks: 1, totalWorks: 3, ratio: 1 / 3 });
  assert.deepEqual(decidedWorkCoverage([], []), { decidedWorks: 0, totalWorks: 0, ratio: null });
});

test('complete outcome time includes only fully decided Submissions and averages an even median', () => {
  const result = completeOutcomeTime([
    { id: 's1', submittedAt: '2026-08-01T00:00:00.000Z', workIds: ['w1'] },
    { id: 's2', submittedAt: '2026-08-01T00:00:00.000Z', workIds: ['w2', 'w3'] },
    { id: 's3', submittedAt: '2026-08-01T00:00:00.000Z', workIds: ['w4'] },
  ], [
    { workId: 'w1', decidedAt: '2026-08-03T00:00:00.000Z' },
    { workId: 'w2', decidedAt: '2026-08-05T00:00:00.000Z' },
    { workId: 'w3', decidedAt: '2026-08-07T00:00:00.000Z' },
  ]);
  assert.deepEqual(result, { medianDays: 4, includedSubmissions: 2, incompleteSubmissions: 1, invalidDateSubmissions: 0 });
});

test('complete outcome time excludes invalid or backwards dates', () => {
  assert.deepEqual(completeOutcomeTime([{ id: 's1', submittedAt: 'bad', workIds: ['w1'] }, { id: 's2', submittedAt: '2026-08-03T00:00:00Z', workIds: ['w2'] }], [{ workId: 'w1', decidedAt: '2026-08-04T00:00:00Z' }, { workId: 'w2', decidedAt: '2026-08-02T00:00:00Z' }]), { medianDays: null, includedSubmissions: 0, incompleteSubmissions: 0, invalidDateSubmissions: 2 });
});

test('taxonomy counts are non-additive tagged-Work rows and expose missing references', () => {
  const terms: TaxonomySeedTerm[] = [
    { id: 'poetry', facet: 'discipline', slug: 'poetry', preferredLabel: 'Poetry', aliases: [], broaderTermIds: [], culturallySensitive: false, selectable: true },
    { id: 'essay', facet: 'form', slug: 'essay', preferredLabel: 'Essay', aliases: [], broaderTermIds: [], culturallySensitive: false, selectable: true },
  ];
  assert.deepEqual(taggedWorkCounts([{ id: 'w1', taxonomyTermIds: ['poetry', 'poetry', 'essay'] }, { id: 'w2', taxonomyTermIds: ['missing'] }, { id: 'w3' }], terms, 'discipline'), { rows: [{ termId: 'poetry', label: 'Poetry', worksTagged: 1 }], untaggedWorks: 2, unresolvedReferences: 1 });
});
