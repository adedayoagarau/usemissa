import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('canonical Opportunities browse', () => {
  test('is public and exposes only customer-safe source attribution', async ({ page, request }) => {
    const response = await page.goto('/opportunities');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Opportunities' })).toBeVisible();
    await expect(page.locator('article')).toHaveCount(5);
    await expect(page.getByText(/Fresh source|Recently checked|Source confidence|Last successful check/i)).toHaveCount(0);

    const apiResponse = await request.get('/api/opportunities?limit=1');
    expect(apiResponse.ok()).toBeTruthy();
    const payload = await apiResponse.json() as { items: Array<{ source: Record<string, unknown> }> };
    expect(Object.keys(payload.items[0]?.source ?? {}).sort()).toEqual(['kind', 'name', 'url']);
  });

  test('uses the selected catalogue at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/opportunities');
    await expect(page.getByRole('heading', { level: 2, name: 'Search filters' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Opportunity type' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Field' })).toBeVisible();
    await expect(page.getByLabel('Sort by')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  });

  test('uses a mobile filter sheet and remains accessible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/opportunities');
    await expect(page.getByRole('heading', { level: 2, name: 'Search filters' })).toBeHidden();
    await page.getByRole('button', { name: /^Filters/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Filter opportunities' })).toBeVisible();
    await expect(page.getByRole('dialog').getByText('More field filters')).toBeVisible();
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  });
});

test.describe('canonical Opportunity detail', () => {
  const slug = 'north-river-review-call-for-submissions';

  test('is public, canonical, and contains no operational evidence copy', async ({ page }) => {
    const response = await page.goto(`/opportunities/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'North River Review — Call for Submissions' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Official source' }).first()).toBeVisible();
    await expect(page.getByText(/Fresh source|Recently checked|Source confidence|Last successful check|organization confirmed/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Sign in to save/ })).toBeVisible();
  });

  test('redirects the legacy discover URL to the canonical detail', async ({ page }) => {
    await page.goto(`/discover/opportunities/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/opportunities/${slug}$`));
  });

  test('is responsive and accessible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/opportunities/${slug}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  });
});

test.describe('Save-to-Tracker authentication return', () => {
  const slug = 'north-river-review-call-for-submissions';

  test('returns to the same Opportunity and completes the typed save intent', async ({ page }) => {
    await page.goto(`/opportunities/${slug}`);
    await page.getByRole('button', { name: /Sign in to save/ }).click();
    await expect(page).toHaveURL(/\/login\?next=.*north-river-review.*intent=save/);

    await page.getByLabel('Email address').fill('ada@example.com');
    await page.getByLabel('Password', { exact: true }).fill('poetry-and-fiction');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(new RegExp(`/opportunities/${slug}$`));
    await expect(page.getByRole('button', { name: 'In Tracker' })).toBeVisible();
  });

  test('drops malformed auth intents while preserving a safe return path', async ({ page }) => {
    await page.goto(`/login?next=${encodeURIComponent(`/opportunities/${slug}`)}&intent=${encodeURIComponent('save://example.com')}`);
    const signupHref = await page.getByRole('link', { name: 'Create an account' }).getAttribute('href');
    expect(signupHref).toContain(`next=${encodeURIComponent(`/opportunities/${slug}`)}`);
    expect(signupHref).not.toContain('intent=');
  });
});
