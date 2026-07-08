import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSourcesCsv, importSources } from '../src/import/csvImporter.js';
import type { Source } from '../src/domain/types.js';

test('parseSourcesCsv: parses valid rows, quoted fields, and reports per-row errors without throwing', () => {
  const csv = [
    'name,url,kind,organizationName,checkIntervalHours',
    '"North River Review, Poetry",https://northriverreview.org/submit,organization-website,North River Review,12',
    'Bad Row,not-a-url,directory,,',
    'Missing Kind,https://example.org,not-a-real-kind,,',
    'Golden Quill,https://goldenquill.example/contest,directory,,',
  ].join('\n');

  const preview = parseSourcesCsv(csv);
  assert.equal(preview.totalRows, 4);
  assert.equal(preview.rows.length, 2);
  assert.equal(preview.errors.length, 2);
  assert.equal(preview.rows[0].name, 'North River Review, Poetry');
  assert.equal(preview.rows[0].checkIntervalHours, 12);
  assert.match(preview.errors[0].message, /invalid url/i);
  assert.match(preview.errors[1].message, /Invalid kind/);
});

test('parseSourcesCsv: rejects a CSV missing required headers instead of guessing', () => {
  const preview = parseSourcesCsv('foo,bar\n1,2');
  assert.equal(preview.rows.length, 0);
  assert.equal(preview.errors.length, 1);
  assert.match(preview.errors[0].message, /Header must include/);
});

test('parseSourcesCsv: empty input produces an empty, error-free preview', () => {
  const preview = parseSourcesCsv('');
  assert.deepEqual(preview, { rows: [], errors: [], totalRows: 0 });
});

test('importSources: skips URLs already tracked (idempotent re-import) and resolves organizationName to an id', () => {
  const created: Source[] = [];
  let nextId = 1;
  const addSource = (input: Parameters<Parameters<typeof importSources>[1]>[0]): Source => {
    const source: Source = {
      id: `src_${nextId++}`,
      name: input.name,
      url: input.url,
      kind: input.kind,
      organizationId: input.organizationId,
      checkIntervalHours: input.checkIntervalHours ?? 24,
      active: true,
      consecutiveFailures: 0,
    };
    created.push(source);
    return source;
  };

  const preview = parseSourcesCsv(
    ['name,url,kind,organizationName', 'A,https://a.example,directory,Acme', 'B,https://b.example,directory,'].join('\n'),
  );
  const existingUrls = new Set(['https://b.example']); // already tracked -> should be skipped
  const report = importSources(existingUrls, addSource, preview.rows, (name) => (name === 'Acme' ? 'org_acme' : undefined));

  assert.equal(report.totalAttempted, 2);
  assert.equal(report.created.length, 1);
  assert.equal(report.created[0].organizationId, 'org_acme');
  assert.equal(report.duplicates.length, 1);
  assert.equal(report.duplicates[0].url, 'https://b.example');
});
