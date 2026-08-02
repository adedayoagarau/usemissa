import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  commitTrackerImport,
  createStore,
  detectTrackerImportMapping,
  FixtureFetcher,
  normalizeImportedDate,
  normalizeImportedStatus,
  parseTrackerCsv,
  planTrackerImport,
  RadarEngine,
  sequentialIds,
  type Opportunity,
} from '../src/index.js';

function opportunity(id: string, title: string, organizationName: string): Opportunity {
  return {
    id, createdAt: '2026-01-01T00:00:00.000Z', status: 'open',
    fields: { title, organizationName, type: 'magazine', genres: ['poetry'], deadline: { kind: 'exact', date: '2026-12-01' }, fee: { disclosed: true, amountCents: 0 }, eligibility: [], requiredMaterials: [], contactEmailPresent: false },
    sourceId: 'source', sourceUrl: `https://example.test/${id}`, alternateSourceIds: [], scores: { freshness: 100, confidence: 100, trust: 100 }, trustSignals: [], lastCheckedAt: '2026-01-01T00:00:00.000Z', lastChangedAt: '2026-01-01T00:00:00.000Z', lastExtractionConfidence: 100, lastOpenSignal: true, lastClosedSignal: false, lastSuspiciousSignals: [], pastCycles: [], conflicts: [],
  };
}

test('CSV parser handles BOM, RFC quoting, Unicode, formula warnings, and malformed quotes', () => {
  const parsed = parseTrackerCsv('\ufeffTitle,Organization,Status,Notes\r\n"A, call","Org","submitted","line 1\nline 2"\r\n=SUM(A1),Org,saved,ok');
  assert.deepEqual(parsed.columns, ['Title', 'Organization', 'Status', 'Notes']);
  assert.equal(parsed.rows[0].cells[0], 'A, call');
  assert.equal(parsed.rows[0].cells[3], 'line 1\nline 2');
  assert.equal(parsed.rows[1].warnings[0]?.warning, 'formulaLike');
  assert.throws(() => parseTrackerCsv('Title,Organization\n"unclosed,Org'), /Unclosed quote/);
  assert.throws(() => parseTrackerCsv(new Uint8Array([0xff, 0xfe])), /UTF-8/);
});

test('status/date normalization is conservative', () => {
  assert.equal(normalizeImportedStatus('In Review'), 'in-review');
  assert.equal(normalizeImportedStatus('not accepted'), 'declined');
  assert.equal(normalizeImportedStatus('mystery'), undefined);
  assert.deepEqual(normalizeImportedDate('2026-08-01'), { date: '2026-08-01' });
  assert.deepEqual(normalizeImportedDate('01/02/2026'), { ambiguous: true });
  assert.deepEqual(normalizeImportedDate('13/02/2026'), { date: '2026-02-13' });
});

test('planner classifies matches, unmatched rows, duplicate rows, and unknown status without touching opportunities', () => {
  const store = createStore();
  const engine = new RadarEngine({ store, fetcher: new FixtureFetcher() });
  engine.addUser({ id: 'user_import', displayName: 'Importer', genres: [], attributes: {} });
  const canonical = opportunity('opp_1', 'North River Review', 'North River');
  store.opportunities.set(canonical.id, canonical);
  const parsed = parseTrackerCsv('Title,Organization,Status,Deadline\nNorth River Review,North River,Submitted,2026-08-01\nUnknown,Elsewhere,Saved,\nUnknown,Elsewhere,Saved,\nBroken,Elsewhere,???,' );
  const mapping = detectTrackerImportMapping(parsed.columns);
  const plan = planTrackerImport(store, 'user_import', parsed, mapping);
  assert.equal(plan.rows[0].classification, 'matched');
  assert.equal(plan.rows[1].classification, 'unmatched');
  assert.equal(plan.rows[2].classification, 'duplicate-in-file');
  assert.equal(plan.rows[3].classification, 'invalid');
  assert.equal(plan.rows[0].candidates[0]?.confidence, 'high');
  assert.equal(canonical.fields.title, 'North River Review');
});

