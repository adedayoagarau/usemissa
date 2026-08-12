import assert from 'node:assert/strict';
import test from 'node:test';
import { DeterministicExtractor, HttpFetcher, isSafeTextPayload, machineEvidenceText, type Source } from '../src/index.js';

const source: Source = {
  id: 'source_fetcher',
  name: 'Example source',
  url: 'https://example.com/call',
  kind: 'organization-website',
  active: true,
  checkIntervalHours: 24,
  consecutiveFailures: 0,
  consecutiveProcessingFailures: 0,
};

test('rejects binary content types before decoding them as opportunity text', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('\u0000PNG', {
    status: 200,
    headers: { 'content-type': 'image/png' },
  });
  try {
    assert.deepEqual(await new HttpFetcher().fetch(source), { status: 'error', content: '', failureReason: 'unsupported-content-type' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects control characters even when a server mislabels binary content as text', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('Open call\u0000\u0001', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });
  try {
    assert.equal(isSafeTextPayload('Open call\n\tworks'), true);
    assert.equal(isSafeTextPayload('Open call\u0000works'), false);
    assert.deepEqual(await new HttpFetcher().fetch(source), { status: 'error', content: '', failureReason: 'unsafe-payload' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('prepends bounded official API evidence without replacing canonical page text', () => {
  const content = machineEvidenceText({
    ...source,
    discoveryExternalId: 'eu-ft:call-1',
    discoveryMachineRecord: {
      title: 'Cultural Horizons: Residencies',
      organizationName: 'Creative Europe',
      openDate: '2026-06-30',
      deadlineDate: '2026-09-30',
      applicationUrl: 'https://ec.europa.eu/call/1',
      evidenceUrl: 'https://api.tech.ec.europa.eu/search-api/',
    },
  }, 'Canonical host page text');
  assert.match(content, /^Title: Cultural Horizons: Residencies/m);
  assert.match(content, /Deadline: 2026-09-30/);
  assert.match(content, /Canonical host page text$/);
});

test('official API evidence remains valid when an organization name contains periods', () => {
  const evidenceSource: Source = {
    ...source,
    name: 'Reel American',
    discoveryMachineRecord: {
      title: 'Reel American: The Road to the Olympic Rings',
      organizationName: 'U.S. Mission to Jordan',
      openDate: '2026-07-22',
      deadlineDate: '2026-08-31',
      applicationUrl: source.url,
      evidenceUrl: 'https://api.grants.gov/v1/api/search2',
    },
  };
  const content = machineEvidenceText(evidenceSource, 'Canonical Grants.gov detail page');
  const candidate = new DeterministicExtractor({ now: () => new Date('2026-08-12T00:00:00.000Z') }).extract(
    evidenceSource,
    { id: 'snapshot', sourceId: source.id, url: source.url, fetchedAt: '2026-08-12T00:00:00.000Z', status: 'ok', content, contentHash: 'hash' },
  );
  assert.equal(candidate.organizationName, 'U.S. Mission to Jordan');
  assert.equal(candidate.deadline.date, '2026-08-31');
  assert.deepEqual(candidate.issues, []);
});

test('official machine deadline wins over a rolling signal on the application page', () => {
  const evidenceSource: Source = {
    ...source,
    discoveryMachineRecord: {
      title: 'Graton Artist Opportunity',
      organizationName: 'Sundance Institute',
      deadlineDate: '2026-08-18',
      applicationUrl: source.url,
      evidenceUrl: 'https://www.sundance.org/deadlines/',
    },
  };
  const content = machineEvidenceText(evidenceSource, 'Applications accepted on a rolling basis.');
  const candidate = new DeterministicExtractor({ now: () => new Date('2026-08-12T00:00:00.000Z') }).extract(
    evidenceSource,
    { id: 'snapshot', sourceId: source.id, url: source.url, fetchedAt: '2026-08-12T00:00:00.000Z', status: 'ok', content, contentHash: 'hash' },
  );
  assert.equal(candidate.deadline.kind, 'exact');
  assert.equal(candidate.deadline.date, '2026-08-18');
});
