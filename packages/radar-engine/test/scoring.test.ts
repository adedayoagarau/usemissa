import { test } from 'node:test';
import assert from 'node:assert/strict';
import { titleSimilarity, normalizeName } from '../src/dedup/dedup.js';
import { predictNextOpening } from '../src/prediction/prediction.js';
import { deriveStatus } from '../src/status/statusEngine.js';
import { freshnessScore } from '../src/scoring/scores.js';
import type { Opportunity } from '../src/domain/types.js';

type OppOverrides = Partial<Omit<Opportunity, 'fields'>> & { fields?: Partial<Opportunity['fields']> };

function makeOpp(overrides: OppOverrides = {}): Opportunity {
  const { fields: fieldOverrides, ...rest } = overrides;
  return {
    id: 'opp_1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'discovered',
    fields: {
      title: 'Test Call',
      type: 'open-call',
      genres: [],
      deadline: { kind: 'unknown' },
      fee: { disclosed: false },
      eligibility: [],
      requiredMaterials: [],
      contactEmailPresent: false,
      ...fieldOverrides,
    },
    sourceId: 'src_1',
    sourceUrl: 'https://example.org/call',
    alternateSourceIds: [],
    scores: { freshness: 100, confidence: 80, trust: 50 },
    trustSignals: [],
    lastCheckedAt: '2026-01-01T00:00:00.000Z',
    lastChangedAt: '2026-01-01T00:00:00.000Z',
    lastExtractionConfidence: 80,
    lastOpenSignal: true,
    lastClosedSignal: false,
    lastSuspiciousSignals: [],
    pastCycles: [],
    conflicts: [],
    ...rest,
  };
}

test('title similarity ignores year and word order', () => {
  assert.equal(normalizeName('The 2025 Annual Poetry Prize'), normalizeName('Annual Poetry Prize 2026'));
  assert.ok(titleSimilarity('Annual Poetry Prize 2025', 'The Annual Poetry Prize') >= 0.8);
  assert.ok(titleSimilarity('Annual Poetry Prize', 'Documentary Film Fund') < 0.3);
});

test('prediction: stable annual pattern → high-confidence window', () => {
  const pred = predictNextOpening(
    [{ openedOn: '2024-01-08' }, { openedOn: '2025-01-04' }, { openedOn: '2026-01-06' }],
    new Date('2026-06-01T00:00:00Z'),
  );
  assert.ok(pred);
  assert.equal(pred.confidence, 'high');
  assert.equal(pred.basedOnCycles, 3);
  assert.ok(pred.expectedOpenStart.startsWith('2026-12') || pred.expectedOpenStart.startsWith('2027-01'));
});

test('prediction: December↔January cycles average across the year boundary', () => {
  const pred = predictNextOpening(
    [{ openedOn: '2024-12-28' }, { openedOn: '2026-01-03' }],
    new Date('2026-06-01T00:00:00Z'),
  );
  assert.ok(pred, 'wrap-around cycle should still predict');
  assert.ok(pred.expectedOpenStart >= '2026-12-01' && pred.expectedOpenEnd <= '2027-01-31');
});

test('prediction: erratic history predicts nothing', () => {
  assert.equal(
    predictNextOpening([{ openedOn: '2024-02-01' }, { openedOn: '2025-08-15' }], new Date('2026-01-01T00:00:00Z')),
    undefined,
  );
  assert.equal(predictNextOpening([{ openedOn: '2025-01-01' }], new Date('2026-01-01T00:00:00Z')), undefined);
});

const NOW = new Date('2026-01-05T00:00:00Z');
const ctx = { now: NOW, closedSignalPresent: false, openSignalPresent: true };

test('status derivation follows the strategy state machine', () => {
  // Open with a far deadline.
  assert.equal(deriveStatus(makeOpp({ fields: { deadline: { kind: 'exact', date: '2026-06-01' } } }), ctx), 'open');
  // Closing soon within 14 days.
  assert.equal(deriveStatus(makeOpp({ fields: { deadline: { kind: 'exact', date: '2026-01-12' } } }), ctx), 'closing-soon');
  // Past deadline → closed.
  assert.equal(deriveStatus(makeOpp({ fields: { deadline: { kind: 'exact', date: '2025-12-01' } } }), ctx), 'closed');
  // Explicit closed signal wins even with a future deadline.
  assert.equal(
    deriveStatus(makeOpp({ fields: { deadline: { kind: 'exact', date: '2026-06-01' } } }), { ...ctx, closedSignalPresent: true }),
    'closed',
  );
  // Opening soon from a future open date.
  assert.equal(
    deriveStatus(makeOpp({ fields: { openDate: '2026-01-20', deadline: { kind: 'unknown' } } }), { ...ctx, openSignalPresent: false }),
    'opening-soon',
  );
  // Rolling deadline stays open.
  assert.equal(deriveStatus(makeOpp({ fields: { deadline: { kind: 'rolling' } } }), ctx), 'open');
  // Conflicts force needs-verification.
  assert.equal(deriveStatus(makeOpp({ conflicts: ['deadline mismatch'] }), ctx), 'needs-verification');
  // Low confidence forces needs-verification.
  assert.equal(
    deriveStatus(makeOpp({ scores: { freshness: 100, confidence: 20, trust: 50 } }), ctx),
    'needs-verification',
  );
  // Duplicates stay duplicates.
  assert.equal(deriveStatus(makeOpp({ duplicateOfId: 'opp_0' }), ctx), 'duplicate');
});

test('recent deadline extension badges the status', () => {
  const opp = makeOpp({ fields: { deadline: { kind: 'exact', date: '2026-03-15' } } });
  assert.equal(
    deriveStatus(opp, { ...ctx, lastDeadlineExtensionAt: '2026-01-03T00:00:00.000Z' }),
    'deadline-extended',
  );
  // Two weeks later the badge decays back to date-derived status.
  assert.equal(
    deriveStatus(opp, { ...ctx, now: new Date('2026-01-20T00:00:00Z'), lastDeadlineExtensionAt: '2026-01-03T00:00:00.000Z' }),
    'open',
  );
});

test('stale unclaimed listings become uncertain; claimed listings decay slower', () => {
  const stale = makeOpp({ lastCheckedAt: '2025-11-01T00:00:00.000Z', fields: { deadline: { kind: 'exact', date: '2026-06-01' } } });
  assert.ok(freshnessScore(stale, NOW) < 30);
  stale.scores.freshness = freshnessScore(stale, NOW);
  assert.equal(deriveStatus(stale, ctx), 'uncertain');

  const claimed = makeOpp({
    lastCheckedAt: '2025-11-01T00:00:00.000Z',
    claimedByOrganizationId: 'org_1',
    fields: { deadline: { kind: 'exact', date: '2026-06-01' } },
  });
  assert.ok(freshnessScore(claimed, NOW) > freshnessScore(stale, NOW));
  claimed.scores.freshness = freshnessScore(claimed, NOW);
  assert.equal(deriveStatus(claimed, ctx), 'open');
});
