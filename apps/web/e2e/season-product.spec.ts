import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const signup = await page.request.post('/api/auth/signup', { data: { email: `season-${suffix}@example.com`, password: 'correct-horse-battery', displayName: 'Season User' } });
  expect(signup.status()).toBe(201);
  const sessionCookie = signup.headers()['set-cookie']?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  expect(sessionCookie).toBeTruthy();
  await page.context().addCookies([{ name: 'missa_session', value: sessionCookie!, url: new URL(signup.url()).origin, httpOnly: true, sameSite: 'Lax' }]);
});

test('Season shows every section with calm empty states on a new account', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/season');
  await expect(page.getByRole('heading', { level: 1, name: 'Season' })).toBeVisible();
  for (const name of ['This week’s three', 'Capacity check', 'Crunch weeks', 'Fee budget', 'Coming back']) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  }
  await expect(page.getByText('Nothing due in the next seven days')).toBeVisible();
  // A new account is on Free: capacity and the full season are described, not shown.
  await expect(page.getByRole('link', { name: 'See Pro' }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('Season is in the creator navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar');
  await page.getByRole('link', { name: 'Season' }).first().click();
  await expect(page).toHaveURL(/\/season$/);
});

test('Season keeps the signed-out return path', async ({ page }) => {
  await page.request.post('/api/auth/logout');
  await page.goto('/season');
  await expect(page).toHaveURL(/\/login\?next=%2Fseason$/);
});
