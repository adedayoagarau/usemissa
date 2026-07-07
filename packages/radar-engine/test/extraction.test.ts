import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, isPlausibleOpportunityDate } from '../src/extraction/dates.js';
import { extractFee } from '../src/extraction/fees.js';
import { findSignals, OPENING_SIGNALS, CLOSED_SIGNALS, SUSPICIOUS_SIGNALS } from '../src/extraction/signals.js';
import { DeterministicExtractor } from '../src/extraction/extractor.js';
import type { PageSnapshot, Source } from '../src/domain/types.js';

const REF = new Date('2026-01-05T00:00:00Z');

test('parseDate handles common formats', () => {
  assert.deepEqual(parseDate('Deadline: March 1, 2026', REF), { date: '2026-03-01', yearInferred: false });
  assert.deepEqual(parseDate('due 15 September 2026', REF), { date: '2026-09-15', yearInferred: false });
  assert.deepEqual(parseDate('closes 2026-04-10', REF), { date: '2026-04-10', yearInferred: false });
  assert.deepEqual(parseDate('Sept 3rd, 2026', REF), { date: '2026-09-03', yearInferred: false });
});

test('parseDate infers a future year when missing', () => {
  // "March 1" from Jan 2026 → March 2026; "January 2" from Jan 5 → next year.
  assert.deepEqual(parseDate('Deadline: March 1', REF), { date: '2026-03-01', yearInferred: true });
  assert.deepEqual(parseDate('Deadline: January 2', REF), { date: '2027-01-02', yearInferred: true });
});

test('parseDate rejects impossible calendar dates', () => {
  assert.equal(parseDate('February 30, 2026', REF), undefined);
  assert.equal(parseDate('nothing datelike here', REF), undefined);
});

test('date plausibility window', () => {
  assert.equal(isPlausibleOpportunityDate('2026-06-01', REF), true);
  assert.equal(isPlausibleOpportunityDate('2035-01-01', REF), false);
  assert.equal(isPlausibleOpportunityDate('2019-01-01', REF), false);
});

test('extractFee: labeled fees, free calls, and non-fee dollar amounts', () => {
  assert.deepEqual(extractFee('Entry fee: $15').amountCents, 1500);
  assert.equal(extractFee('No entry fee for this contest').amountCents, 0);
  assert.equal(extractFee('No application fee').amountCents, 0);
  // A prize amount is not a fee.
  assert.equal(extractFee('Win a $50,000 prize!').disclosed, false);
});

test('signal detection matches strategy phrase lists', () => {
  assert.deepEqual(findSignals('We are now accepting poetry. Call for entries!', OPENING_SIGNALS), [
    'now accepting',
    'call for entries',
  ]);
  assert.ok(findSignals('Submissions are closed for the season.', CLOSED_SIGNALS).length > 0);
  assert.ok(findSignals('pay a processing fee to receive your prize', SUSPICIOUS_SIGNALS).length > 0);
});

function snap(content: string): PageSnapshot {
  return { id: 'snap_test', sourceId: 'src_test', url: 'https://example.org/call', fetchedAt: REF.toISOString(), status: 'ok', contentHash: 'x', content };
}

const SOURCE: Source = {
  id: 'src_test',
  name: 'Example Review',
  url: 'https://example.org/call',
  kind: 'organization-website',
  checkIntervalHours: 24,
  active: true,
  consecutiveFailures: 0,
};

test('deterministic extractor builds a validated candidate', () => {
  const extractor = new DeterministicExtractor({ now: () => REF });
  const c = extractor.extract(
    SOURCE,
    snap(`Example Review — Call for Submissions
Published by: Example Review
Now accepting poetry and flash fiction. Include a bio.
Deadline: March 1, 2026. Entry fee: $10. Simultaneous submissions are not accepted.
Submit at: https://example.org/submit
editors@example.org`),
  );
  assert.equal(c.title, 'Example Review — Call for Submissions');
  assert.equal(c.organizationName, 'Example Review');
  assert.equal(c.type, 'magazine');
  assert.ok(c.genres.includes('poetry') && c.genres.includes('flash fiction'));
  assert.deepEqual(c.deadline, { kind: 'exact', date: '2026-03-01', raw: 'Deadline: March 1, 2026' });
  assert.equal(c.fee.amountCents, 1000);
  assert.equal(c.submissionUrl, 'https://example.org/submit');
  assert.equal(c.contactEmailPresent, true);
  assert.equal(c.simultaneousAllowed, false);
  assert.ok(c.requiredMaterials.includes('bio'));
  assert.ok(c.extractionConfidence >= 80, `confidence was ${c.extractionConfidence}`);
});

test('extractor flags rolling deadlines and suspicious language', () => {
  const extractor = new DeterministicExtractor({ now: () => REF });
  const c = extractor.extract(
    SOURCE,
    snap('Rolling submissions accepted year-round. Winners pay a processing fee to receive the prize by wire transfer.'),
  );
  assert.equal(c.deadline.kind, 'rolling');
  assert.ok(c.suspiciousSignals.length >= 2);
  assert.ok(c.issues.some((i) => i.includes('suspicious language')));
});

test('implausible deadline is discarded by validation', () => {
  const extractor = new DeterministicExtractor({ now: () => REF });
  const c = extractor.extract(SOURCE, snap('Call for entries. Deadline: 2035-01-01.'));
  assert.equal(c.deadline.kind, 'unknown');
  assert.ok(c.issues.some((i) => i.includes('implausible deadline')));
});
