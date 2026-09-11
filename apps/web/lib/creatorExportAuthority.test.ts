import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/api/me/export/route.ts', import.meta.url), 'utf8');

test('relational creator export does not initialize or persist the compatibility engine', () => {
  assert.match(source, /if \(repository\) \{[\s\S]*repository\.trackerExport[\s\S]*repository\.library/);
  assert.match(source, /repository\.recordExportAudit/);
  assert.doesNotMatch(source, /const engine = await getEngine\(\);/);
});
