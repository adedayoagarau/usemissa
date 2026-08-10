import { expect, test } from '@playwright/test';

test('organization shell preserves scope across workflow pages', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    data: { email: 'editor@northriverreview.org', password: 'north-river-editor' },
  });
  expect(login.status()).toBe(200);
  const session = await page.request.get('/api/auth/me');
  expect(session.status()).toBe(200);
  const body = await session.json() as { memberships: Array<{ organizationId: string }> };
  const organizationId = body.memberships[0]?.organizationId;
  expect(organizationId).toBeTruthy();

  await page.goto('/workspace');
  await expect(page.getByRole('complementary', { name: 'Organization navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Decisions', exact: true })).toBeVisible();

  await page.goto(`/workspace/messages?organizationId=${encodeURIComponent(organizationId!)}`);
  await expect(page.getByRole('heading', { name: 'Messages', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Decision-email activity', exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/workspace/delivery?organizationId=${encodeURIComponent(organizationId!)}`);
  await expect(page.getByRole('heading', { name: 'Delivery', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});
