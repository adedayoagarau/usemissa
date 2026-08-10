import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function createLibraryAccount(page: Page) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const signup = await page.request.post('/api/auth/signup', {
    data: { email: `library-${suffix}@example.com`, password: 'correct-horse-battery', displayName: 'Library User' },
  });
  expect(signup.status()).toBe(201);
  const workResponse = await page.request.post('/api/me/library/works', {
    data: { title: 'Night River', description: 'A poetry manuscript about memory and place.', taxonomyTermIds: ['taxterm_disc-poetry'] },
  });
  expect(workResponse.status()).toBe(201);
  const answerResponse = await page.request.post('/api/me/library/saved-answers', {
    data: { name: 'Short bio', body: 'A writer working across poetry and criticism.' },
  });
  expect(answerResponse.status()).toBe(201);
  return {
    work: await workResponse.json() as { id: string; title: string },
    answer: await answerResponse.json() as { id: string; name: string },
  };
}

test('Working Archive keeps URL state and opens a canonical private Work detail', async ({ page }) => {
  const { work } = await createLibraryAccount(page);
  await page.goto('/library?q=Night&sort=title');

  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Library views' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Works/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Night River', exact: true })).toBeVisible();
  await expect(page.getByText('Poetry', { exact: true }).first()).toBeVisible();
  expect(new URL(page.url()).searchParams.get('q')).toBe('Night');
  expect(new URL(page.url()).searchParams.get('sort')).toBe('title');
  await page.screenshot({ path: 'outputs/library-product-desktop.png', fullPage: true });

  await page.getByRole('link', { name: 'Open Work' }).click();
  await expect(page).toHaveURL(new RegExp(`/library/works/${work.id}`));
  await expect(page.getByRole('heading', { level: 1, name: 'Night River' })).toBeVisible();
  await expect(page.getByText('Private Work', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/cannot yet prove which Library revision was sent/i)).toBeVisible();
  await page.screenshot({ path: 'outputs/work-detail-product-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(page).toHaveURL(/section=practice/);
  await expect(page.getByRole('heading', { name: 'Describe the Work, not its eligibility' })).toBeVisible();

  await page.getByRole('button', { name: 'Edit terms' }).click();
  await page.getByLabel('Work title').fill('Night River — revised');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toContainText('Work updated');
  await expect(page.getByRole('heading', { level: 1, name: 'Night River — revised' })).toBeVisible();

  const back = page.getByRole('link', { name: 'Back to Library' });
  await expect(back).toHaveAttribute('href', /q=Night/);
});

test('Library creates and deletes Saved Answers with scoped confirmation', async ({ page }) => {
  const { answer } = await createLibraryAccount(page);
  await page.goto('/library?view=answers');

  await expect(page.getByRole('button', { name: /Saved Answers/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Short bio', exact: true })).toBeVisible();
  await expect(page.getByText('A writer working across poetry and criticism.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Delete Short bio' }).click();
  await expect(page.getByRole('heading', { name: 'Delete Saved Answer?' })).toBeVisible();
  await expect(page.getByText(/Historical submission receipts are separate/i)).toBeVisible();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByRole('heading', { name: 'No Saved Answers yet' })).toBeVisible();
  const after = await page.request.get('/api/me/library');
  expect(JSON.stringify(await after.json())).not.toContain(answer.id);

  await page.getByRole('button', { name: 'New Saved Answer' }).click();
  await page.getByLabel('Saved Answer name').fill('General statement');
  await page.getByLabel('Answer', { exact: true }).fill('A reusable statement for future applications.');
  await page.getByRole('button', { name: 'Save Answer' }).click();
  await expect(page.getByRole('heading', { name: 'General statement' })).toBeVisible();
});

test('Library deletion rejects a Work that still belongs to Tracker', async ({ page }) => {
  const { work } = await createLibraryAccount(page);
  const opportunities = await page.request.get('/api/opportunities?limit=1');
  const payload = await opportunities.json() as { items: Array<{ id: string }> };
  const opportunityId = payload.items[0]?.id;
  expect(opportunityId).toBeTruthy();
  expect([200, 201]).toContain((await page.request.post('/api/me/tracker', { data: { opportunityId } })).status());
  expect((await page.request.put(`/api/me/tracker/${encodeURIComponent(opportunityId!)}/work`, { data: { workId: work.id } })).status()).toBe(200);

  const deletion = await page.request.delete(`/api/me/library/works/${encodeURIComponent(work.id)}`);
  expect(deletion.status()).toBe(409);
  const deletionBody = await deletion.json() as { error?: string };
  expect(deletionBody.error).toContain('Tracker item');

  await page.goto(`/library/works/${encodeURIComponent(work.id)}`);
  await expect(page.getByRole('button', { name: 'Delete Work' })).toBeDisabled();
  await expect(page.getByText(/Detach 1 Tracker connection/i)).toBeVisible();
});

test('Library and Work detail remain accessible and contained on a phone', async ({ page }) => {
  const { work } = await createLibraryAccount(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/library');
  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/library-product-mobile.png', fullPage: true });

  await page.goto(`/library/works/${encodeURIComponent(work.id)}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Night River' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/work-detail-product-mobile.png', fullPage: true });
});

test('Library Work detail is owner-scoped and signed-out view state survives login', async ({ browser, baseURL }) => {
  const ownerContext = await browser.newContext({ baseURL });
  const otherContext = await browser.newContext({ baseURL });
  const ownerPage = await ownerContext.newPage();
  const otherPage = await otherContext.newPage();
  try {
    const { work } = await createLibraryAccount(ownerPage);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const otherSignup = await otherPage.request.post('/api/auth/signup', {
      data: { email: `library-${suffix}@example.com`, password: 'correct-horse-battery', displayName: 'Other Library User' },
    });
    expect(otherSignup.status()).toBe(201);
    const forbidden = await otherPage.goto(`/library/works/${encodeURIComponent(work.id)}`);
    expect(forbidden?.status()).toBe(404);

    await otherPage.request.post('/api/auth/logout');
    await otherPage.goto('/library?view=answers&q=bio');
    const destination = new URL(otherPage.url());
    expect(destination.pathname).toBe('/login');
    expect(destination.searchParams.get('next')).toBe('/library?view=answers&q=bio');
  } finally {
    await ownerContext.close();
    await otherContext.close();
  }
});
