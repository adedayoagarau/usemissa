import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function createOpportunityFixture(page: Page) {
  const login = await page.request.post('/api/auth/login', { data: { email: 'editor@northriverreview.org', password: 'north-river-editor' } });
  expect(login.status()).toBe(200);
  const me = await (await page.request.get('/api/auth/me')).json() as { memberships: Array<{ organizationId: string; role: string }> };
  const organizationId = me.memberships[0]!.organizationId;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const teamResponse = await page.request.post(`/api/orgs/${organizationId}/teams`, { data: { name: `Editorial ${suffix}` } });
  expect(teamResponse.status()).toBe(201);
  const team = await teamResponse.json() as { id: string };
  const programResponse = await page.request.post(`/api/orgs/${organizationId}/teams/${team.id}/programs`, { data: { name: `Annual Awards ${suffix}` } });
  expect(programResponse.status()).toBe(201);
  const program = await programResponse.json() as { id: string };
  const opportunityResponse = await page.request.post(`/api/orgs/${organizationId}/open-calls`, { data: { programId: program.id, title: `New Voices Prize ${suffix}` } });
  expect(opportunityResponse.status()).toBe(201);
  const opportunity = await opportunityResponse.json() as { id: string; title: string };
  return { organizationId, programName: `Annual Awards ${suffix}`, title: opportunity.title, opportunityId: opportunity.id };
}

test('Option 2 presents the real Organization portfolio as a Program ledger', async ({ page }) => {
  const fixture = await createOpportunityFixture(page);
  await page.goto(`/organization/${fixture.organizationId}/opportunities`);
  await expect(page.getByRole('heading', { name: 'Opportunities', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: fixture.programName })).toBeVisible();
  await expect(page.getByRole('heading', { name: fixture.title })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(fixture.organizationId);
  await page.getByLabel('Lifecycle').selectOption('draft');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/status=draft/);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('Opportunity detail exposes the horizontal builder without unsafe publication controls', async ({ page }) => {
  const fixture = await createOpportunityFixture(page);
  await page.goto(`/organization/${fixture.organizationId}/opportunities/${fixture.opportunityId}`);
  await expect(page.getByRole('heading', { name: fixture.title })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Opportunity builder sections' })).toBeVisible();
  await page.getByRole('button', { name: 'Dates' }).click();
  await expect(page.getByRole('heading', { name: 'Dates are not represented safely yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Review and publish' }).click();
  await expect(page.getByRole('heading', { name: 'Publication is blocked in this screen' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Publish|Close|Reopen/u })).toHaveCount(0);
});

test('Program ledger remains composed on a phone and foreign records reveal nothing', async ({ page }) => {
  const fixture = await createOpportunityFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/organization/${fixture.organizationId}/opportunities`);
  await expect(page.getByRole('heading', { name: fixture.programName })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: 'outputs/organization-opportunities-product-mobile.png', fullPage: true });
  const response = await page.goto(`/organization/${fixture.organizationId}/opportunities/foreign-opportunity`);
  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText(fixture.title);
});
