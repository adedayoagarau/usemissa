import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, encodeTrackerCsv } from './tracker-export';
import type { TrackerExportV1 } from '@missa/radar-engine';

test('tracker CSV encoder preserves CSV syntax and neutralizes spreadsheet formulas', () => {
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell('A, "quoted"\nline'), '"A, ""quoted""\nline"');
  const data: TrackerExportV1 = {
    exportVersion: 1,
    generatedAt: '2026-08-02T00:00:00.000Z',
    included: ['tracker'],
    omitted: [],
    tracker: [{
      opportunityId: 'opp-1',
      title: 'Résumé, “open” call',
      myStatus: 'saved',
      trackedAt: '2026-08-01T00:00:00.000Z',
      dataState: 'available',
      statusEvents: [{ at: '2026-08-01T00:00:00.000Z', to: 'saved', source: 'user', note: 'Keep, this' }],
    }],
  };
  const csv = encodeTrackerCsv(data);
  assert.match(csv, /opportunity_id,title,organization_name/);
  assert.match(csv, /"Résumé, “open” call"/);
  assert.match(csv, /"\[{""at"":/);
  assert.match(csv, /\r\n$/);
});
