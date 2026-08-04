import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCoverage, buildCoverageQueries, deduplicateCandidateUrls, summarizeTaxonomyMetrics } from '../src/coverage/coverage.js';

const cell = { id: 'cell', termIds: ['poetry'], opportunityType: 'grant', geographyCode: 'NG', languageCode: 'en', sourceTier: 0, minimumSources: 3, minimumCanonicalSources: 1, lastAssessedAt: '2026-08-04T00:00:00Z' };

test('coverage status derives counts from active memberships', () => {
  assert.equal(assessCoverage({ ...cell, lastAssessedAt: undefined }, []).status, 'unassessed');
  assert.equal(assessCoverage(cell, [{ sourceId: 'a', role: 'canonical', status: 'active' }]).status, 'thin');
  assert.equal(assessCoverage(cell, [
    { sourceId: 'a', role: 'canonical', status: 'active' },
    { sourceId: 'b', role: 'canonical', status: 'active' },
    { sourceId: 'c', role: 'application', status: 'active' },
  ]).status, 'covered');
  assert.equal(assessCoverage(cell, [
    { sourceId: 'a', role: 'canonical', status: 'active' },
    { sourceId: 'b', role: 'canonical', status: 'active' },
    { sourceId: 'c', role: 'canonical', status: 'active' },
    { sourceId: 'd', role: 'application', status: 'active' },
    { sourceId: 'e', role: 'application', status: 'active' },
    { sourceId: 'f', role: 'application', status: 'active' },
  ]).status, 'strong');
});

test('coverage queries are locale-aware and bounded', () => {
  const queries = buildCoverageQueries({ termLabels: ['Poetry', 'Poetry'], opportunityType: 'grant', geographyCode: 'NG', languageCode: 'en' }, 2);
  assert.equal(queries.length, 2);
  assert.ok(queries.every((query) => query.includes('NG') && query.includes('en')));
});

test('candidate URLs are globally deduplicated and invalid URLs are dropped', () => {
  assert.deepEqual(deduplicateCandidateUrls(['HTTPS://Example.test/call/#details', 'https://example.test/call', 'not-a-url']), ['https://example.test/call']);
});

test('taxonomy operational metrics preserve facet, certainty, and review counts', () => {
  const metrics = summarizeTaxonomyMetrics([
    { facet: 'discipline', origin: 'extractor', certainty: 'confirmed', resolved: true },
    { facet: 'genre', origin: 'extractor', certainty: 'unknown', resolved: false, ambiguous: true },
  ]);
  assert.equal(metrics.totalAssignments, 2);
  assert.equal(metrics.unresolved, 1);
  assert.equal(metrics.ambiguous, 1);
  assert.equal(metrics.byFacet.genre, 1);
});
