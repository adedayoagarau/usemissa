import { expect, test } from '@playwright/test';

test('Library keeps Works and Saved Answers private and editable', async ({ page }) => {
  const email = `library-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const signup = await page.request.post('/api/auth/signup', { data: { email, password: 'correct-horse-battery', displayName: 'Library User' } });
  expect(signup.status()).toBe(201);

  expect(await (await page.request.get('/api/me/library')).json()).toEqual({ works: [], files: [], savedAnswers: [] });
  const work = await page.request.post('/api/me/library/works', { data: { title: 'Night River', description: 'Poetry manuscript' } });
  expect(work.status()).toBe(201);
  const answer = await page.request.post('/api/me/library/saved-answers', { data: { name: 'Short bio', body: 'A writer working across poetry and criticism.' } });
  expect(answer.status()).toBe(201);

  await page.goto('/library');
  await expect(page.getByRole('heading', { name: /Keep the parts of your work/ })).toBeVisible();
  await expect(page.getByText('Night River', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Saved Answers/ }).click();
  await expect(page.getByText('Short bio', { exact: true })).toBeVisible();
  await expect(page.getByText('A writer working across poetry and criticism.', { exact: true })).toBeVisible();

  const answerBody = await answer.json() as { id: string };
  page.on('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Delete Short bio' }).click();
  await expect(page.getByText('No Saved Answers yet')).toBeVisible();
  expect((await page.request.get('/api/me/library')).status()).toBe(200);
  const after = await page.request.get('/api/me/library'); expect(JSON.stringify(await after.json())).not.toContain(answerBody.id);
});
