import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function hostedFixture(page: Page) {
  expect((await page.request.post('/api/auth/login', { data: { email: 'editor@northriverreview.org', password: 'north-river-editor' } })).status()).toBe(200);
  const me = await (await page.request.get('/api/auth/me')).json() as { memberships: Array<{ organizationId: string }> };
  const organizationId = me.memberships[0]!.organizationId;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const team = await (await page.request.post(`/api/orgs/${organizationId}/teams`, { data: { name: `Hosted Team ${suffix}` } })).json() as { id: string };
  const program = await (await page.request.post(`/api/orgs/${organizationId}/teams/${team.id}/programs`, { data: { name: `Hosted Program ${suffix}` } })).json() as { id: string };
  const call = await (await page.request.post(`/api/orgs/${organizationId}/open-calls`, { data: { programId: program.id, title: `Hosted Fellowship ${suffix}`, guidelineText: 'Submit one titled Work and answer the project question.' } })).json() as { id: string; title: string };
  const pathResponse = await page.request.post(`/api/orgs/${organizationId}/open-calls/${call.id}/submission-paths`, { data: { categories: ['Writing', 'Film'], fields: [{ type: 'text', label: 'Project statement', required: true }, { type: 'file-upload', label: 'Supporting file', required: false }] } });
  expect(pathResponse.status()).toBe(201);
  expect((await page.request.post(`/api/orgs/${organizationId}/open-calls/${call.id}/publish`)).status()).toBe(200);
  return { organizationId, callId: call.id, title: call.title };
}

test('Application desk preserves the current form while naming missing review contracts', async ({ page }) => {
  const fixture = await hostedFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/org/${fixture.organizationId}/${fixture.callId}#application`);
  await expect(page.getByRole('heading', { name: fixture.title, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Application desk' })).toBeVisible();
  await expect(page.getByText('Current form, not the complete target experience')).toBeVisible();
  await expect(page.getByText('Review', { exact: true })).toBeVisible();
  await expect(page.getByText(/recipient-visible Review step/iu).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Works — At least one required' })).toBeVisible();
  await expect(page.getByLabel('Project statement — Required')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit application' })).toBeVisible();
  await expect(page.getByText('Media not provided')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/source confidence|freshness|worker status|provider identifier|blob path|scan engine/iu);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/hosted-application-product-mobile.png', fullPage: true });
});

test('signed-out application intent returns to the exact application section', async ({ page }) => {
  const fixture = await hostedFixture(page);
  await page.context().clearCookies();
  await page.goto(`/org/${fixture.organizationId}/${fixture.callId}#application`);
  const login = page.getByRole('link', { name: 'Log in and return' });
  await expect(login).toBeVisible();
  await expect(login).toHaveAttribute('href', new RegExp(`next=.*org.*${fixture.callId}.*application`));
  await expect(page.getByRole('button', { name: 'Submit application' })).toHaveCount(0);
});

test('unknown hosted Opportunity routes return 404', async ({ page }) => {
  const fixture = await hostedFixture(page);
  const response = await page.goto(`/org/${fixture.organizationId}/foreign-call`);
  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText(fixture.title);
});
