import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildServerDemoWorld, demoSeedAllowed, DemoSeedRefusedError, ManualClock } from '../src/index.js';

test('demo seed is allowed for development, test, and unset environments', () => {
  assert.equal(demoSeedAllowed({}), true);
  assert.equal(demoSeedAllowed({ NODE_ENV: 'development' }), true);
  assert.equal(demoSeedAllowed({ NODE_ENV: 'test' }), true);
  assert.equal(demoSeedAllowed({ NODE_ENV: 'development', VERCEL_ENV: 'preview' }), true);
});

test('demo seed is refused for production runtimes', () => {
  assert.equal(demoSeedAllowed({ NODE_ENV: 'production' }), false);
  assert.equal(demoSeedAllowed({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }), false);
  assert.equal(demoSeedAllowed({ VERCEL_ENV: 'production' }), false);
  assert.equal(demoSeedAllowed({ NODE_ENV: 'development', VERCEL_ENV: 'production' }), false);
});

test('demo seed escape hatches never apply to a Vercel production deployment', () => {
  assert.equal(demoSeedAllowed({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }), true);
  assert.equal(demoSeedAllowed({ NODE_ENV: 'production', MISSA_ALLOW_DEMO_WORLD: '1' }), true);
  assert.equal(
    demoSeedAllowed({ NODE_ENV: 'production', VERCEL_ENV: 'production', NEXT_PHASE: 'phase-production-build' }),
    false,
  );
  assert.equal(
    demoSeedAllowed({ NODE_ENV: 'production', VERCEL_ENV: 'production', MISSA_ALLOW_DEMO_WORLD: '1' }),
    false,
  );
});

test('buildServerDemoWorld throws before seeding known-password accounts in production', () => {
  const clock = new ManualClock(new Date('2026-07-07T09:00:00Z'));
  assert.throws(() => buildServerDemoWorld(clock, { NODE_ENV: 'production' }), DemoSeedRefusedError);
  assert.throws(() => buildServerDemoWorld(clock, { VERCEL_ENV: 'production' }), DemoSeedRefusedError);
  const world = buildServerDemoWorld(clock, { NODE_ENV: 'test' });
  assert.equal(world.credentials.admin.email, 'admin@missa.dev');
});
