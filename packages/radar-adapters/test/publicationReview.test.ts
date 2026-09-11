import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPublicationCandidate, publicationReviewMembershipHash } from '../src/publicationReview.js';
import type { PublicationRubricCandidate } from '../src/publicationRubric.js';

const ready: PublicationRubricCandidate = {
  title: 'A real writing prize',
  status: 'open',
  submissionState: 'available',
  deadlineDate: '2026-09-30',
  deadlineKind: 'exact',
  submissionUrl: 'https://example.test/apply',
  guidelinesUrl: 'https://example.test/guidelines',
  sourceUrl: 'https://example.test/call',
  processingSucceededAt: '2026-08-17T00:00:00Z',
  organizationConfirmed: true,
  reviewOnly: true,
  readingPeriodKind: null,
  evidenceCount: 3,
  destinationReconciled: true,
  contentApproved: true,
};

test('only the explicit v2 hold can enter the publish-after-human-approval lane', () => {
  assert.equal(classifyPublicationCandidate(ready).lane, 'publish-after-human-approval');
  assert.equal(classifyPublicationCandidate({ ...ready, organizationConfirmed: false }).lane, 'repair-required');
  assert.equal(classifyPublicationCandidate({ ...ready, title: 'Top 50 magazines' }).lane, 'suppress');
});

test('review membership hash is stable across row order and changes with input version', () => {
  const first = { opportunityId: 'opp_1', reviewJobId: 'job_1', inputVersion: 'v1', lane: 'repair-required' as const };
  const second = { opportunityId: 'opp_2', reviewJobId: 'job_2', inputVersion: 'v1', lane: 'suppress' as const };
  assert.equal(publicationReviewMembershipHash([first, second]), publicationReviewMembershipHash([second, first]));
  assert.notEqual(publicationReviewMembershipHash([first]), publicationReviewMembershipHash([{ ...first, inputVersion: 'v2' }]));
});
