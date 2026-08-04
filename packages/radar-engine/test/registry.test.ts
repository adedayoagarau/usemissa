import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleRegistry, registryStats, filterSources, discoverySeeds, canonicalSources } from '../src/registry/assemble.js';
import { auditRegistryTaxonomy } from '../src/registry/taxonomy.js';

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
