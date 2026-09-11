import { test, expect } from '@playwright/test';

test('preview initializes when HTTP does not expose randomUUID', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, writable: true, configurable: true });
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /hydrat|didn't match/i.test(message.text())) errors.push(message.text()); });
  await page.goto('/design-system/discovery-journey/home');
  await expect(page.getByRole('heading', { name: 'Opportunities and grants for every creator' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Review sequence' }).getByRole('link', { name: 'Signup', exact: true }).click();
  await expect(page.locator('#email')).toBeVisible();
  const ids = await page.evaluate(() => [crypto.randomUUID(), crypto.randomUUID()]);
  expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(ids[0]).not.toBe(ids[1]);
  await page.goto('/design-system/discovery-journey/directory');
  await expect(page.locator('a[data-slot="pagination-link"]').last()).toBeAttached();
  expect(errors).toEqual([]);
});
