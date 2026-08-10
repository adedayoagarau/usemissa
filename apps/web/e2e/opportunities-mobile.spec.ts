import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('mobile Profile uses compact navigation and a canonical opportunity detail page', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', { data: { email: 'ada@example.com', password: 'poetry-and-fiction' } });
  expect(login.ok()).toBeTruthy();

  await page.goto('/opportunities?selected=none');
  expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();

  await page.locator('article a').first().click();
  await expect(page).toHaveURL(/\/opportunities\/[^/?#]+$/);
  await expect(page.getByRole('link', { name: 'Back to opportunities' })).toBeVisible();
  await expect(page.getByRole('article').getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});
