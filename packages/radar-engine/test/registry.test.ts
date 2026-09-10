import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleRegistry, registryStats, filterSources, discoverySeeds, canonicalSources } from '../src/registry/assemble.js';
import { auditRegistryTaxonomy, trustedSource } from '../src/registry/taxonomy.js';
import { AFRICAN_LITERARY_PHASE_3_COUNTRY_PLAN } from '../src/registry/bundles/global-literary-phase-3.js';

test('source registry has 1000+ entries across verticals', () => {
  const reg = assembleRegistry();
  assert.ok(reg.sources.length >= 1000, `expected >= 1000 sources, got ${reg.sources.length}`);
  assert.ok(reg.verticals.length >= 40);
});

test('registry deduplicates URLs', () => {
  const reg = assembleRegistry();
  const urls = reg.sources.map((s) => s.url.replace(/\/$/, '').toLowerCase());
  assert.equal(urls.length, new Set(urls).size);
});

test('registry filter by group and tier', () => {
  const reg = assembleRegistry();
  const literary = filterSources(reg, { groups: ['literary'] });
  assert.ok(literary.length > 200);
  const dirs = filterSources(reg, { maxTier: 2 });
  assert.ok(dirs.some((s) => s.tier === 2));
  const canonical = canonicalSources(reg);
  assert.ok(canonical.length > 900);
  const seeds = discoverySeeds(reg);
  assert.ok(seeds.length >= 10);
});

test('registry stats sum to total', () => {
  const reg = assembleRegistry();
  const stats = registryStats(reg);
  const tierSum = Object.values(stats.byTier).reduce((a, b) => a + b, 0);
  assert.equal(tierSum, stats.totalSources);
  assert.equal(
    Object.values(stats.byTrustStatus).reduce((a, b) => a + b, 0),
    stats.totalSources,
  );
  assert.ok(stats.trustedSources > 900);
});

test('taxonomy compatibility preserves every source and separates platform and eligibility axes', () => {
  const reg = assembleRegistry();
  const audit = auditRegistryTaxonomy(reg);
  assert.equal(audit.sourceCountAfter, audit.sourceCountBefore);
  assert.equal(audit.verticalsWithoutCompatibility.length, 0);
  assert.ok(audit.mappedSources > 0);
  assert.ok(audit.platformOnlySources.length > 0);
  assert.ok(audit.eligibilityLensSources.length > 0);
});

test('trusted registry exposes explicit coverage for every selectable discipline and genre', () => {
  const reg = assembleRegistry();
  assert.equal(reg.coverage.totalTerms, reg.coverage.terms.length);
  assert.ok(reg.coverage.byFacet.discipline);
  assert.ok(reg.coverage.byFacet.genre);
  assert.ok(reg.coverage.gapTerms > 0, 'unsupported terms must remain visible as gaps');
  assert.ok(reg.sources.every((source) => source.trust));
  assert.ok(reg.sources.some((source) => trustedSource(source)));
});

test('priority source families declare their site schema and correct source tier', () => {
  const reg = assembleRegistry();
  const byName = new Map(reg.sources.map((source) => [source.name, source]));

  assert.equal(byName.get('NewPages Calls and Contests')?.discoveryAdapterId, 'newpages-index');
  assert.equal(byName.get('Commonwealth Foundation Creative Opportunities')?.discoveryAdapterId, 'commonwealth-index');
  assert.equal(byName.get('Music In Africa Opportunities')?.discoveryAdapterId, 'music-in-africa-index');
  assert.equal(byName.get('African Culture Fund Calls')?.discoveryAdapterId, 'african-culture-fund-index');
  const resArtis = byName.get('Res Artis Open Calls');
  assert.equal(resArtis?.discoveryAdapterId, 'resartis-index');
  assert.equal(resArtis?.tier, 2);
  assert.equal(resArtis?.checkIntervalHours, 24);
  assert.equal(resArtis?.discoveryLinkLimit, 400);
  assert.equal(resArtis?.discoveryRequestProfile, 'browser-compatible');
  const onTheMove = byName.get('On the Move Open Calls');
  assert.equal(onTheMove?.url, 'https://on-the-move.org/news/deadlines');
  assert.equal(onTheMove?.discoveryAdapterId, 'on-the-move-index');
  assert.equal(onTheMove?.tier, 2);
  assert.equal(onTheMove?.checkIntervalHours, 24);
  assert.equal(onTheMove?.discoveryLinkLimit, 100);

  for (const name of ['Annecy MIFA Pitches', 'Women in Animation Programs', 'Durban FilmMart Pitch and Finance Forum', 'Realness Institute Programmes']) {
    const source = byName.get(name);
    assert.equal(source?.tier, 0, `${name} must be a first-party canonical source`);
    assert.equal(source?.followsOutboundLinks, false, `${name} must not fan out as an aggregator`);
  }
});

