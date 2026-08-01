import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('mobile Passport uses a compact nav and a full-screen opportunity detail sheet', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', { data: { email: 'ada@example.com', password: 'poetry-and-fiction' } });
  expect(login.ok()).toBeTruthy();

  await page.goto('/opportunities?selected=none');
  expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();

  await page.locator('article a').first().click();
  await expect(page.getByLabel('Close opportunity details')).toBeVisible();
  await expect(page.locator('aside')).toHaveCSS('position', 'fixed');
  await expect(page.locator('aside')).toHaveCSS('width', '390px');
});
