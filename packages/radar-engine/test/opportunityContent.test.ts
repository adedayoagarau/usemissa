import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOpportunityContent,
  reviewOpportunityContent,
  type OpportunityContentBuildInput,
} from '../src/index.js';

const sourceUrl = 'https://example.com/opportunity';

function input(overrides: Partial<OpportunityContentBuildInput> = {}): OpportunityContentBuildInput {
  return {
    title: 'Open call for new work',
    type: 'open-call',
    status: 'open',
    organizationName: 'Example Arts',
    discipline: 'Writing',
    genres: ['Poetry'],
    deadline: { kind: 'exact', date: '2026-09-01' },
    fee: { status: 'no-fee' },
    prize: 'Publication and honorarium',
    location: 'Online',
    submissionUrl: 'https://example.com/submit',
    requiredMaterials: [{ label: '作品 manuscript' }],
    sourceUrl,
    sourceProcessedAt: '2026-08-06T00:00:00.000Z',
    organizationConfirmed: true,
    ...overrides,
  };
}

test('content builder creates a bounded source-linked opportunity brief', () => {
  const content = buildOpportunityContent(input({ generatedAt: '2026-08-06T00:00:00.000Z' }));
  assert.equal(content.builderVersion, 'editorial-writer.v2');
  assert.match(content.summary, /Example Arts/);
  assert.match(content.summary, /Open call for new work/);
  assert.equal(content.highlights.every((fact) => fact.sourceUrl === sourceUrl), true);
  assert.equal(content.review.status, 'pending');
});

test('content review approves processed, confirmed, source-linked content', () => {
  const content = buildOpportunityContent(input());
  const result = reviewOpportunityContent(content, {
    sourceUrl,
    sourceProcessedAt: '2026-08-06T00:00:00.000Z',
    organizationConfirmed: true,
    submissionState: 'available',
  });
  assert.equal(result.decision, 'approved');
  assert.equal(result.score, 100);
});

test('content review routes missing source processing to a human', () => {
  const content = buildOpportunityContent(input());
  const result = reviewOpportunityContent(content, {
    sourceUrl,
    organizationConfirmed: true,
    submissionState: 'available',
  });
  assert.equal(result.decision, 'needs-human');
  assert.match(result.reasons.join(' '), /successful processing/);
});

test('content review blocks unsafe destinations and promotional claims', () => {
  const content = buildOpportunityContent(input({ submissionState: 'unsafe' }));
  const unsafe = reviewOpportunityContent(content, {
    sourceUrl,
    sourceProcessedAt: '2026-08-06T00:00:00.000Z',
    organizationConfirmed: true,
    submissionState: 'unsafe',
  });
  assert.equal(unsafe.decision, 'blocked');

  const promotional = { ...content, summary: `${content.summary} This is perfect for you and is guaranteed.` };
  const claim = reviewOpportunityContent(promotional, {
    sourceUrl,
    sourceProcessedAt: '2026-08-06T00:00:00.000Z',
    organizationConfirmed: true,
    submissionState: 'available',
  });
  assert.equal(claim.decision, 'blocked');
  assert.equal(claim.checks.unsupportedClaim, true);
});
