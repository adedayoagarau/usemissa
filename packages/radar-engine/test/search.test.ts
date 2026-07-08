import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchOpportunities } from '../src/index.js';
import type { Opportunity } from '../src/domain/types.js';

type OppOverrides = Partial<Omit<Opportunity, 'fields'>> & { fields?: Partial<Opportunity['fields']> };

function makeOpp(overrides: OppOverrides = {}): Opportunity {
  const { fields: fieldOverrides, ...rest } = overrides;
  return {
    id: 'opp_1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'open',
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

test('searchOpportunities: ranks title matches above organization-only matches', () => {
  const poetryOpp = makeOpp({
    id: 'opp_poetry',
    fields: { title: 'Northern Poetry Prize', organizationName: 'North River Review', genres: ['poetry'] },
  });
  const orgOnlyOpp = makeOpp({
    id: 'opp_fiction',
    fields: { title: 'Flash Fiction Contest', organizationName: 'Northern Lights Press', genres: ['fiction'] },
  });
  const unrelatedOpp = makeOpp({ id: 'opp_other', fields: { title: 'Essay Award', organizationName: 'Some Org' } });

  const results = searchOpportunities([poetryOpp, orgOnlyOpp, unrelatedOpp], 'northern');
  assert.equal(results.length, 2);
  assert.equal(results[0].opportunity.id, 'opp_poetry');
  assert.ok(results[0].score > results[1].score);
  assert.deepEqual(results.map((r) => r.opportunity.id).sort(), ['opp_fiction', 'opp_poetry'].sort());
});

test('searchOpportunities: matches on genre and eligibility text, not just title', () => {
  const opp = makeOpp({
    id: 'opp_genre',
    fields: { title: 'Untitled Call', genres: ['speculative-fiction'], eligibility: [{ key: 'residency', value: 'Canada', description: 'Open to Canadian residents' }] },
  });
  const other = makeOpp({ id: 'opp_other', fields: { title: 'Unrelated' } });

  assert.equal(searchOpportunities([opp, other], 'speculative').length, 1);
  assert.equal(searchOpportunities([opp, other], 'canada')[0].opportunity.id, 'opp_genre');
});

test('searchOpportunities: applies type/genre/verifiedOnly filters before ranking', () => {
  const verified = makeOpp({ id: 'opp_v', claimedByOrganizationId: 'org_1', fields: { title: 'Grant Call', type: 'grant', genres: ['fiction'] } });
  const unverifiedLowTrust = makeOpp({ id: 'opp_u', fields: { title: 'Grant Call', type: 'grant', genres: ['fiction'] }, scores: { freshness: 100, confidence: 80, trust: 10 } });

  const filtered = searchOpportunities([verified, unverifiedLowTrust], 'grant', { verifiedOnly: true });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].opportunity.id, 'opp_v');

  const byType = searchOpportunities([verified, unverifiedLowTrust], 'grant', { types: ['open-call'] });
  assert.equal(byType.length, 0);
});

test('searchOpportunities: an empty query returns all filtered opportunities, unranked', () => {
  const a = makeOpp({ id: 'opp_a' });
  const b = makeOpp({ id: 'opp_b' });
  const results = searchOpportunities([a, b], '');
  assert.equal(results.length, 2);
  assert.ok(results.every((r) => r.score === 0));
});
