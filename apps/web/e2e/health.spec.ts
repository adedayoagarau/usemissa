import { test, expect } from '@playwright/test';

test('readiness probe reports configuration presence without leaking secrets', async ({ request }) => {
  const response = await request.get('/api/health/readiness');
  expect([200, 503]).toContain(response.status());

  const body = await response.json();
  expect(['ready', 'degraded']).toContain(body.status);
  expect(body.checks.database).toMatchObject({ required: true });
  expect(body.checks.session).toMatchObject({ required: true });
  expect(body.checks.malwareScanning).toHaveProperty('required', false);
  expect(JSON.stringify(body)).not.toContain('postgres://');
  expect(JSON.stringify(body)).not.toContain('secret');
});
