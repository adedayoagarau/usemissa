import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createStore,
  detectTrackerImportMapping,
  parseTrackerCsv,
  planTrackerImport,
  type ImportRowDecision,
} from '@missa/radar-engine';
import { postgresSchema } from '../src/postgresSchema.js';
import {
  trackerImportCandidateHash,
  trackerImportRequestHash,
  trackerImportStateHash,
} from '../src/trackerImportPersistence.js';

test('tracker import persistence schema carries receipts, a unique replay key, and rate events', () => {
  assert.match(postgresSchema, /create table if not exists tracker_import_receipts/i);
  assert.match(postgresSchema, /tracker_import_receipts_account_key_idx/i);
  assert.match(postgresSchema, /create table if not exists tracker_import_rate_events/i);
  assert.match(postgresSchema, /tracker_import_rate_events_scope_idx/i);
});

test('tracker and request fingerprints are stable but change with consequential state', () => {
  const store = createStore();
  const initial = trackerImportStateHash(store, 'user_1');
  store.manualTrackerEntries.push({ id: 'manual_1', userId: 'user_1', title: 'Call', organizationName: 'Org', myStatus: 'saved', sourceKind: 'csv', sourceRow: 2, importedAt: '2026-08-08T00:00:00.000Z' });
  assert.notEqual(trackerImportStateHash(store, 'user_1'), initial);
  assert.equal(trackerImportStateHash(store, 'other_user'), initial);

  const parsed = parseTrackerCsv('Title,Organization,Status\nCall,Org,Saved');
  const mapping = detectTrackerImportMapping(parsed.columns);
  const decisions: Record<string, ImportRowDecision> = { '2': 'create-manual' };
  const left = trackerImportRequestHash({ sourceHash: 'source', mapping, decisions });
  const right = trackerImportRequestHash({ decisions, mapping, sourceHash: 'source' });
  assert.equal(left, right);
  assert.notEqual(left, trackerImportRequestHash({ sourceHash: 'changed', mapping, decisions }));
  assert.equal(trackerImportCandidateHash(planTrackerImport(createStore(), 'user_1', parsed, mapping).candidateSet), trackerImportCandidateHash([]));
});
