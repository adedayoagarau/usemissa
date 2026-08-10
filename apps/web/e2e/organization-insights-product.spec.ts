import { expect, request as playwrightRequest, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function insightsFixture(page: Page, baseURL: string | undefined) {
  expect((await page.request.post('/api/auth/login', { data: { email: 'editor@northriverreview.org', password: 'north-river-editor' } })).status()).toBe(200);
  const me = await (await page.request.get('/api/auth/me')).json() as { memberships: Array<{ organizationId: string }> };
  const organizationId = me.memberships[0]!.organizationId;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const team = await (await page.request.post(`/api/orgs/${organizationId}/teams`, { data: { name: `Insights Team ${suffix}` } })).json() as { id: string };
  const program = await (await page.request.post(`/api/orgs/${organizationId}/teams/${team.id}/programs`, { data: { name: `Insights Program ${suffix}` } })).json() as { id: string };
  const opportunity = await (await page.request.post(`/api/orgs/${organizationId}/open-calls`, { data: { programId: program.id, title: `Two Work Insights Prize ${suffix}` } })).json() as { id: string; title: string };
  const form = await (await page.request.post(`/api/orgs/${organizationId}/open-calls/${opportunity.id}/submission-paths`, { data: { categories: ['Poetry'], fields: [] } })).json() as { id: string };
  expect((await page.request.post(`/api/orgs/${organizationId}/open-calls/${opportunity.id}/publish`)).status()).toBe(200);
  const submitter = await playwrightRequest.newContext({ baseURL });
  expect((await submitter.post('/api/auth/signup', { data: { email: `insights-${suffix}@example.com`, password: 'correct-horse-battery', displayName: 'Insights Submitter' } })).status()).toBe(201);
  const submitted = await (await submitter.post(`/api/submission-paths/${form.id}/submit`, { data: { category: 'Poetry', answers: {}, works: [{ title: `River Maps ${suffix}` }, { title: `Returning City ${suffix}` }] }, headers: { 'Idempotency-Key': `insights-${suffix}` } })).json() as { works: Array<{ id: string }> };
  expect((await page.request.post(`/api/orgs/${organizationId}/works/${submitted.works[0]!.id}/decision`, { data: { outcome: 'accepted' } })).status()).toBe(200);
  expect((await page.request.post(`/api/orgs/${organizationId}/works/${submitted.works[1]!.id}/decision`, { data: { outcome: 'declined' } })).status()).toBe(200);
  await submitter.dispose();
  return { organizationId, programId: program.id, opportunityId: opportunity.id, opportunityTitle: opportunity.title };
}

test('Program lens keeps grains, formulas, and unavailable analysis explicit on a phone', async ({ page, baseURL }) => {
  const fixture = await insightsFixture(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/organization/${fixture.organizationId}/insights?program=${fixture.programId}&opportunity=${fixture.opportunityId}&facet=discipline`);
  await expect(page.getByRole('heading', { name: 'Insights', level: 1 })).toBeVisible();
  await expect(page.getByText('Decided Works coverage', { exact: true })).toBeVisible();
  await expect(page.getByText('2 of 2 current Works')).toBeVisible();
  await expect(page.getByText('Accepted among decided', { exact: true })).toBeVisible();
  await expect(page.getByText('50%')).toBeVisible();
  await expect(page.getByText('Date-range comparison and monthly trend stay unavailable until the Organization has a timezone.')).toBeVisible();
  await expect(page.getByRole('heading', { name: fixture.opportunityTitle })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/conversion|freshness|confidence|worker|provider/iu);
  await expect(page.getByLabel('Practice facet').locator('option')).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/organization-insights-product-mobile.png', fullPage: true });
});

test('foreign Organization Insights URLs reveal nothing', async ({ page, baseURL }) => {
  const fixture = await insightsFixture(page, baseURL);
  const response = await page.goto('/organization/foreign-organization/insights');
  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText(fixture.opportunityTitle);
});
