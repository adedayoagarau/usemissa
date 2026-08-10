import { expect, test } from '@playwright/test';

test('Gmail Sync keeps review mode default and requires explicit Autopilot consent', async ({ page }) => {
  const email = `gmail-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const signup = await page.request.post('/api/auth/signup', { data: { email, password: 'correct-horse-battery', displayName: 'Gmail User' } });
  expect(signup.status()).toBe(201);

  let mode: 'review' | 'autopilot' = 'review';
  await page.route('**/api/me/email-sync**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/gmail/mode') && request.method() === 'POST') {
      mode = 'autopilot';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mode }) });
      return;
    }
    if (pathname === '/api/me/email-sync' && request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ gmail: { connected: true, accountEmailMasked: 'c•••••@example.com', mode, status: 'active', scanWindowDays: 30, pendingCandidates: 0 } }) });
      return;
    }
    await route.continue();
  });

  await page.goto('/profile?section=integrations');
  const card = page.locator('#gmail-sync');
  await expect(card).toContainText('Review before import');
  await expect(card.getByText(/last sync|scan window|confidence|error code/i)).toHaveCount(0);
  await card.getByRole('button', { name: 'Enable Autopilot', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Autopilot is narrow and reversible');
  const confirm = dialog.getByRole('checkbox', { name: /I understand what Autopilot can change/ });
  const enable = dialog.getByRole('button', { name: 'Enable Autopilot', exact: true });
  await expect(enable).toBeDisabled();
  await confirm.check();
  await expect(enable).toBeEnabled();
  await enable.click();

  await expect(card).toContainText('Autopilot is on');
  await expect(card).toContainText('Autopilot enabled');
});