test('phase 3 global literary tranche starts with country-scoped first-party seeds', () => {
  const reg = assembleRegistry();
  const trancheNames = [
    'Naira Stories',
    'LOGOS Magazine',
    'The Inkline',
    'African Writer Magazine',
    'AFREADA',
    'Africa in Dialogue',
    'Afritondo',
    'Akuko Magazine',
    'A Long House',
    'The Iroko Circle',
    'Brittle Paper',
    'Agbowo',
    'Omenana',
    'Iskanchi',
    'Isele Magazine',
    'Adda Stories',
    'Writivism',
    'Nenta Literary Journal',
    'Ta Adesa',
    'Hummingbird Journal',
    'Lolwe',
    'Jalada Africa',
    'Inkazi Africa',
    'KUDU Journal',
    'Botsotso Publishing',
    'Coinage Africa',
    'Doek',
    'Munyori Literary Journal',
    'Bakwa Magazine',
    'Kalahari Review',
    'Ubwali',
    'Doek List',
    'African Literary Magazines Directory',
    'The Open Desk Writing Opportunities',
    "PUBLISH'D AFRIKA African Writer List",
  ];

  const tranche = reg.sources.filter((source) => trancheNames.includes(source.name));
  assert.equal(tranche.length, trancheNames.length);
  const directorySeeds = tranche.filter((source) => source.discoveryAdapterId === 'african-literary-directory');
  const firstPartySeeds = tranche.filter((source) => source.discoveryAdapterId !== 'african-literary-directory');
  assert.equal(directorySeeds.length, 4);
  assert.ok(directorySeeds.every((source) => source.tier === 2));
  assert.ok(directorySeeds.every((source) => source.kind === 'directory'));
  assert.ok(directorySeeds.every((source) => source.followsOutboundLinks));
  assert.ok(firstPartySeeds.every((source) => source.tier === 0));
  assert.ok(firstPartySeeds.every((source) => source.kind === 'organization-website'));
  assert.ok(tranche.every((source) => source.opportunityTypes.includes('magazine')));
  assert.deepEqual(
    [...new Set(tranche.flatMap((source) => source.geography ?? []))].sort(),
    ['BW', 'CM', 'GH', 'KE', 'NA', 'NG', 'UG', 'ZA', 'ZM', 'ZW', 'global'],
  );
  assert.ok(tranche.every((source) => source.notes?.includes('Phase 3 Tranche A')));
});

test('phase 3 African literary country plan is country-by-country and source-backed', () => {
  const reg = assembleRegistry();
  const sourceNames = new Set(reg.sources.map((source) => source.name));
  assert.equal(AFRICAN_LITERARY_PHASE_3_COUNTRY_PLAN.length, 54);
  assert.equal(
    new Set(AFRICAN_LITERARY_PHASE_3_COUNTRY_PLAN.map((country) => country.code)).size,
    AFRICAN_LITERARY_PHASE_3_COUNTRY_PLAN.length,
  );
  assert.ok(AFRICAN_LITERARY_PHASE_3_COUNTRY_PLAN.some((country) => country.status === 'research-needed'));

  for (const country of AFRICAN_LITERARY_PHASE_3_COUNTRY_PLAN) {
    if (country.status === 'seeded') {
      assert.ok(country.sourceNames.length > 0, `${country.country} must name at least one source`);
    }
    for (const sourceName of country.sourceNames) {
      assert.ok(sourceNames.has(sourceName), `${country.country} references missing source ${sourceName}`);
    }
  }
});
