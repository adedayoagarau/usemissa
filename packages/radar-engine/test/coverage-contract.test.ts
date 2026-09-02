import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateOperationalCoverage,
  WRITING_COVERAGE_SEGMENTS,
  WRITING_COVERAGE_THRESHOLDS,
} from '../src/coverage/contract.js';

const healthy = {
  monitoredSources: 7,
  healthySources: 7,
  canonicalSources: 3,
  requiredSegments: [...WRITING_COVERAGE_SEGMENTS],
  coveredSegments: [...WRITING_COVERAGE_SEGMENTS],
  activePublished: 100,
  publishedDeadlineKnown: 98,
  publishedDestinationAvailable: 95,
  publishedOrganizationConfirmed: 96,
  reviewable: 20,
  reviewSlaBreaches: 1,
  activeExpired: 0,
  duplicateGroups: 0,
};

test('operational coverage passes only when source, inventory, and safety checks pass', () => {
  const assessment = evaluateOperationalCoverage(healthy, WRITING_COVERAGE_THRESHOLDS);
  assert.equal(assessment.status, 'pass');
  assert.equal(assessment.missingSegments.length, 0);
  assert.ok(assessment.checks.every((check) => check.status === 'pass'));
});

test('more records cannot hide structural and review failures', () => {
  const assessment = evaluateOperationalCoverage({
    ...healthy,
    activePublished: 10_000,
    publishedDestinationAvailable: 100,
    coveredSegments: ['contests-and-awards'],
    reviewable: 300,
    reviewSlaBreaches: 250,
  }, WRITING_COVERAGE_THRESHOLDS);
  assert.equal(assessment.status, 'fail');
  assert.ok(assessment.missingSegments.includes('literary-translation'));
  assert.equal(assessment.metrics.publishedDestinationRate, 0.01);
});

test('empty denominators fail closed instead of appearing healthy', () => {
  const assessment = evaluateOperationalCoverage({
    ...healthy,
    monitoredSources: 0,
    healthySources: 0,
    activePublished: 0,
    publishedDeadlineKnown: 0,
    publishedDestinationAvailable: 0,
    publishedOrganizationConfirmed: 0,
    reviewable: 0,
    reviewSlaBreaches: 0,
  }, WRITING_COVERAGE_THRESHOLDS);
  assert.equal(assessment.metrics.healthySourceRate, 0);
  assert.equal(assessment.metrics.publishedDeadlineRate, 0);
  assert.equal(assessment.status, 'fail');
});
