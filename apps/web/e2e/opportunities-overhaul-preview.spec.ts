import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const route = '/design-system/opportunities-overhaul';

test.describe('Opportunities overhaul review fixture', () => {
  test('supports search, filters, and every review state on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route);

    await expect(page.getByRole('heading', { level: 1, name: 'Find your next opportunity.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Field' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Why this fits')).toHaveCount(0);

    const search = page.getByRole('combobox', { name: 'Search opportunities' });
    await search.fill('film');
    await expect(page.getByRole('listbox', { name: 'Search suggestions' })).toBeVisible();
    await page.getByRole('option', { name: /Woodstock Film Festival Annual Open Call/ }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Results for “Woodstock Film Festival Annual Open Call”' })).toBeVisible();
    await expect(page.getByText('1 opportunity')).toBeVisible();

    await page.getByText('States', { exact: true }).click();
    for (const state of ['Loading', 'No results', 'Unavailable', 'Edge cases', 'Normal']) {
      await page.getByRole('button', { name: state, exact: true }).click();
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  });

  test('uses an accessible mobile filter sheet without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);

    await page.getByRole('button', { name: /^Filters/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Filter opportunities' })).toBeVisible();
    await dialog.getByRole('checkbox', { name: 'Poetry' }).check();
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByText('Poetry', { exact: true }).last()).toBeVisible();
    await page.waitForTimeout(300);

    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  });
});
