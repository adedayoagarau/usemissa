import assert from 'node:assert/strict';
import test from 'node:test';
import { scrubErrorMessage, siteRequestContext } from './siteTracking';

test('request context uses the first forwarded IP and the Vercel country', () => {
  const headers = new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1', host: 'UseMissa.com', 'user-agent': 'UA', 'x-vercel-ip-country': 'ng' });
  assert.deepEqual(siteRequestContext(headers), { host: 'usemissa.com', ip: '203.0.113.9', userAgent: 'UA', country: 'NG' });
});

test('error messages lose emails, query strings, and long numbers', () => {
  assert.equal(scrubErrorMessage('Failed for jane.doe@example.com at https://usemissa.com/x?token=abc order 12345678'), 'Failed for [email] at https://usemissa.com/x order [number]');
  assert.equal(scrubErrorMessage('x'.repeat(400)).length, 300);
});
