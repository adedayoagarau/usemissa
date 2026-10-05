import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildOpportunityContent,
  firstOwnUrl,
  intermediaryUrlSqlPattern,
  isIntermediaryName,
  isIntermediaryUrl,
  isUsableOrganizationName,
  mentionsIntermediary,
  organizationLinkFor,
  toPublicOpportunity,
  type OpportunityDetailProjection,
} from '../src/index.js';

test('recognizes every platform host and its subdomains, and nobody else', () => {
  for (const url of [
    'https://www.artconnect.com/opportunity/ZZ1QxMOueTmuYd7bOfG5K',
    'https://outskirts.submittable.com/submit/347653/poetry',
    'https://manager.submittable.com/opportunities/discover',
    'https://www.chillsubs.com/magazine/x',
    'https://www.pw.org/grants',
    'https://www.resartis.org/listings/x',
    'https://www.on-the-move.org/news/x',
    'https://rivet.es/calls/x',
    'artdeadline.com/x',
  ]) assert.equal(isIntermediaryUrl(url), true, url);
  for (const url of [
    'https://www.altiba9.com/submission-artist-interview',
    'https://notartconnect.com/',
    'https://pw.org.example.com/',
    'https://outskirtsjournal.com/',
    '',
    null,
  ]) assert.equal(isIntermediaryUrl(url), false, String(url));
  assert.equal(firstOwnUrl('https://x.submittable.com/submit', null, 'https://journal.org'), 'https://journal.org');
});

test('recognizes platform names but not organizations that share initials', () => {
  for (const name of ['ArtConnect', 'Art Connect', 'ArtConnect Opportunities', 'Submittable Discover', 'Chill Subs', 'Poets & Writers', 'Res Artis', 'Curatorspace', 'On the Move', 'Playbill']) {
    assert.equal(isIntermediaryName(name), true, name);
  }
  for (const name of ['PW', 'Willow Springs', 'Al-Tiba9 Contemporary Art', 'Villa Medici', '', null]) {
    assert.equal(isIntermediaryName(name), false, String(name));
  }
  assert.equal(isUsableOrganizationName('On the Move'), false);
  assert.equal(mentionsIntermediary('ArtConnect lists “Open Call”'), true);
  assert.equal(mentionsIntermediary('Submit through https://foo.submittable.com/submit'), true);
  assert.equal(mentionsIntermediary('Open to poets and writers in any country'), false);
});

test('migration 0094 matches exactly the hosts listed in TypeScript', () => {
  const migration = readFileSync(new URL('../../../db/migrations/0094_intermediary_publication_hold.sql', import.meta.url), 'utf8');
  const stored = /missa_intermediary_url_pattern\(\)[\s\S]*?SELECT '([^']+)'::text/.exec(migration)?.[1];
  assert.equal(stored, intermediaryUrlSqlPattern());
});

function listing(overrides: Partial<OpportunityDetailProjection> = {}): OpportunityDetailProjection {
  return {
    id: 'opp_1',
    slug: 'outskirts-poetry-opp_1',
    title: 'Outskirts Literary Journal — Poetry',
    organizationId: 'org_subm_1',
    organizationName: 'Outskirts Literary Journal',
    status: 'open',
    type: 'magazine',
    genres: [],
    deadline: { kind: 'exact', date: '2026-11-01' },
    fee: { status: 'no-fee' },
    submissionAvailable: true,
    source: {
      kind: 'platform',
      name: 'Submittable Discover',
      url: 'https://manager.submittable.com/opportunities/discover',
      checkedAt: '2026-10-01T00:00:00.000Z',
      organizationConfirmed: true,
    },
    eligibility: [],
    requiredMaterials: [],
    guidelinesUrl: 'https://outskirts.submittable.com/submit/347653/poetry',
    submissionUrl: 'https://outskirts.submittable.com/submit/347653/poetry',
    organizationWebsiteUrl: 'https://outskirtsjournal.com',
    changes: [{ kind: 'submission-url-changed', at: '2026-10-01T00:00:00.000Z', newValue: 'https://outskirts.submittable.com/submit/1' }],
    relatedOpportunityIds: [],
    ...overrides,
  };
}

test("public listings link to the organization's website, never to Submittable", () => {
  const page = 'https://www.usemissa.com/opportunities/outskirts-poetry-opp_1';
  const result = toPublicOpportunity(listing(), page);
  assert.equal(result.guidelinesUrl, undefined);
  assert.equal(result.submissionUrl, undefined);
  assert.equal(result.submissionAvailable, false);
  assert.equal(result.organizationWebsiteUrl, 'https://outskirtsjournal.com/');
  assert.equal(result.source.url, 'https://outskirtsjournal.com/');
  assert.equal(result.source.name, 'Outskirts Literary Journal');
  assert.deepEqual(result.changes, []);
  assert.equal(organizationLinkFor(listing()), 'https://outskirtsjournal.com/');
  assert.equal(JSON.stringify(result).includes('submittable'), false);
});

test('a platform is never the host, and a write-up that names one is withheld', () => {
  const page = 'https://www.usemissa.com/opportunities/x';
  const result = toPublicOpportunity(listing({
    organizationId: 'org_artconn_3e4e244173eda2fe',
    organizationName: 'ArtConnect',
    organizationWebsiteUrl: undefined,
    guidelinesUrl: 'https://www.altiba9.com/submission-artist-interview',
    submissionUrl: undefined,
    source: { kind: 'directory', name: 'ArtConnect Opportunities', url: 'https://www.artconnect.com/opportunity/ZZ1', checkedAt: '2026-10-01T00:00:00.000Z', organizationConfirmed: true },
    content: buildOpportunityContent({
      title: 'Open Call', type: 'open-call', status: 'open', organizationName: 'On the Move', genres: [],
      deadline: { kind: 'exact', date: '2026-10-04' }, fee: { status: 'no-fee' }, requiredMaterials: [],
      sourceUrl: 'https://www.artconnect.com/opportunity/ZZ1', organizationConfirmed: true,
    }),
  }), page);
  assert.equal(result.organizationName, undefined);
  assert.equal(result.organizationId, undefined);
  assert.equal(result.guidelinesUrl, 'https://www.altiba9.com/submission-artist-interview');
  assert.equal(result.source.url, 'https://www.altiba9.com/submission-artist-interview');
  assert.equal(result.source.name, 'altiba9.com');
  assert.equal(JSON.stringify(result).toLowerCase().includes('artconnect'), false);
});

test("a write-up never names a platform as the organization", () => {
  const content = buildOpportunityContent({
    title: 'Media Artists Program', type: 'residency', status: 'open', organizationName: 'ArtConnect', genres: [],
    deadline: { kind: 'exact', date: '2026-10-04' }, fee: { status: 'no-fee' }, requiredMaterials: [],
    sourceUrl: 'https://example.org/call', organizationConfirmed: true,
  });
  assert.match(content.summary, /^This organization lists/);
});

test('with no link of its own, a listing points only at its Missa page', () => {
  const page = 'https://www.usemissa.com/opportunities/x';
  const result = toPublicOpportunity(listing({ organizationWebsiteUrl: 'https://outskirts.submittable.com' }), page);
  assert.equal(result.organizationWebsiteUrl, undefined);
  assert.equal(result.source.url, page);
  assert.equal(organizationLinkFor(result), undefined);
});
