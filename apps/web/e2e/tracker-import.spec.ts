import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function account(page: Page) {
  const email = `import-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  expect((await page.request.post('/api/auth/signup', { data: { email, password: 'correct-horse-battery', displayName: 'Import User' } })).status()).toBe(201);
  const profile = await page.request.get('/api/me/profile');
  return (await profile.json()) as { id: string };
}

test('tracker import previews, commits, and keeps unmatched rows private', async ({ page }) => {
  const profile = await account(page);
  const opportunities = await page.request.get('/api/opportunities');
  const first = ((await opportunities.json()) as { items: Array<{ id: string; title: string; organizationName?: string; source: { url: string } }> }).items[0];
  expect(first?.title).toBeTruthy();
  const csv = `Title,Organization,Status,Notes,URL\n"${first.title}","${first.organizationName ?? 'Unknown'}",Submitted,Imported note,"${first.source.url}"\nPrivate call,Private organization,Saved,Keep private,\n`;
  const multipart = { file: { name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } };
  const previewResponse = await page.request.post('/api/me/imports/tracker/preview', { multipart });
  expect(previewResponse.status()).toBe(200);
  const preview = await previewResponse.json();
  expect(preview.summary.total).toBe(2);
  expect(preview.rows[0].state).toBe('exact-match');
  expect(preview.rows[0].candidates[0]).not.toHaveProperty('confidence');
  expect(preview.rows[0].candidates[0].reasons).toContain('The imported source URL matches this published Opportunity.');
  expect(preview.rows[1].state).toBe('no-match');

  const decisions = { [preview.rows[0].rowNumber]: { action: 'match', opportunityId: first.id }, [preview.rows[1].rowNumber]: 'create-manual' };
  const idempotencyKey = crypto.randomUUID();
  const commitOptions = { headers: { 'Idempotency-Key': idempotencyKey }, multipart: { ...multipart, previewToken: preview.previewToken, mapping: JSON.stringify(preview.detectedMapping), decisions: JSON.stringify(decisions) } };
  const commit = await page.request.post('/api/me/imports/tracker/commit', commitOptions);
  expect(commit.status()).toBe(200);
  const result = await commit.json();
  expect(result.imported).toBe(2);
  expect(result.createdManual).toBe(1);
  expect(result.idempotent).toBe(false);

  const replay = await page.request.post('/api/me/imports/tracker/commit', commitOptions);
  expect(replay.status()).toBe(200);
  const replayResult = await replay.json();
  expect(replayResult.importId).toBe(result.importId);
  expect(replayResult.idempotent).toBe(true);

  const tracker = await page.request.get(`/api/users/${profile.id}/tracker`);
  expect(tracker.ok()).toBeTruthy();
  expect(JSON.stringify(await tracker.json())).toContain('Private call');
  const publicOpportunities = await page.request.get('/api/opportunities');
  expect(JSON.stringify(await publicOpportunities.json())).not.toContain('Private call');
  const exported = await page.request.get('/api/me/export?scope=tracker');
  expect(exported.ok()).toBeTruthy();
  expect(JSON.stringify(await exported.json())).toContain('Private call');

  await page.goto(`/tracker?import=${encodeURIComponent(result.importId)}`);
  await expect(page.getByRole('heading', { name: `Rows changed by ${result.importId}` })).toBeVisible();
  await expect(page.getByText('2 Tracker items linked to this receipt.')).toBeVisible();
  await expect(page.getByRole('heading', { name: first.title })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Private call' })).toBeVisible();
});

test('tracker import rejects stale previews and unauthenticated requests', async ({ page }) => {
  await account(page);
  const csv = 'Title,Organization,Status\nA call,An organization,Saved\n';
  const multipart = { file: { name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } };
  const preview = await page.request.post('/api/me/imports/tracker/preview', { multipart });
  expect(preview.status()).toBe(200);
  const body = await preview.json();
  const changed = await page.request.post('/api/me/imports/tracker/commit', { headers: { 'Idempotency-Key': crypto.randomUUID() }, multipart: { file: { name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from('Title,Organization,Status\nChanged,An organization,Saved\n') }, previewToken: body.previewToken, mapping: JSON.stringify(body.detectedMapping), decisions: JSON.stringify({}) } });
  expect(changed.status()).toBe(409);
  await page.request.post('/api/auth/logout');
  const unauth = await page.request.post('/api/me/imports/tracker/preview', { multipart });
  expect(unauth.status()).toBe(401);
  const stale = await page.request.post('/api/me/imports/tracker/commit', { headers: { 'Idempotency-Key': crypto.randomUUID() }, multipart: { ...multipart, previewToken: body.previewToken, mapping: JSON.stringify(body.detectedMapping), decisions: JSON.stringify({}) } });
  expect(stale.status()).toBe(401);
});

test('tracker import rejects a commit when the private Tracker changed after preview', async ({ page }) => {
  await account(page);
  const csv = 'Title,Organization,Status\nPrivate call,Private organization,Saved\n';
  const multipart = { file: { name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } };
  const previewResponse = await page.request.post('/api/me/imports/tracker/preview', { multipart });
  expect(previewResponse.status()).toBe(200);
  const preview = await previewResponse.json();

  const opportunities = await page.request.get('/api/opportunities?limit=1');
  const opportunityId = ((await opportunities.json()) as { items: Array<{ id: string }> }).items[0]?.id;
  expect(opportunityId).toBeTruthy();
  expect([200, 201]).toContain((await page.request.post('/api/me/tracker', { data: { opportunityId } })).status());

  const commit = await page.request.post('/api/me/imports/tracker/commit', {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    multipart: { ...multipart, previewToken: preview.previewToken, mapping: JSON.stringify(preview.detectedMapping), decisions: JSON.stringify({ '2': 'create-manual' }) },
  });
  expect(commit.status()).toBe(409);
  expect(await commit.text()).toContain('Tracker changed');
});

test('an all-skipped import returns a replayable no-change receipt', async ({ page }) => {
  await account(page);
  const csv = 'Title,Organization,Status\nPrivate call,Private organization,Saved\n';
  const multipart = { file: { name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } };
  const previewResponse = await page.request.post('/api/me/imports/tracker/preview', { multipart });
  const preview = await previewResponse.json();
  const idempotencyKey = crypto.randomUUID();
  const options = {
    headers: { 'Idempotency-Key': idempotencyKey },
    multipart: { ...multipart, previewToken: preview.previewToken, mapping: JSON.stringify(preview.detectedMapping), decisions: JSON.stringify({ '2': 'skip' }) },
  };
  const commit = await page.request.post('/api/me/imports/tracker/commit', options);
  expect(commit.status()).toBe(200);
  const result = await commit.json();
  expect(result.imported).toBe(0);
  expect(result.skipped).toBe(1);
  expect(result.idempotent).toBe(false);
  const replay = await page.request.post('/api/me/imports/tracker/commit', options);
  expect((await replay.json()).idempotent).toBe(true);
});

test('import stepper is reachable from the authenticated Passport shell', async ({ page }) => {
  await account(page);
  await page.goto('/import');
  await expect(page.getByRole('heading', { name: 'Import your tracker' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download CSV template' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download template' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from('Title,Organization,Status\nA call,An organization,Saved\n') });
  await page.getByRole('button', { name: 'Review columns' }).click();
  await expect(page.getByRole('heading', { name: 'Map columns' })).toBeVisible();
  await page.getByRole('button', { name: 'Review rows' }).click();
  await expect(page.getByRole('heading', { name: 'Review every row' })).toBeVisible();
});

test('import review keeps legacy practice explicit and remains contained on a phone', async ({ page }) => {
  await account(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/import');
  await page.locator('input[type="file"]').setInputFiles({ name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from('Title,Organization,Status,Genre\nA private call,An organization,Saved,Poetry\n') });
  await page.getByRole('button', { name: 'Review columns' }).click();
  await page.getByRole('button', { name: 'Review rows' }).click();
  await expect(page.getByText('Review “Poetry”')).toBeVisible();
  await expect(page.getByText('A canonical term is available, but you must confirm it.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review exact changes' })).toBeDisabled();
  await page.getByRole('button', { name: /Discipline Poetry/ }).click();
  await expect(page.getByRole('button', { name: 'Review exact changes' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/tracker-import-option-02-mobile.png', fullPage: true });
});

test('import review requires an explicit reading for an ambiguous date', async ({ page }) => {
  await account(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/import');
  await page.locator('input[type="file"]').setInputFiles({ name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from('Title,Organization,Status,Deadline\nA private call,An organization,Saved,01/02/2026\n') });
  await page.getByRole('button', { name: 'Review columns' }).click();
  await page.getByRole('button', { name: 'Review rows' }).click();
  await expect(page.getByText('How should Missa read the imported date?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review exact changes' })).toBeDisabled();
  await page.getByRole('button', { name: 'Day / month / year' }).click();
  await expect(page.getByRole('button', { name: 'Review exact changes' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});
