import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleRegistry, registryStats, filterSources, discoverySeeds, canonicalSources } from '../src/registry/assemble.js';
import { auditRegistryTaxonomy, trustedSource } from '../src/registry/taxonomy.js';

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

  for (const name of ['Annecy MIFA Pitches', 'Women in Animation Programs', 'Durban FilmMart Pitch and Finance Forum', 'Realness Institute Programmes']) {
    const source = byName.get(name);
    assert.equal(source?.tier, 0, `${name} must be a first-party canonical source`);
    assert.equal(source?.followsOutboundLinks, false, `${name} must not fan out as an aggregator`);
  }
});
