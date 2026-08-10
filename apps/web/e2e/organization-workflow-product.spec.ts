import { expect, request as playwrightRequest, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function workflowFixture(page: Page, baseURL: string | undefined) {
  expect((await page.request.post('/api/auth/login', { data: { email: 'editor@northriverreview.org', password: 'north-river-editor' } })).status()).toBe(200);
  const me = await (await page.request.get('/api/auth/me')).json() as { account: { id: string }; memberships: Array<{ organizationId: string }> };
  const organizationId = me.memberships[0]!.organizationId;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const team = await (await page.request.post(`/api/orgs/${organizationId}/teams`, { data: { name: `Workflow Team ${suffix}` } })).json() as { id: string };
  const program = await (await page.request.post(`/api/orgs/${organizationId}/teams/${team.id}/programs`, { data: { name: `Workflow Program ${suffix}` } })).json() as { id: string };
  const opportunityResponse = await page.request.post(`/api/orgs/${organizationId}/open-calls`, { data: { programId: program.id, title: `Two Work Prize ${suffix}` } });
  expect(opportunityResponse.status()).toBe(201);
  const opportunity = await opportunityResponse.json() as { id: string; title: string };
  const formResponse = await page.request.post(`/api/orgs/${organizationId}/open-calls/${opportunity.id}/submission-paths`, { data: { categories: ['Poetry'], fields: [{ type: 'text', label: 'Project note', required: true }] } });
  expect(formResponse.status()).toBe(201);
  const form = await formResponse.json() as { id: string; fields: Array<{ id: string }> };
  expect((await page.request.post(`/api/orgs/${organizationId}/open-calls/${opportunity.id}/publish`)).status()).toBe(200);
  const submitter = await playwrightRequest.newContext({ baseURL });
  const email = `workflow-${suffix}@example.com`;
  expect((await submitter.post('/api/auth/signup', { data: { email, password: 'correct-horse-battery', displayName: 'Workflow Submitter' } })).status()).toBe(201);
  const submissionResponse = await submitter.post(`/api/submission-paths/${form.id}/submit`, { data: { category: 'Poetry', answers: { [form.fields[0]!.id]: 'A short project note.' }, works: [{ title: `River Maps ${suffix}` }, { title: `Returning City ${suffix}` }] }, headers: { 'Idempotency-Key': `workflow-${suffix}` } });
  expect(submissionResponse.status()).toBe(201);
  const submitted = await submissionResponse.json() as { submission: { id: string }; works: Array<{ id: string; title: string }> };
  const round = await (await page.request.post(`/api/orgs/${organizationId}/open-calls/${opportunity.id}/review-rounds`, { data: { name: `Reader Round ${suffix}` } })).json() as { id: string };
  const assignmentResponse = await page.request.post(`/api/orgs/${organizationId}/review-rounds/${round.id}/assign`, { data: { submissionId: submitted.submission.id, reviewerAccountId: me.account.id } });
  expect(assignmentResponse.status()).toBe(201);
  expect((await page.request.post(`/api/orgs/${organizationId}/works/${submitted.works[0]!.id}/decision`, { data: { outcome: 'accepted' } })).status()).toBe(200);
  await submitter.dispose();
  return { organizationId, submissionId: submitted.submission.id, opportunityTitle: opportunity.title, firstWork: submitted.works[0]!.title, secondWork: submitted.works[1]!.title, roundName: `Reader Round ${suffix}` };
}

test('Submission queue and dossier preserve independent lifecycle lanes and multiple Works', async ({ page, baseURL }) => {
  const fixture = await workflowFixture(page, baseURL);
  await page.goto(`/organization/${fixture.organizationId}/submissions?q=${encodeURIComponent(fixture.firstWork)}`);
  await expect(page.getByRole('heading', { name: 'Submissions', level: 1 })).toBeVisible();
  await expect(page.getByText('Workflow Submitter').first()).toBeVisible();
  await expect(page.locator('dd').filter({ hasText: 'Partially accepted' }).first()).toBeVisible();
  await expect(page.locator('dd').filter({ hasText: 'In review' }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(fixture.organizationId);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.getByRole('link', { name: 'Open full dossier' }).click();
  await page.getByRole('link', { name: 'Works' }).click();
  await expect(page.getByRole('heading', { name: fixture.firstWork })).toBeVisible();
  await expect(page.getByRole('heading', { name: fixture.secondWork })).toBeVisible();
  await expect(page.getByText('accepted', { exact: true })).toBeVisible();
  await expect(page.getByText('No decision', { exact: true })).toBeVisible();
});

test('Review operations show evidence without unsafe assignment controls', async ({ page, baseURL }) => {
  const fixture = await workflowFixture(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/organization/${fixture.organizationId}/reviews`);
  await expect(page.getByRole('heading', { name: 'Reviews', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: fixture.roundName })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Assignment controls held back' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Assign reviewer/u })).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: 'outputs/organization-reviews-product-mobile.png', fullPage: true });
});

test('Decision desk stays per Work and has no immediate-final mutation', async ({ page, baseURL }) => {
  const fixture = await workflowFixture(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/organization/${fixture.organizationId}/decisions`);
  await expect(page.getByRole('heading', { name: 'Decisions', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: fixture.firstWork })).toBeVisible();
  await expect(page.getByRole('heading', { name: fixture.secondWork })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Decision controls held back' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Accept|Decline|Waitlist|Finalize/u })).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: 'outputs/organization-decisions-product-mobile.png', fullPage: true });
});

test('Organization workflow composes on a phone and foreign dossier IDs reveal nothing', async ({ page, baseURL }) => {
  const fixture = await workflowFixture(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/organization/${fixture.organizationId}/submissions`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: 'outputs/organization-submissions-product-mobile.png', fullPage: true });
  const response = await page.goto(`/organization/${fixture.organizationId}/submissions/foreign-submission`);
  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText(fixture.opportunityTitle);
});
