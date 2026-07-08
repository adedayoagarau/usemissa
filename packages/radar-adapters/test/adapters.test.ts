import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, QueryResult } from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import { ManualClock, createStore, type Source } from '@missa/radar-engine';
import { parseDisallowForUserAgent } from '../src/playwrightFetcher.js';
import { LlmExtractor } from '../src/llmExtractor.js';
import { loadStoreFromPostgres, saveStoreToPostgres } from '../src/postgresStore.js';

test('robots.txt parser: picks the specific user-agent group over the wildcard', () => {
  const robots = `
User-agent: *
Disallow: /private

User-agent: MissaRadar
Disallow: /no-crawl
Disallow: /also-blocked
`;
  assert.deepEqual(parseDisallowForUserAgent(robots, 'MissaRadar/0.1'), ['/no-crawl', '/also-blocked']);
});

test('robots.txt parser: falls back to the wildcard group when no specific match', () => {
  const robots = `User-agent: *\nDisallow: /admin\n`;
  assert.deepEqual(parseDisallowForUserAgent(robots, 'MissaRadar/0.1'), ['/admin']);
});

test('robots.txt parser: no rules means nothing disallowed', () => {
  assert.deepEqual(parseDisallowForUserAgent('', 'MissaRadar/0.1'), []);
});

function fakeAnthropicClient(toolInput: Record<string, unknown>): Anthropic {
  return {
    messages: {
      create: async () => ({
        content: [{ type: 'tool_use', id: 'toolu_1', name: 'record_opportunity_fields', input: toolInput }],
      }),
    },
  } as unknown as Anthropic;
}

test('LlmExtractor: maps model output into a validated OpportunityCandidate', async () => {
  const clock = new ManualClock(new Date('2026-07-07T00:00:00Z'));
  const client = fakeAnthropicClient({
    title: 'Lantern City Film Festival',
    organizationName: 'Lantern City Film Festival',
    type: 'festival',
    genres: ['documentary'],
    deadlineDate: '2026-09-30',
    feeDisclosed: true,
    feeAmountCents: 4000,
    eligibility: [],
    requiredMaterials: ['work sample'],
    submissionUrl: 'https://lanterncityfest.com/apply',
    contactEmailPresent: true,
  });
  const extractor = new LlmExtractor(clock, { client, apiKey: 'unused' });
  const source: Source = {
    id: 'src_1', name: 'Lantern City Film Festival', url: 'https://lanterncityfest.com/entries',
    kind: 'organization-website', checkIntervalHours: 24, active: true, consecutiveFailures: 0,
  };
  const candidate = await extractor.extract(source, {
    id: 'snap_1', sourceId: 'src_1', url: source.url, fetchedAt: clock.now().toISOString(),
    status: 'ok', contentHash: 'h', content: 'Call for entries: documentary and short film. Submissions close September 30, 2026.',
  });

  assert.equal(candidate.title, 'Lantern City Film Festival');
  assert.equal(candidate.type, 'festival');
  assert.equal(candidate.deadline.kind, 'exact');
  assert.equal(candidate.deadline.date, '2026-09-30');
  assert.equal(candidate.fee.amountCents, 4000);
  assert.ok(candidate.extractionConfidence > 0, 'validateCandidate should have scored it');
  assert.deepEqual(candidate.issues, []);
});

test('LlmExtractor: an implausible model-supplied deadline is discarded by the shared validator', async () => {
  const clock = new ManualClock(new Date('2026-07-07T00:00:00Z'));
  const client = fakeAnthropicClient({
    title: 'Some Call', type: 'open-call', genres: [], eligibility: [], requiredMaterials: [],
    contactEmailPresent: false, deadlineDate: '1999-01-01',
  });
  const extractor = new LlmExtractor(clock, { client, apiKey: 'unused' });
  const source: Source = {
    id: 'src_2', name: 'Some Call', url: 'https://example.com/call',
    kind: 'directory', checkIntervalHours: 24, active: true, consecutiveFailures: 0,
  };
  const candidate = await extractor.extract(source, {
    id: 'snap_2', sourceId: 'src_2', url: source.url, fetchedAt: clock.now().toISOString(),
    status: 'ok', contentHash: 'h', content: 'irrelevant',
  });
  assert.equal(candidate.deadline.date, undefined);
});

function fakePool(): { pool: Pool; tables: Map<string, unknown[]> } {
  const tables = new Map<string, unknown[]>();
  const pool = {
    connect: async () => ({
      query: async (sql: string, params?: unknown[]) => fakeQuery(tables, sql, params),
      release: () => {},
    }),
    query: async (sql: string, params?: unknown[]) => fakeQuery(tables, sql, params),
  } as unknown as Pool;
  return { pool, tables };
}

async function fakeQuery(tables: Map<string, unknown[]>, sql: string, params?: unknown[]): Promise<QueryResult> {
  const norm = sql.trim().toLowerCase();
  const rows: unknown[] = [];
  if (norm.startsWith('delete from')) {
    const table = norm.split(' ')[2];
    tables.set(table, []);
  } else if (norm.startsWith('insert into')) {
    const table = norm.split(' ')[2];
    const list = tables.get(table) ?? [];
    // Our inserts always put the JSON payload (or, for emitted_alert_keys, the raw key) last.
    const value = params![params!.length - 1];
    list.push({ data: value, key: value });
    tables.set(table, list);
  } else if (norm.startsWith('select data from') || norm.startsWith('select key from')) {
    const table = norm.split(' ')[3];
    rows.push(...(tables.get(table) ?? []));
  }
  return { rows, rowCount: rows.length } as QueryResult;
}

test('postgresStore: save then load round-trips a RadarStore', async () => {
  const { pool } = fakePool();
  const store = createStore();
  store.organizations.set('org_1', { id: 'org_1', name: 'Test Org', domains: ['test.org'], verified: true });
  store.users.set('user_1', { id: 'user_1', displayName: 'Ada', genres: ['poetry'], attributes: {} });
  store.emittedAlertKeys.add('closing-soon:user_1:opp_1');
  store.accounts.set('acct_1', {
    id: 'acct_1', email: 'ada@example.com', passwordHash: 'salt:hash', userId: 'user_1', isAdmin: false,
    createdAt: '2026-07-07T00:00:00.000Z',
  });
  store.memberships.push({ accountId: 'acct_1', organizationId: 'org_1', role: 'admin', grantedAt: '2026-07-07T00:00:00.000Z' });
  store.auditLog.push({
    id: 'audit_1', at: '2026-07-07T00:00:00.000Z', accountId: 'acct_1',
    action: 'claim.approve', targetType: 'claim', targetId: 'claim_1',
  });
  store.pieces.set('piece_1', { id: 'piece_1', userId: 'user_1', title: 'Five Poems', genre: 'poetry', createdAt: '2026-07-07T00:00:00.000Z' });

  await saveStoreToPostgres(store, pool);
  const loaded = await loadStoreFromPostgres(pool);

  assert.deepEqual(loaded.organizations.get('org_1'), store.organizations.get('org_1'));
  assert.deepEqual(loaded.users.get('user_1'), store.users.get('user_1'));
  assert.ok(loaded.emittedAlertKeys.has('closing-soon:user_1:opp_1'));
  assert.deepEqual(loaded.accounts.get('acct_1'), store.accounts.get('acct_1'));
  assert.deepEqual(loaded.memberships, store.memberships);
  assert.deepEqual(loaded.auditLog, store.auditLog);
  assert.deepEqual(loaded.pieces.get('piece_1'), store.pieces.get('piece_1'));
});
