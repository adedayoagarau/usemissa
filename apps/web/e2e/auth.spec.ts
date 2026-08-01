import { expect, test } from '@playwright/test';

test('people can create an account, recover from a bad login, and log in', async ({ page }) => {
  const email = `auth-${Date.now()}@example.com`;

  await page.goto('/signup?next=/opportunities');
  await expect(page.getByRole('heading', { name: 'Start your Passport.' })).toBeVisible();

  await page.getByLabel('Your name').fill('Alex Morgan');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByLabel('Confirm password').fill('short');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText('Use at least 8 characters for your password.');

  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByLabel('Confirm password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/opportunities$/);

  await page.request.post('/api/auth/logout');
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText('Invalid email or password');

  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/opportunities$/);
});
