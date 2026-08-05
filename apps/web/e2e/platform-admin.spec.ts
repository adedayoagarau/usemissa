import { expect, test } from '@playwright/test';

test('admin can open the control room and operational loop', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    data: { email: 'admin@missa.dev', password: 'radar-admin-seed' },
  });
  expect(login.status()).toBe(200);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Control Room' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Operations', exact: true })).toBeVisible();

  await page.goto('/admin/operations');
  await expect(page.getByRole('heading', { name: 'Operations', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run bounded Radar tick' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Roles and handoff loop' })).toBeVisible();
});
