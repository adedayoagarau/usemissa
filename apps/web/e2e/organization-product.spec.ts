import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function organizationSession(page: Page) {
  const login = await page.request.post('/api/auth/login', { data: { email: 'editor@northriverreview.org', password: 'north-river-editor' } });
  expect(login.status()).toBe(200);
  const body = await (await page.request.get('/api/auth/me')).json() as { memberships: Array<{ organizationId: string; role: string }> };
  const membership = body.memberships[0];
  expect(membership?.organizationId).toBeTruthy();
  return membership!;
}

test('Organization chooser states role before tenant entry', async ({ page }) => {
  const membership = await organizationSession(page);
  await page.goto('/organization');
  await expect(page.getByRole('heading', { name: 'Choose an Organization' })).toBeVisible();
  await expect(page.getByText(/Admin|Owner|Member|Program manager/u).first()).toBeVisible();
  await expect(page.locator('main')).not.toContainText(membership.organizationId);
  await expect(page.getByRole('link', { name: /Enter/u })).toBeVisible();
});

test('Organization overview keeps scope, role, and exact actions visible', async ({ page }) => {
  const membership = await organizationSession(page);
  await page.goto(`/organization/${encodeURIComponent(membership.organizationId)}/overview`);
  await expect(page.getByText('Current Organization')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Organization destinations' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(membership.organizationId);
  await page.getByRole('button', { name: 'Search Organization' }).click();
  await expect(page.getByRole('dialog', { name: 'Open a destination' })).toBeVisible();
  await page.getByPlaceholder('Search destinations').fill('not-a-destination');
  await expect(page.getByText('No destinations match “not-a-destination”.')).toBeVisible();
  await page.getByRole('button', { name: 'Close Organization search' }).click();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('Organization context remains usable on a phone and foreign IDs reveal nothing', async ({ page }) => {
  const membership = await organizationSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/organization/${encodeURIComponent(membership.organizationId)}/overview`);
  await expect(page.getByRole('button', { name: 'Open Organization navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Organization navigation' }).click();
  await expect(page.getByLabel('Switch Organization')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: 'outputs/organization-product-overview-mobile.png', fullPage: true });
  const response = await page.goto('/organization/foreign-organization/overview');
  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText(/North River Review/iu);
});
