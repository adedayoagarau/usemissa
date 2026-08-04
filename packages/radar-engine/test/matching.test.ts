import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesCriteria } from '../src/matching/matching.js';
import type { Opportunity } from '../src/domain/types.js';

const opportunity = (taxonomyTermIds: string[]): Opportunity => ({
  id: 'opp-1', createdAt: '2026-08-01T00:00:00.000Z', status: 'open', sourceId: 'source-1',
  sourceUrl: 'https://example.test/call', alternateSourceIds: [],
  fields: {
    title: 'Open call', type: 'magazine', genres: ['poetry'],
    taxonomyAssignments: taxonomyTermIds.map((termId) => ({
      facet: 'discipline', termId, sourcePhrase: 'Poetry', normalizedPhrase: 'poetry',
      candidateTermIds: [termId], mapping: 'exact', confidence: 100, certainty: 'confirmed', reason: 'test',
    })),
    deadline: { kind: 'unknown' }, fee: { disclosed: true, amountCents: 0 }, eligibility: [], requiredMaterials: [], contactEmailPresent: false,
  }, scores: { freshness: 100, confidence: 100, trust: 100 }, trustSignals: [], lastCheckedAt: '2026-08-01T00:00:00.000Z',
  lastChangedAt: '2026-08-01T00:00:00.000Z', lastExtractionConfidence: 100, lastOpenSignal: true,
  lastClosedSignal: false, lastSuspiciousSignals: [], pastCycles: [], conflicts: [],
});

test('saved searches match canonical taxonomy IDs and explain the match', () => {
  const matched = matchesCriteria({ taxonomyTermIds: ['term_poetry'] }, opportunity(['term_poetry']), new Date('2026-08-02T00:00:00Z'));
  assert.ok(matched?.some((reason) => reason.includes('practice terms')));
});

test('canonical taxonomy criteria fail closed when assignments are absent', () => {
  assert.equal(matchesCriteria({ taxonomyTermIds: ['term_poetry'] }, opportunity([]), new Date('2026-08-02T00:00:00Z')), undefined);
});
