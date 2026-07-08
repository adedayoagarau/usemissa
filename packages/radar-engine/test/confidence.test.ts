import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confidenceTier, deadlineReminders, sequentialIds } from '../src/index.js';
import { createStore } from '../src/store/store.js';
import { ManualClock } from '../src/fixtures/seed.js';
import type { Opportunity, TrackedOpportunity } from '../src/domain/types.js';

type OppOverrides = Partial<Omit<Opportunity, 'fields'>> & { fields?: Partial<Opportunity['fields']> };

function makeOpp(overrides: OppOverrides = {}): Opportunity {
  const { fields: fieldOverrides, ...rest } = overrides;
  return {
    id: 'opp_1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'closing-soon',
    fields: {
      title: 'Test Call',
      type: 'open-call',
      genres: [],
      deadline: { kind: 'exact', date: '2026-01-10' },
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

test('confidenceTier: claimed listings are always verified regardless of extraction confidence', () => {
  const opp = makeOpp({ claimedByOrganizationId: 'org_1', scores: { freshness: 100, confidence: 10, trust: 50 } });
  assert.equal(confidenceTier(opp), 'verified');
});

test('confidenceTier: conflicting or low-confidence data is uncertain', () => {
  assert.equal(confidenceTier(makeOpp({ fields: { deadline: { kind: 'conflicting' } } })), 'uncertain');
  assert.equal(confidenceTier(makeOpp({ scores: { freshness: 100, confidence: 10, trust: 50 } })), 'uncertain');
});

test('confidenceTier: an exact date with high confidence is verified; anything else unclaimed is inferred', () => {
  assert.equal(confidenceTier(makeOpp({ fields: { deadline: { kind: 'exact', date: '2026-03-01' } }, scores: { freshness: 100, confidence: 90, trust: 50 } })), 'verified');
  assert.equal(confidenceTier(makeOpp({ fields: { deadline: { kind: 'inferred', date: '2026-03-01' } }, scores: { freshness: 100, confidence: 60, trust: 50 } })), 'inferred');
});

test('deadline reminders: the same-day hard alert is suppressed for uncertain-tier data, but earlier rungs still fire (softened)', () => {
  const store = createStore();
  const clock = new ManualClock(new Date('2026-01-10T09:00:00Z')); // deadline day
  const ids = sequentialIds();
  const ctx = { store, ids, clock };

  const uncertainOpp = makeOpp({ id: 'opp_uncertain', scores: { freshness: 100, confidence: 10, trust: 50 } });
  const trustedOpp = makeOpp({ id: 'opp_trusted', claimedByOrganizationId: 'org_1' });
  store.opportunities.set(uncertainOpp.id, uncertainOpp);
  store.opportunities.set(trustedOpp.id, trustedOpp);

  const tracked = (opportunityId: string): TrackedOpportunity => ({
    userId: 'user_1',
    opportunityId,
    trackedAt: '2026-01-01T00:00:00.000Z',
    notify: true,
    myStatus: 'saved',
    events: [],
  });
  store.tracked.push(tracked(uncertainOpp.id), tracked(trustedOpp.id));

  const dayZero = deadlineReminders(ctx);
  assert.equal(dayZero.filter((a) => a.opportunityId === 'opp_trusted').length, 1, 'trusted data still gets the same-day alert');
  assert.equal(dayZero.filter((a) => a.opportunityId === 'opp_uncertain').length, 0, 'uncertain data does not get a hard same-day alert');

  // Three days before the deadline, the uncertain one still fires, just softened.
  clock.advanceDays(-3);
  const earlier = deadlineReminders(ctx);
  const uncertainEarly = earlier.find((a) => a.opportunityId === 'opp_uncertain');
  assert.ok(uncertainEarly);
  assert.match(uncertainEarly!.title, /unconfirmed/);
  assert.match(uncertainEarly!.body, /low-confidence/);
});
