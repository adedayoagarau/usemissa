import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function publishedOrganizationFixture(page: Page) {
  expect((await page.request.post('/api/auth/login', { data: { email: 'editor@northriverreview.org', password: 'north-river-editor' } })).status()).toBe(200);
  const me = await (await page.request.get('/api/auth/me')).json() as { memberships: Array<{ organizationId: string }> };
  const organizationId = me.memberships[0]!.organizationId;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const team = await (await page.request.post(`/api/orgs/${organizationId}/teams`, { data: { name: `Public Team ${suffix}` } })).json() as { id: string };
  const program = await (await page.request.post(`/api/orgs/${organizationId}/teams/${team.id}/programs`, { data: { name: `Private Program ${suffix}` } })).json() as { id: string };
  const callResponse = await page.request.post(`/api/orgs/${organizationId}/open-calls`, { data: { programId: program.id, title: `Public Fellowship ${suffix}` } });
  expect(callResponse.status()).toBe(201);
  const call = await callResponse.json() as { id: string; title: string };
  expect((await page.request.post(`/api/orgs/${organizationId}/open-calls/${call.id}/submission-paths`, { data: { categories: ['Writing'], fields: [] } })).status()).toBe(201);
  expect((await page.request.post(`/api/orgs/${organizationId}/open-calls/${call.id}/publish`)).status()).toBe(200);
  await page.context().clearCookies();
  return { organizationId, title: call.title, privateProgram: `Private Program ${suffix}` };
}

test('Opportunity-first public profile exposes allowlisted published facts only', async ({ page }) => {
  const fixture = await publishedOrganizationFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/org/${fixture.organizationId}`);
  await expect(page.getByRole('heading', { name: 'Published Opportunities' })).toBeVisible();
  const card = page.getByRole('heading', { name: fixture.title }).locator('xpath=ancestor::article');
  await expect(card).toBeVisible();
  await expect(card.getByText('Hosted application')).toBeVisible();
  await expect(card.getByText('Media not provided')).toBeVisible();
  await expect(card.getByText('Deadline not linked')).toBeVisible();
  await expect(card.getByText('Fee not stated')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(fixture.privateProgram);
  await expect(page.locator('body')).not.toContainText(/billing status|seat count|member list|review queue|decision queue|payout balance|source confidence|freshness|worker status|provider identifier/iu);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/public-organization-product-mobile.png', fullPage: true });
});

test('unknown public Organization profiles return 404', async ({ page }) => {
  const response = await page.goto('/org/foreign-organization');
  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText('Published Opportunities');
});
