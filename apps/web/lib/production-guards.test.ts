import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDemoWorldAllowed, MissingDatabaseConfigurationError } from './engine';
import { resolveTokenSecret } from './token-secret';

test('demo world is refused in production when DATABASE_URL is missing', () => {
  assert.throws(() => assertDemoWorldAllowed({ NODE_ENV: 'production' }), MissingDatabaseConfigurationError);
  assert.throws(() => assertDemoWorldAllowed({ VERCEL_ENV: 'production' }), MissingDatabaseConfigurationError);
  assert.throws(
    () => assertDemoWorldAllowed({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }),
    MissingDatabaseConfigurationError,
  );
});

test('demo world stays available for development, unit tests, Playwright, and CI builds', () => {
  assert.doesNotThrow(() => assertDemoWorldAllowed({}));
  assert.doesNotThrow(() => assertDemoWorldAllowed({ NODE_ENV: 'development' }));
  assert.doesNotThrow(() => assertDemoWorldAllowed({ NODE_ENV: 'test' }));
  assert.doesNotThrow(() => assertDemoWorldAllowed({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }));
});

test('a configured database always passes the demo world guard', () => {
  assert.doesNotThrow(() => assertDemoWorldAllowed({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db' }));
});

test('token secrets fail closed in production', () => {
  assert.throws(() => resolveTokenSecret(undefined, 'dev', { NODE_ENV: 'production' }), /MISSA_SESSION_SECRET/);
  assert.throws(() => resolveTokenSecret(undefined, 'dev', { VERCEL_ENV: 'production' }), /MISSA_SESSION_SECRET/);
  assert.equal(resolveTokenSecret(undefined, 'dev', { NODE_ENV: 'production', MISSA_SESSION_SECRET: 's' }), 's');
  assert.equal(resolveTokenSecret('explicit', 'dev', { NODE_ENV: 'production' }), 'explicit');
});

test('token secrets use the development fallback outside production', () => {
  assert.equal(resolveTokenSecret(undefined, 'dev', {}), 'dev');
  assert.equal(resolveTokenSecret(undefined, 'dev', { NODE_ENV: 'development' }), 'dev');
});
