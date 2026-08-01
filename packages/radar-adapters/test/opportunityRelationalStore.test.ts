import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore, type Opportunity } from '@missa/radar-engine';
import { saveOpportunityProjectionToPostgres } from '../src/opportunityRelationalStore.js';

test('relational projection writes source evidence and public opportunity fields', async () => {
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  const client = {
    async query(text: string, values?: unknown[]) {
      queries.push({ text, values });
      return { rows: [] };
    },
  } as never;
  const store = createStore();
  const checkedAt = '2026-08-01T00:00:00.000Z';
  store.sources.set('source_1', {
    id: 'source_1',
    name: 'Example Journal',
    url: 'https://example.com/calls',
    kind: 'organization-website',
    checkIntervalHours: 24,
    active: true,
    lastCheckedAt: checkedAt,
    consecutiveFailures: 0,
  });
  const opportunity: Opportunity = {
    id: 'opp_1',
    createdAt: checkedAt,
    status: 'open',
    sourceId: 'source_1',
    sourceUrl: 'https://example.com/calls',
    alternateSourceIds: [],
    fields: {
      title: 'Example Poetry Call',
      organizationName: 'Example Journal',
      type: 'magazine',
      genres: ['poetry'],
      deadline: { kind: 'exact', date: '2026-09-01' },
      fee: { disclosed: false },
      eligibility: [],
      requiredMaterials: ['Manuscript'],
      submissionUrl: 'https://example.com/submit',
      contactEmailPresent: false,
    },
    scores: { freshness: 90, confidence: 90, trust: 90 },
    trustSignals: [],
    lastCheckedAt: checkedAt,
    lastChangedAt: checkedAt,
    lastExtractionConfidence: 90,
    lastOpenSignal: true,
    lastClosedSignal: false,
    lastSuspiciousSignals: [],
    pastCycles: [],
    conflicts: [],
  };
  store.opportunities.set(opportunity.id, opportunity);

  await saveOpportunityProjectionToPostgres(store, client);

  assert.ok(queries.some(({ text }) => text.includes('insert into opportunity_sources')));
  assert.ok(queries.some(({ text }) => text.includes('insert into opportunities')));
  assert.ok(queries.some(({ text }) => text.includes('insert into opportunity_source_evidence')));
  const opportunityInsert = queries.find(({ text }) => text.includes('insert into opportunities'));
  assert.equal(opportunityInsert?.values?.[23], 'available');
});
