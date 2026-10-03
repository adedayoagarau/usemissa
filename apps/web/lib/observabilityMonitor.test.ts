import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAlertRules } from './observabilityMonitor';
import { renderAdminAlertEmail, renderAdminWeeklyDigest } from '@/emails/admin-observability';

const quiet = { errorsLastHour: 0, avgErrorsPerHour: 1, visitorsLast24h: 100, avgDailyVisitors: 100, signupsLast24h: 5, avgDailySignups: 5, failedEmailsLast24h: 0 };
const firing = (results: ReturnType<typeof evaluateAlertRules>) => results.filter((rule) => rule.firing).map((rule) => rule.key).sort();

test('a healthy site raises no alerts', () => {
  assert.deepEqual(firing(evaluateAlertRules({ signals: quiet, uptimeStreaks: {}, workerStatus: 'running' })), []);
});

test('uptime alerts need two failed checks in a row', () => {
  assert.deepEqual(firing(evaluateAlertRules({ signals: quiet, uptimeStreaks: { home: 1 } })), []);
  assert.deepEqual(firing(evaluateAlertRules({ signals: quiet, uptimeStreaks: { home: 2 } })), ['uptime:home']);
});

test('spikes and drops compare against a real baseline', () => {
  assert.deepEqual(firing(evaluateAlertRules({ signals: { ...quiet, errorsLastHour: 9 }, uptimeStreaks: {} })), []);
  assert.deepEqual(firing(evaluateAlertRules({ signals: { ...quiet, errorsLastHour: 12 }, uptimeStreaks: {} })), ['errors:spike']);
  assert.deepEqual(firing(evaluateAlertRules({ signals: { ...quiet, visitorsLast24h: 30 }, uptimeStreaks: {} })), ['traffic:drop']);
  assert.deepEqual(firing(evaluateAlertRules({ signals: { ...quiet, visitorsLast24h: 2, avgDailyVisitors: 5 }, uptimeStreaks: {} })), []);
  assert.deepEqual(firing(evaluateAlertRules({ signals: { ...quiet, signupsLast24h: 0 }, uptimeStreaks: {} })), ['signups:stopped']);
  assert.deepEqual(firing(evaluateAlertRules({ signals: { ...quiet, signupsLast24h: 0, avgDailySignups: 1 }, uptimeStreaks: {} })), []);
  assert.deepEqual(firing(evaluateAlertRules({ signals: quiet, uptimeStreaks: {}, workerStatus: 'stale' })), ['worker:stopped']);
});

test('alert and digest emails escape content and link to the admin', () => {
  const alert = renderAdminAlertEmail({ items: [{ title: 'Home page is down', detail: '<script>x</script>', state: 'fired' }], adminUrl: 'https://usemissa.com' });
  assert.equal(alert.subject, 'Missa alert: Home page is down');
  assert.ok(alert.html.includes('&lt;script&gt;'));
  assert.ok(alert.html.includes('https://usemissa.com/admin/health'));
  const digest = renderAdminWeeklyDigest({ weekOf: '26 September', metrics: [{ label: 'Visitors', value: '1,204', change: '+12%' }, { label: 'New sign-ups', value: '48' }], highlights: ['Top source: google.com'], adminUrl: 'https://usemissa.com' });
  assert.equal(digest.subject, 'Missa this week: 1,204 visitors, 48 new sign-ups');
  assert.ok(digest.text.includes('Visitors: 1,204 (+12% vs last week)'));
});