test('commit creates private manual entries and tracker rows without mutating canonical opportunities', () => {
  const store = createStore();
  const engine = new RadarEngine({ store, fetcher: new FixtureFetcher() });
  engine.addUser({ id: 'user_import', displayName: 'Importer', genres: [], attributes: {} });
  const canonical = opportunity('opp_1', 'North River Review', 'North River');
  store.opportunities.set(canonical.id, canonical);
  const parsed = parseTrackerCsv('Title,Organization,Status,Notes\nNorth River Review,North River,Submitted,Sent last week\nAn Unknown Call,Elsewhere,Saved,Private note');
  const plan = planTrackerImport(store, 'user_import', parsed, detectTrackerImportMapping(parsed.columns));
  const result = commitTrackerImport(store, sequentialIds(['opp_1']), 'user_import', plan, { '3': 'create-manual' }, new Date('2026-08-02T00:00:00.000Z'), 'hash');
  assert.equal(result.imported, 2);
  assert.equal(store.tracked[0]?.opportunityId, 'opp_1');
  assert.equal(store.tracked[0]?.myStatus, 'submitted');
  assert.equal(store.manualTrackerEntries[0]?.title, 'An Unknown Call');
  assert.equal(store.manualTrackerEntries[0]?.notes, 'Private note');
  assert.equal(canonical.fields.title, 'North River Review');
  assert.equal(canonical.status, 'open');
});

test('formula-like cells require an explicit resolution before commit', () => {
  const store = createStore();
  const engine = new RadarEngine({ store, fetcher: new FixtureFetcher() });
  engine.addUser({ id: 'user_formula', displayName: 'Formula User', genres: [], attributes: {} });
  store.opportunities.set('opp_formula', opportunity('opp_formula', 'Formula Call', 'Formula Org'));
  const parsed = parseTrackerCsv('Title,Organization,Status,Notes\nFormula Call,Formula Org,Saved,=SUM(A1)');
  const plan = planTrackerImport(store, 'user_formula', parsed, detectTrackerImportMapping(parsed.columns));
  const unresolved = commitTrackerImport(store, sequentialIds(['opp_formula']), 'user_formula', plan, { '2': 'match' }, new Date('2026-08-02T00:00:00.000Z'), 'formula');
  assert.equal(unresolved.needsReview, 1);
  assert.equal(store.tracked.length, 0);
  const resolved = commitTrackerImport(store, sequentialIds(['opp_formula']), 'user_formula', plan, { '2': 'keep-current' }, new Date('2026-08-02T00:00:00.000Z'), 'formula');
  assert.equal(resolved.needsReview, 0);
  assert.equal(store.tracked.length, 1);
});

test('commit requires an explicit resolution for formula-like values', () => {
  const store = createStore();
  const engine = new RadarEngine({ store, fetcher: new FixtureFetcher() });
  engine.addUser({ id: 'user_formula', displayName: 'Formula User', genres: [], attributes: {} });
  const canonical = opportunity('opp_formula', 'Formula Call', 'Formula Org');
  store.opportunities.set(canonical.id, canonical);
  const parsed = parseTrackerCsv('Title,Organization,Status,Notes\nFormula Call,Formula Org,Saved,=SUM(A1)');
  const plan = planTrackerImport(store, 'user_formula', parsed, detectTrackerImportMapping(parsed.columns));
  const blocked = commitTrackerImport(store, sequentialIds(['opp_formula']), 'user_formula', plan, { '2': 'match' }, new Date('2026-08-02T00:00:00.000Z'));
  assert.equal(blocked.imported, 0);
  assert.equal(blocked.needsReview, 1);
  const accepted = commitTrackerImport(store, sequentialIds(['opp_formula']), 'user_formula', plan, { '2': { action: 'use-imported', opportunityId: 'opp_formula' } }, new Date('2026-08-02T00:00:00.000Z'));
  assert.equal(accepted.imported, 1);
});
