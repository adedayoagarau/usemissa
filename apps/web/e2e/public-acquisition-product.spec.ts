import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const bannedPublicCopy = /source snapshot|next refresh|freshness signal|profile completeness|\bverified\b/iu;

test('public Home leads with useful Opportunities and no operational theatre', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Find the call worth your time.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open something useful now' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse Opportunities' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(bannedPublicCopy);
  await expect(page.locator('img[src*="/media/home/"]')).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('selected public pages keep evidence language customer-safe', async ({ page }) => {
  for (const path of ['/about', '/methodology', '/guides', '/guides/find-submission-opportunities', '/discover/grants']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main')).not.toContainText(bannedPublicCopy);
    await expect(page.getByRole('link', { name: 'Missa home' })).toBeVisible();
  }
  await page.goto('/methodology');
  await expect(page.getByRole('heading', { name: 'Facts are not scores.' })).toBeVisible();
  await expect(page.getByText('Publication is not a guarantee')).toBeVisible();
});

test('For Organizations distinguishes available, limited, and planned capability', async ({ page }) => {
  await page.goto('/for-organizations');
  await expect(page.getByRole('heading', { name: 'Run the whole Opportunity without losing the individual Work.' })).toBeVisible();
  await expect(page.getByText('Available', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Limited', { exact: true })).toHaveCount(4);
  await expect(page.getByText('Planned', { exact: true })).toHaveCount(1);
  await expect(page.locator('main')).not.toContainText(/132 submissions|emails queued|Northline Arts Foundation/iu);
});

test('retired waitlist preserves bounded campaign attribution and opens signup', async ({ page }) => {
  await page.goto('/waitlist?utm_source=bedside&utm_campaign=public-redesign&secret=drop-me');
  await expect(page).toHaveURL(/\/signup\?utm_source=bedside&utm_campaign=public-redesign$/u);
  await expect(page.getByRole('heading', { name: /Create|Sign up|Join/u })).toBeVisible();
  expect(page.url()).not.toContain('secret=');
});

test('public system reflows cleanly at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/methodology', '/guides', '/discover/residencies', '/for-organizations']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${path} overflowed`).toBeTruthy();
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
  }
  await page.goto('/');
  await page.screenshot({ path: 'outputs/public-product-home-mobile.png', fullPage: true });
});
