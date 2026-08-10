import AxeBuilder from '@axe-core/playwright';
import { expect, request as playwrightRequest, test, type Page } from '@playwright/test';

async function reviewerFixture(page: Page, baseURL: string | undefined) {
  expect((await page.request.post('/api/auth/login', { data: { email: 'editor@northriverreview.org', password: 'north-river-editor' } })).status()).toBe(200);
  const me = await (await page.request.get('/api/auth/me')).json() as { account: { id: string }; memberships: Array<{ organizationId: string }> };
  const organizationId = me.memberships[0]!.organizationId;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const team = await (await page.request.post(`/api/orgs/${organizationId}/teams`, { data: { name: `Reviewer Team ${suffix}` } })).json() as { id: string };
  const program = await (await page.request.post(`/api/orgs/${organizationId}/teams/${team.id}/programs`, { data: { name: `Reviewer Program ${suffix}` } })).json() as { id: string };
  const opportunity = await (await page.request.post(`/api/orgs/${organizationId}/open-calls`, { data: { programId: program.id, title: `Evidence Prize ${suffix}` } })).json() as { id: string; title: string };
  const form = await (await page.request.post(`/api/orgs/${organizationId}/open-calls/${opportunity.id}/submission-paths`, { data: { categories: [], fields: [] } })).json() as { id: string };
  expect((await page.request.post(`/api/orgs/${organizationId}/open-calls/${opportunity.id}/publish`)).status()).toBe(200);

  const submitter = await playwrightRequest.newContext({ baseURL });
  const submitterEmail = `review-submit-${suffix}@example.com`;
  expect((await submitter.post('/api/auth/signup', { data: { email: submitterEmail, password: 'correct-horse-battery', displayName: `Private Submitter ${suffix}` } })).status()).toBe(201);
  const submission = await (await submitter.post(`/api/submission-paths/${form.id}/submit`, { data: { works: [{ title: `Saltwater Evidence ${suffix}` }, { title: `Night Bus Evidence ${suffix}` }] }, headers: { 'Idempotency-Key': `review-${suffix}` } })).json() as { submission: { id: string } };

  const roundName = `Reader Round ${suffix}`;
  const round = await (await page.request.post(`/api/orgs/${organizationId}/open-calls/${opportunity.id}/review-rounds`, { data: { name: roundName } })).json() as { id: string };
  const assignmentResponse = await page.request.post(`/api/orgs/${organizationId}/review-rounds/${round.id}/assign`, { data: { submissionId: submission.submission.id, reviewerAccountId: me.account.id } });
  expect(assignmentResponse.status()).toBe(201);
  const assignment = await assignmentResponse.json() as { id: string };
  await submitter.dispose();
  return { assignmentId: assignment.id, opportunityTitle: opportunity.title, roundName, submitterEmail, firstWork: `Saltwater Evidence ${suffix}`, secondWork: `Night Bus Evidence ${suffix}` };
}

test('Reviewer queue and Evidence Desk expose only assigned Work titles on mobile', async ({ page, baseURL }) => {
  const fixture = await reviewerFixture(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reviews');
  await expect(page.getByRole('heading', { name: 'Reviews', level: 1 })).toBeVisible();
  await expect(page.getByText(fixture.opportunityTitle).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(fixture.submitterEmail);
  await page.getByRole('link', { name: new RegExp(fixture.opportunityTitle) }).click();
  await expect(page.getByRole('heading', { name: fixture.firstWork })).toBeVisible();
  await expect(page.getByRole('heading', { name: fixture.secondWork })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(fixture.submitterEmail);
  await expect(page.getByRole('button', { name: /Submit|Save draft|Score|Recommend/u })).toHaveCount(0);
  await page.getByRole('button', { name: 'Review' }).click();
  await expect(page.getByRole('heading', { name: 'Review controls are not available yet' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/reviewer-evidence-desk-mobile.png', fullPage: true });
});

test('A completed fixed-score review is shown as a read-only legacy record', async ({ page, baseURL }) => {
  const fixture = await reviewerFixture(page, baseURL);
  const response = await page.request.post(`/api/reviewer/assignments/${fixture.assignmentId}/review`, { data: { score: 7, notes: 'Strong control of form.' } });
  expect(response.status()).toBe(200);
  await page.goto(`/reviews/${fixture.assignmentId}`);
  await expect(page.getByRole('heading', { name: 'Legacy recommendation submitted' })).toBeVisible();
  await expect(page.getByText('Strong control of form.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Edit|Resubmit|Submit/u })).toHaveCount(0);
});

test('A reviewer cannot discover an assignment owned by another account', async ({ page, baseURL }) => {
  const fixture = await reviewerFixture(page, baseURL);
  expect((await page.request.post('/api/auth/logout')).status()).toBe(200);
  expect((await page.request.post('/api/auth/signup', { data: { email: `unassigned-${Date.now()}@example.com`, password: 'correct-horse-battery', displayName: 'Unassigned Reviewer' } })).status()).toBe(201);
  const response = await page.goto(`/reviews/${fixture.assignmentId}`);
  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText(fixture.opportunityTitle);
  await expect(page.locator('body')).not.toContainText(fixture.firstWork);
});
