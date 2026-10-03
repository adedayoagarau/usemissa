import test from 'node:test';
import assert from 'node:assert/strict';
import { scrubSentryBreadcrumb, scrubSentryEvent, sentryBaseOptions } from './sentry-options';

test('Sentry events lose credentials, bodies, users and query strings', () => {
  const event = scrubSentryEvent({
    request: {
      url: 'https://usemissa.com/api/me/calendar/connections/google/callback?code=secret&state=s',
      query_string: 'code=secret&state=s',
      cookies: { session: 'x' },
      data: { password: 'x' },
      headers: { Authorization: 'Bearer x', Cookie: 'a=b', 'user-agent': 'test' },
    },
    user: { email: 'creator@example.com' },
    breadcrumbs: [{ data: { url: '/api/calendar/feed?token=secret', method: 'GET' } }],
  });
  assert.deepEqual(event, {
    request: {
      url: 'https://usemissa.com/api/me/calendar/connections/google/callback',
      headers: { 'user-agent': 'test' },
    },
    breadcrumbs: [{ data: { url: '/api/calendar/feed', method: 'GET' } }],
  });
  assert.deepEqual(scrubSentryBreadcrumb({ data: { from: '/a?x=1', to: '/b#frag' } }), { data: { from: '/a', to: '/b' } });
});

test('Sentry never sends default PII and traces only when a valid rate is set', () => {
  const options = sentryBaseOptions('https://key@example.ingest.sentry.io/1');
  assert.equal(options.sendDefaultPii, false);
  assert.equal(options.tracesSampleRate, 0);
  assert.equal(sentryBaseOptions('dsn', '0.2').tracesSampleRate, 0.2);
  assert.equal(sentryBaseOptions('dsn', '5').tracesSampleRate, 0);
});
