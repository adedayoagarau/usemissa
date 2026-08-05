import { expect, test } from '@playwright/test';

test('admin can open the control room and operational loop', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    data: { email: 'admin@missa.dev', password: 'radar-admin-seed' },
  });
  expect(login.status()).toBe(200);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Control Room' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Operations', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Customers', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Organizations', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Content', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Analytics', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Messaging & delivery', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Support', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Governance', exact: true })).toBeVisible();

  await page.goto('/admin/customers');
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search customers' })).toBeVisible();

  await page.goto('/admin/content');
  await expect(page.getByRole('heading', { name: 'Content', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search content registry' })).toBeVisible();

  await page.goto('/admin/analytics');
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();

  await page.goto('/admin/organizations');
  await expect(page.getByRole('heading', { name: 'Organizations', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search organizations' })).toBeVisible();

  await page.goto('/admin/messaging');
  await expect(page.getByRole('heading', { name: 'Messaging & delivery', exact: true })).toBeVisible();

  await page.goto('/admin/governance');
  await expect(page.getByRole('heading', { name: 'Governance', exact: true })).toBeVisible();

  await page.goto('/admin/support');
  await expect(page.getByRole('heading', { name: 'Support cases', exact: true })).toBeVisible();

  await page.goto('/admin/operations');
  await expect(page.getByRole('heading', { name: 'Operations queue' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run bounded tick' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search operations queue' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Control Room' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open platform admin navigation' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

  await page.goto('/admin/governance');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

  await page.goto('/admin/support');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});
