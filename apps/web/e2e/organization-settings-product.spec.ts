import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function ownerFixture(page: Page) {
  expect((await page.request.post('/api/auth/login', { data: { email: 'editor@northriverreview.org', password: 'north-river-editor' } })).status()).toBe(200);
  const me = await (await page.request.get('/api/auth/me')).json() as { memberships: Array<{ organizationId: string }> };
  return me.memberships[0]!.organizationId;
}

test('Control centre exposes current settings truth without unsafe mutations', async ({ page }) => {
  const organizationId = await ownerFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/organization/${organizationId}/settings?section=billing`);
  await expect(page.getByRole('heading', { name: 'Settings & billing', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Missa plan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Submission-fee payouts' })).toBeVisible();
  await expect(page.getByText('Commercial actions stay withheld')).toBeVisible();
  await expect(page.getByText('Plan and payouts remain separate')).toBeVisible();
  await expect(page.getByRole('button', { name: /upgrade|checkout|cancel|delete|connect payouts|save/iu })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/customerId|subscriptionId|stripeConnectAccountId|source confidence|freshness/iu);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/organization-settings-product-mobile.png', fullPage: true });

  await page.goto(`/organization/${organizationId}/settings?section=security`);
  await expect(page.getByRole('heading', { name: 'Organization security policy is not represented yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: /enable|enforce|save/iu })).toHaveCount(0);
});

test('foreign Organization Settings URLs reveal nothing', async ({ page }) => {
  await ownerFixture(page);
  const response = await page.goto('/organization/foreign-organization/settings');
  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText('Missa plan');
});
