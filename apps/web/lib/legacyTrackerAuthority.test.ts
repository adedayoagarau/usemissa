import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routes = [
  '../app/api/users/[id]/track/route.ts',
  '../app/api/users/[id]/tracker/route.ts',
  '../app/api/users/[id]/status/route.ts',
  '../app/api/users/[id]/tracker/[opportunityId]/work/route.ts',
];

test('legacy user-scoped Tracker routes fail closed under relational authority', () => {
  for (const route of routes) {
    const source = readFileSync(new URL(route, import.meta.url), 'utf8');
    const authority = source.indexOf('creatorRelationalAuthorityEnabled(process.env)');
    const engine = source.indexOf('await getEngine()');
    assert.notEqual(authority, -1, `${route} lacks the authority guard`);
    assert.notEqual(engine, -1, `${route} lacks its rollback-only implementation`);
    assert.ok(authority < engine, `${route} loads compatibility state before the authority guard`);
    assert.match(source, /status:\s*410/);
  }
});
