import { expect, test } from '@playwright/test';

test('authenticated pages preserve the exact return path through login', async ({ page }) => {
  await page.goto('/tracker?view=submissions');

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  const destination = new URL(page.url());
  expect(destination.pathname).toBe('/login');
  expect(destination.searchParams.get('next')).toBe('/tracker?view=submissions');
});

test('people can create an account, recover from a bad login, and log in', async ({ page }) => {
  const email = `auth-${Date.now()}@example.com`;

  await page.goto('/signup?next=/opportunities');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

  await page.getByLabel('Given name').fill('Alex');
  await page.getByLabel('Family name').fill('Morgan');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Use at least 8 characters for your password.' })).toBeVisible();

  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Find your next opportunity.' })).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
    .toBe('/opportunities');

  await page.request.post('/api/auth/logout');
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password' })).toBeVisible();

  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Find your next opportunity.' })).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
    .toBe('/opportunities');
});
