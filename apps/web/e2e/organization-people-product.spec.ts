import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function peopleFixture(page: Page) {
  expect((await page.request.post('/api/auth/login', { data: { email: 'editor@northriverreview.org', password: 'north-river-editor' } })).status()).toBe(200);
  const me = await (await page.request.get('/api/auth/me')).json() as { account: { email: string }; memberships: Array<{ organizationId: string }> };
  const organizationId = me.memberships[0]!.organizationId;
  return { organizationId, email: me.account.email };
}

test('Access dossier exposes current truth without unsafe access mutations', async ({ page }) => {
  const fixture = await peopleFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/organization/${fixture.organizationId}/people?q=${encodeURIComponent(fixture.email)}`);
  await expect(page.getByRole('heading', { name: 'People', level: 1 })).toBeVisible();
  await expect(page.getByText(fixture.email).first()).toBeVisible();
  await expect(page.getByText('Access changes stay withheld')).toBeVisible();
  await expect(page.getByText('Compatibility membership seat')).toBeVisible();
  await expect(page.getByText('Not a capability registry')).toBeVisible();
  await expect(page.getByRole('button', { name: /invite|remove|change role|transfer/iu })).toHaveCount(0);
  await expect(page.locator('select[aria-label^="Role for"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/presence|online now|taxonomy expertise/iu);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/organization-people-product-mobile.png', fullPage: true });
});

test('foreign Organization People URLs reveal nothing', async ({ page }) => {
  const fixture = await peopleFixture(page);
  const response = await page.goto('/organization/foreign-organization/people');
  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText(fixture.email);
});
