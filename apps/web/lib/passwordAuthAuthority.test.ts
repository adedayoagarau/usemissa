import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('password signup and login select relational account authority before compatibility engine access', () => {
  for (const route of ['../app/api/auth/signup/route.ts', '../app/api/auth/login/route.ts']) {
    const source = readFileSync(new URL(route, import.meta.url), 'utf8');
    assert.match(source, /getCreatorAccountRepository\(\)/);
    assert.match(source, /repository\.(provisionPasswordAccount|authenticatePassword)/);
    assert.ok(source.indexOf('getCreatorAccountRepository()') < source.indexOf('getEngine()'));
  }
});
