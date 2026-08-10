import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function organizationSession(page: Page) {
  expect((await page.request.post('/api/auth/login', { data: { email: 'editor@northriverreview.org', password: 'north-river-editor' } })).status()).toBe(200);
  const me = await (await page.request.get('/api/auth/me')).json() as { memberships: Array<{ organizationId: string }> };
  return me.memberships[0]!.organizationId;
}

test('Messages distinguishes absent correspondence from Decisions on a phone', async ({ page }) => {
  const organizationId = await organizationSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/organization/${organizationId}/messages`);
  await expect(page.getByRole('heading', { name: 'Messages', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No durable correspondence yet' })).toBeVisible();
  await expect(page.getByText('a Decision is not a Message')).toBeVisible();
  await expect(page.getByRole('button', { name: /send|retry/iu })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('Delivery begins only with accepted Work and withholds unsafe completion controls', async ({ page }) => {
  const organizationId = await organizationSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/organization/${organizationId}/delivery`);
  await expect(page.getByRole('heading', { name: 'Delivery', level: 1 })).toBeVisible();
  const empty = page.getByRole('heading', { name: 'No accepted Work is ready for Delivery' });
  if (await empty.count()) {
    await expect(empty).toBeVisible();
  } else {
    await expect(page.getByRole('heading', { name: 'Accepted Works' })).toBeVisible();
    await expect(page.locator('dd').filter({ hasText: /^Accepted/ }).first()).toBeVisible();
  }
  await expect(page.getByRole('button', { name: /complete|set up|assign/iu })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('foreign Messages and Delivery routes reveal nothing', async ({ page }) => {
  await organizationSession(page);
  expect((await page.goto('/organization/foreign-organization/messages'))?.status()).toBe(404);
  expect((await page.goto('/organization/foreign-organization/delivery'))?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText('North River Review');
});
