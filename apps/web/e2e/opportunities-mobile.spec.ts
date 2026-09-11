import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('signed-in Opportunity browse uses the creator rail at wide widths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/opportunities?sort=recently-added');
  const anonymousResults = await page.locator('article a[aria-label^="View "]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  const login = await page.request.post('/api/auth/login', { data: { email: 'ada@example.com', password: 'poetry-and-fiction' } });
  expect(login.ok()).toBeTruthy();
  await page.goto('/opportunities?sort=recently-added');
  expect(await page.locator('article a[aria-label^="View "]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(anonymousResults);
  const navigation = page.getByRole('navigation', { name: 'Creator navigation' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Opportunities' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('mobile Profile uses compact navigation and a canonical opportunity detail page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const login = await page.request.post('/api/auth/login', { data: { email: 'ada@example.com', password: 'poetry-and-fiction' } });
  expect(login.ok()).toBeTruthy();

  await page.goto('/opportunities?selected=none');
  expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('navigation', { name: 'Creator navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  const detailHref = await page.locator('article a[aria-label^="View "]').first().getAttribute('href');
  expect(detailHref).toMatch(/^\/opportunities\/[^/?#]+$/);
  await page.goto(detailHref!);
  await expect(page).toHaveURL(/\/opportunities\/[^/?#]+$/);
  await expect(page.getByRole('link', { name: 'Back to opportunities' })).toBeVisible();
  await expect(page.getByRole('article').getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});
