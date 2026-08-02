import { expect, test, type Page } from '@playwright/test';

async function account(page: Page) {
  const email = `import-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  expect((await page.request.post('/api/auth/signup', { data: { email, password: 'correct-horse-battery', displayName: 'Import User' } })).status()).toBe(201);
  const profile = await page.request.get('/api/me/profile');
  return (await profile.json()) as { id: string };
}

test('tracker import previews, commits, and keeps unmatched rows private', async ({ page }) => {
  const profile = await account(page);
  const opportunities = await page.request.get('/api/opportunities');
  const first = ((await opportunities.json()) as { items: Array<{ id: string; title: string; organizationName?: string }> }).items[0];
  expect(first?.title).toBeTruthy();
  const csv = `Title,Organization,Status,Notes\n"${first.title}","${first.organizationName ?? 'Unknown'}",Submitted,Imported note\nPrivate call,Private organization,Saved,Keep private\n`;
  const multipart = { file: { name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } };
  const previewResponse = await page.request.post('/api/me/imports/tracker/preview', { multipart });
  expect(previewResponse.status()).toBe(200);
  const preview = await previewResponse.json();
  expect(preview.summary.total).toBe(2);
  expect(preview.rows[0].classification).toBe('matched');
  expect(preview.rows[1].classification).toBe('unmatched');

  const decisions = { [preview.rows[0].rowNumber]: 'match', [preview.rows[1].rowNumber]: 'create-manual' };
  const commit = await page.request.post('/api/me/imports/tracker/commit', { multipart: { ...multipart, previewToken: preview.previewToken, mapping: JSON.stringify(preview.detectedMapping), decisions: JSON.stringify(decisions) } });
  expect(commit.status()).toBe(200);
  const result = await commit.json();
  expect(result.imported).toBe(2);
  expect(result.createdManual).toBe(1);

  const tracker = await page.request.get(`/api/users/${profile.id}/tracker`);
  expect(tracker.ok()).toBeTruthy();
  expect(JSON.stringify(await tracker.json())).toContain('Private call');
  const publicOpportunities = await page.request.get('/api/opportunities');
  expect(JSON.stringify(await publicOpportunities.json())).not.toContain('Private call');
  const exported = await page.request.get('/api/me/export?scope=tracker');
  expect(exported.ok()).toBeTruthy();
  expect(JSON.stringify(await exported.json())).toContain('Private call');
});

test('tracker import rejects stale previews and unauthenticated requests', async ({ page }) => {
  await account(page);
  const csv = 'Title,Organization,Status\nA call,An organization,Saved\n';
  const multipart = { file: { name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } };
  const preview = await page.request.post('/api/me/imports/tracker/preview', { multipart });
  expect(preview.status()).toBe(200);
  const body = await preview.json();
  const changed = await page.request.post('/api/me/imports/tracker/commit', { multipart: { file: { name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from('Title,Organization,Status\nChanged,An organization,Saved\n') }, previewToken: body.previewToken, mapping: JSON.stringify(body.detectedMapping), decisions: JSON.stringify({}) } });
  expect(changed.status()).toBe(409);
  await page.request.post('/api/auth/logout');
  const unauth = await page.request.post('/api/me/imports/tracker/preview', { multipart });
  expect(unauth.status()).toBe(401);
  const stale = await page.request.post('/api/me/imports/tracker/commit', { multipart: { ...multipart, previewToken: body.previewToken, mapping: JSON.stringify(body.detectedMapping), decisions: JSON.stringify({}) } });
  expect(stale.status()).toBe(401);
});

test('import stepper is reachable from the authenticated Passport shell', async ({ page }) => {
  await account(page);
  await page.goto('/import');
  await expect(page.getByRole('heading', { name: 'Import your tracker' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download CSV template' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download CSV template' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from('Title,Organization,Status\nA call,An organization,Saved\n') });
  await page.getByRole('button', { name: 'Review columns' }).click();
  await expect(page.getByText('Map columns', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preview matches' }).click();
  await expect(page.getByText('Review before importing', { exact: true })).toBeVisible();
});
