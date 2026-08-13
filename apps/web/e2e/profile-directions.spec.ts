import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const fixtures = [
  'active', 'new', 'partial', 'multi', 'preference-conflict', 'deprecated', 'private', 'privacy-conflict',
  'integration-attention', 'integration-error', 'empty-collections', 'large', 'mutation-error', 'concurrent', 'export-error',
] as const

const widths = [320, 390, 768, 1280, 1536]
const directions = ['Focused sections', 'Profile ledger', 'Action index'] as const

test('all Profile directions and edge fixtures fit every target width', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/design-system/profile-directions')
    await expect(page.getByRole('button', { name: 'Profile ledger' })).toHaveAttribute('aria-pressed', 'true')

    for (const direction of directions) {
      await page.getByRole('button', { name: direction }).click()
      await expect(page.getByRole('button', { name: direction })).toHaveAttribute('aria-pressed', 'true')
      for (const fixture of fixtures) {
        await page.getByLabel('Edge state').selectOption(fixture)
        await expect(page.getByRole('heading', { name: direction, level: 1 })).toBeVisible()
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${direction}, ${fixture}, ${width}px`).toBeLessThanOrEqual(1)
      }
    }
  }
})

test('selected Profile protects unsaved identity and focuses each destination', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/profile')

  await page.getByRole('link', { name: 'Identity' }).click()
  await expect(page.getByRole('heading', { name: 'Identity', level: 2 })).toBeFocused()

  const bio = page.getByLabel('Short bio')
  await bio.fill('A local unsaved biography.')
  await page.getByRole('link', { name: 'Preferences' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await expect(page.getByRole('alertdialog')).not.toBeVisible()
  await expect(bio).toHaveValue('A local unsaved biography.')

  await page.getByRole('link', { name: 'Preferences' }).click()
  await page.getByRole('button', { name: 'Discard and continue' }).click()
  await expect(page.getByRole('heading', { name: 'Preferences', level: 2 })).toBeFocused()
  await expect(page.getByText('These preferences are private')).toBeVisible()
})

test('Profile field failures and preference conflicts remain associated and durable', async ({ page }) => {
  await page.goto('/design-system/profile')
  await page.getByLabel('Edge state').selectOption('mutation-error')
  const bio = page.getByLabel('Short bio')
  await expect(bio).toHaveAttribute('aria-invalid', 'true')
  await expect(bio).toHaveAttribute('aria-errormessage', 'profile-bio-error')
  await expect(page.locator('#profile-bio-error')).toHaveAttribute('role', 'alert')
  await page.getByRole('button', { name: 'Try saving again' }).click()
  await expect(page.getByRole('status')).toContainText('Identity could not be saved')

  await page.getByLabel('Edge state').selectOption('preference-conflict')
  await expect(page.getByText('Two field choices conflict')).toBeVisible()
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(page.getByRole('status')).toContainText('Resolve the field conflict before saving')
})

test('selected Profile has no detectable WCAG A or AA violations in core sections', async ({ page }) => {
  await page.goto('/design-system/profile')
  for (const section of ['Overview', 'Identity', 'Preferences', 'Privacy', 'Integrations', 'Saved searches', 'Following', 'Data']) {
    if (section !== 'Overview') await page.getByRole('link', { name: section }).click()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations, `${section} accessibility violations`).toEqual([])
  }
})
