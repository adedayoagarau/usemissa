import { expect, request as playwrightRequest, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function ownerSession(page: Page) {
  expect((await page.request.post('/api/auth/login', { data: { email: 'editor@northriverreview.org', password: 'north-river-editor' } })).status()).toBe(200);
  const me = await (await page.request.get('/api/auth/me')).json() as { account: { id: string }; memberships: Array<{ organizationId: string }> };
  return { organizationId: me.memberships[0]!.organizationId, accountId: me.account.id };
}

// `next dev` compiles each route on its first request, which can outlast the default wait.
const firstCompile = 30_000;

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function expectNoSeriousAxeViolations(page: Page) {
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
}

test('Owners create a Team and Program, build a form, then publish and close an Opportunity', async ({ page }) => {
  const { organizationId } = await ownerSession(page);
  const suffix = uniqueSuffix();
  const teamName = `Poetry desk ${suffix}`;
  const programName = `Spring reading ${suffix}`;
  const title = `Harbor Prize ${suffix}`;

  await page.goto(`/organization/${organizationId}/settings?section=structure`);
  await page.getByRole('button', { name: 'Create Team' }).click();
  const teamDialog = page.getByRole('dialog', { name: 'Create a Team' });
  await teamDialog.getByLabel('Team name').fill(teamName);
  await expectNoSeriousAxeViolations(page);
  await teamDialog.getByRole('button', { name: 'Create Team' }).click();
  await expect(page.getByText(`Team “${teamName}” created`)).toBeVisible({ timeout: firstCompile });

  const teamRow = page.locator('#organization-main').getByRole('listitem').filter({ hasText: teamName });
  await teamRow.getByRole('button', { name: 'Add Program' }).click();
  const programDialog = page.getByRole('dialog', { name: `Add a Program to ${teamName}` });
  await programDialog.getByLabel('Program name').fill(programName);
  await programDialog.getByRole('button', { name: 'Add Program' }).click();
  await expect(teamRow).toContainText(programName);

  await page.goto(`/organization/${organizationId}/opportunities/new`);
  await page.getByLabel('Public title').fill(title);
  await page.getByLabel('Program').selectOption({ label: `${programName} · ${teamName}` });
  await page.getByRole('button', { name: 'Create draft' }).click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Review and publish' }).click();
  await expect(page.getByText('Save the submission form so applicants have somewhere to apply.')).toBeVisible({ timeout: firstCompile });
  await expect(page.getByRole('button', { name: 'Publish Opportunity' })).toBeDisabled();

  await page.getByRole('button', { name: 'Submission form' }).click();
  await page.getByLabel('Categories').fill('Poetry, Fiction');
  await page.getByRole('button', { name: 'Add question' }).click();
  await page.getByLabel('Label').nth(1).fill('Artist statement');
  await page.getByRole('button', { name: 'Move question 2 up' }).click();
  await expect(page.getByLabel('Label').first()).toHaveValue('Artist statement');
  await page.getByRole('button', { name: 'Save submission form' }).click();
  await expect(page.getByText('Submission form saved.')).toBeVisible({ timeout: firstCompile });

  await page.getByRole('button', { name: 'Review and publish' }).click();
  await expect(page.getByRole('heading', { name: 'Ready to publish' })).toBeVisible();
  await page.getByRole('button', { name: 'Publish Opportunity' }).click();
  const publish = page.getByRole('alertdialog', { name: `Publish “${title}”?` });
  await publish.getByRole('button', { name: 'Publish now' }).click();
  await expect(page.getByText('Opportunity published. Applicants can apply now.')).toBeVisible({ timeout: firstCompile });
  await expect(page.getByRole('heading', { name: 'Current lifecycle: published' })).toBeVisible();

  await page.getByRole('button', { name: 'Close to new submissions' }).click();
  const close = page.getByRole('alertdialog', { name: `Close “${title}”?` });
  await close.getByRole('button', { name: 'Close Opportunity' }).click();
  await expect(page.getByText('Opportunity closed to new submissions.')).toBeVisible({ timeout: firstCompile });
  await expect(page.getByRole('heading', { name: 'Current lifecycle: closed' })).toBeVisible();
});

async function submissionFixture(page: Page, baseURL: string | undefined) {
  const { organizationId, accountId } = await ownerSession(page);
  const suffix = uniqueSuffix();
  const team = await (await page.request.post(`/api/orgs/${organizationId}/teams`, { data: { name: `Actions Team ${suffix}` } })).json() as { id: string };
  const program = await (await page.request.post(`/api/orgs/${organizationId}/teams/${team.id}/programs`, { data: { name: `Actions Program ${suffix}` } })).json() as { id: string };
  const opportunity = await (await page.request.post(`/api/orgs/${organizationId}/open-calls`, { data: { programId: program.id, title: `Actions Prize ${suffix}` } })).json() as { id: string };
  const form = await (await page.request.post(`/api/orgs/${organizationId}/open-calls/${opportunity.id}/submission-paths`, { data: { categories: ['Poetry'], fields: [{ type: 'text', label: 'Project note', required: true }] } })).json() as { id: string; fields: Array<{ id: string }> };
  expect((await page.request.post(`/api/orgs/${organizationId}/open-calls/${opportunity.id}/publish`)).status()).toBe(200);
  const submitter = await playwrightRequest.newContext({ baseURL });
  expect((await submitter.post('/api/auth/signup', { data: { email: `actions-${suffix}@example.com`, password: 'correct-horse-battery', givenName: 'Actions', familyName: 'Submitter' } })).status()).toBe(201);
  const submitted = await (await submitter.post(`/api/submission-paths/${form.id}/submit`, { data: { category: 'Poetry', answers: { [form.fields[0]!.id]: 'A note.' }, works: [{ title: `Tide Tables ${suffix}` }, { title: `Salt Year ${suffix}` }] }, headers: { 'Idempotency-Key': `actions-${suffix}` } })).json() as { submission: { id: string }; works: Array<{ title: string }> };
  await submitter.dispose();
  return { organizationId, ownerAccountId: accountId, suffix, submissionId: submitted.submission.id, firstWork: submitted.works[0]!.title, secondWork: submitted.works[1]!.title };
}

test('A Submission dossier assigns a reviewer once, records a decision, and tracks delivery', async ({ page, baseURL }) => {
  const fixture = await submissionFixture(page, baseURL);
  const dossier = `/organization/${fixture.organizationId}/submissions/${fixture.submissionId}`;

  await page.goto(`${dossier}?section=reviews`);
  await page.getByRole('button', { name: 'Assign reviewer' }).click();
  const assign = page.getByRole('dialog', { name: 'Assign a reviewer' });
  // Pick a reader on another email domain: sharing a private domain with the submitter is a conflict.
  await assign.getByLabel('Reviewer').selectOption(fixture.ownerAccountId);
  await assign.getByLabel('New round name').fill(`First read ${fixture.suffix}`);
  await expectNoSeriousAxeViolations(page);
  await assign.getByRole('button', { name: 'Assign', exact: true }).click();
  await expect(page.getByText(/assigned\. They see this Submission in their review queue\./u)).toBeVisible({ timeout: firstCompile });
  await expect(page.getByText('Recommendation not submitted')).toBeVisible({ timeout: firstCompile });

  await page.getByRole('button', { name: 'Assign reviewer' }).click();
  const again = page.getByRole('dialog', { name: 'Assign a reviewer' });
  await again.getByLabel('Reviewer').selectOption(fixture.ownerAccountId);
  await expect(again.getByText('This person is already assigned to this Submission in that round.')).toBeVisible();
  await expect(again.getByRole('button', { name: 'Assign', exact: true })).toBeDisabled();
  await again.getByRole('button', { name: 'Cancel' }).click();

  await page.goto(`${dossier}?section=decisions`);
  await page.getByRole('button', { name: `Record decision for ${fixture.firstWork}` }).click();
  const decide = page.getByRole('dialog', { name: 'Record a decision' });
  await expect(decide.getByRole('button', { name: 'Record decision' })).toBeDisabled();
  await decide.getByRole('radio', { name: 'Accepted' }).click();
  await expect(decide.getByText('No email is sent')).toBeVisible();
  await decide.getByRole('button', { name: 'Record decision' }).click();
  await expect(page.getByText(`Accepted recorded for “${fixture.firstWork}”.`)).toBeVisible({ timeout: firstCompile });
  await expect(page.getByRole('button', { name: `Change decision for ${fixture.firstWork}` })).toBeVisible();

  await page.goto(`${dossier}?section=delivery`);
  await page.getByRole('button', { name: `Set up delivery for ${fixture.firstWork}` }).click();
  const delivery = page.getByRole('dialog', { name: 'Set up delivery' });
  await delivery.getByLabel('Due date').fill('2026-12-01');
  await delivery.getByRole('button', { name: 'Set up delivery' }).click();
  await expect(page.getByText(`Delivery set up for “${fixture.firstWork}”.`)).toBeVisible({ timeout: firstCompile });
  await expect(page.getByText('Due Dec 1, 2026')).toBeVisible({ timeout: firstCompile });
  await page.getByRole('button', { name: `Mark delivery complete for ${fixture.firstWork}` }).click();
  await expect(page.getByText(`Delivery marked complete for “${fixture.firstWork}”.`)).toBeVisible({ timeout: firstCompile });
  await expect(page.getByRole('button', { name: `Reopen delivery for ${fixture.firstWork}` })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

  await page.goto(`/organization/${fixture.organizationId}/decisions?q=${encodeURIComponent(fixture.firstWork)}`);
  await expect(page.getByRole('link', { name: 'Draft decision letters' })).toHaveAttribute('href', `/organization/${fixture.organizationId}/messages`, { timeout: firstCompile });

  await page.goto(`/organization/${fixture.organizationId}/submissions`);
  const exportLink = page.getByRole('link', { name: 'Export CSV' });
  await expect(exportLink).toBeVisible();
  const csv = await page.request.get((await exportLink.getAttribute('href'))!);
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain(fixture.firstWork);
});

test('People adds, re-roles, and removes access with confirmation', async ({ page, baseURL }) => {
  const { organizationId } = await ownerSession(page);
  const suffix = uniqueSuffix();
  const email = `person-${suffix}@example.com`;
  const other = await playwrightRequest.newContext({ baseURL });
  expect((await other.post('/api/auth/signup', { data: { email, password: 'correct-horse-battery', givenName: 'Reader', familyName: suffix } })).status()).toBe(201);
  await other.dispose();

  await page.goto(`/organization/${organizationId}/people`);
  await page.getByRole('button', { name: 'Add person' }).click();
  const add = page.getByRole('dialog', { name: 'Add a person' });
  await add.getByLabel('Email').fill(email);
  await add.getByLabel('Role').selectOption('reviewer');
  await expect(add.getByText('Only the Submissions assigned to them, in their own review queue.')).toBeVisible();
  await expectNoSeriousAxeViolations(page);
  await add.getByRole('button', { name: 'Add person' }).click();
  await expect(page.getByText('If this email belongs to a Missa account')).toBeVisible({ timeout: firstCompile });

  await page.goto(`/organization/${organizationId}/people?q=${encodeURIComponent(email)}`);
  await expect(page.locator('#access-dossier')).toContainText(email);
  await page.getByRole('button', { name: 'Change role' }).click();
  const role = page.getByRole('dialog', { name: /role$/u });
  await role.getByLabel('Role').selectOption('viewer');
  await role.getByRole('button', { name: 'Change role' }).click();
  await expect(page.getByText(/is now Viewer\./u)).toBeVisible({ timeout: firstCompile });

  await page.getByRole('button', { name: 'Remove access' }).click();
  const remove = page.getByRole('alertdialog');
  await expect(remove).toContainText('Their Missa account is not deleted.');
  await remove.getByRole('button', { name: 'Remove access' }).click();
  await expect(page.getByText('no longer has access.')).toBeVisible({ timeout: firstCompile });
  await page.goto(`/organization/${organizationId}/people?q=${encodeURIComponent(email)}`);
  await expect(page.getByRole('heading', { name: 'No people match these filters' })).toBeVisible();
});
