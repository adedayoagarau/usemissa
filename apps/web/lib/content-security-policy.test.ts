import assert from 'node:assert/strict';
import test from 'node:test';
import { buildContentSecurityPolicy, CSP_REPORT_PATH } from './content-security-policy';
import { POST as cspReport } from '../app/api/csp-report/route';

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split(';').map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name!, values];
    }),
  );
}

test('production policy blocks plugins, framing and eval and reports violations', () => {
  const policy = directives(buildContentSecurityPolicy({ NODE_ENV: 'production' }));
  assert.deepEqual(policy.get('object-src'), ["'none'"]);
  assert.deepEqual(policy.get('frame-ancestors'), ["'none'"]);
  assert.deepEqual(policy.get('base-uri'), ["'self'"]);
  assert.ok(!policy.get('script-src')!.includes("'unsafe-eval'"));
  assert.deepEqual(policy.get('report-uri'), [CSP_REPORT_PATH]);
  assert.ok(policy.get('connect-src')!.includes('https://us.i.posthog.com'));
});

test('policy follows configured PostHog and Neon Auth hosts', () => {
  const policy = directives(
    buildContentSecurityPolicy({
      NODE_ENV: 'production',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com/',
      NEXT_PUBLIC_NEON_AUTH_URL: 'https://auth.example.neon.tech/neondb/auth',
    }),
  );
  assert.ok(policy.get('connect-src')!.includes('https://eu.i.posthog.com'));
  assert.ok(policy.get('connect-src')!.includes('https://auth.example.neon.tech'));
});

test('development allows eval and the hot reload socket', () => {
  const policy = directives(buildContentSecurityPolicy({ NODE_ENV: 'development' }));
  assert.ok(policy.get('script-src')!.includes("'unsafe-eval'"));
  assert.ok(policy.get('connect-src')!.includes('ws:'));
});

test('the report endpoint accepts reports and ignores oversized or malformed bodies', async () => {
  const report = JSON.stringify({
    'csp-report': {
      'document-uri': 'https://usemissa.com/unsubscribe?token=secret',
      'effective-directive': 'script-src-elem',
      'blocked-uri': 'https://evil.example/x.js',
    },
  });
  const warnings: unknown[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);
  try {
    const ok = await cspReport(new Request('https://usemissa.com/api/csp-report', { method: 'POST', body: report }));
    assert.equal(ok.status, 204);
    assert.equal(warnings.length, 1);
    assert.ok(!JSON.stringify(warnings).includes('secret'));
    const junk = await cspReport(new Request('https://usemissa.com/api/csp-report', { method: 'POST', body: 'not json' }));
    assert.equal(junk.status, 204);
    const huge = await cspReport(
      new Request('https://usemissa.com/api/csp-report', { method: 'POST', body: 'x'.repeat(20_000) }),
    );
    assert.equal(huge.status, 204);
    assert.equal(warnings.length, 1);
  } finally {
    console.warn = original;
  }
});
