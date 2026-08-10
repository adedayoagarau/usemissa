import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const directions = ['Context rail', 'Operations ledger', 'Attention desk'] as const
const fixtures = [
  'active',
  'none',
  'one',
  'many',
  'invite',
  'suspended',
  'new',
  'reviewer',
  'program',
  'finance',
  'viewer',
  'long',
  'large',
  'taxonomy-conflict',
  'triage',
  'reviews',
  'mixed-decisions',
  'message-failure',
  'delivery',
  'billing',
  'unavailable',
  'switch-interrupted',
  'foreign',
  'command-empty',
  'mobile-urgent',
] as const

test('all Organization directions and edge states remain usable without horizontal overflow', async ({ page }) => {
  test.setTimeout(120_000)
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/design-system/organization-directions')
    for (const direction of directions) {
      const directionButton = page.getByRole('button', { name: new RegExp(`${direction}$`) })
      await directionButton.click()
      await expect(directionButton).toHaveAttribute('aria-pressed', 'true')
      for (const fixture of fixtures) {
        await page.getByLabel('Organization edge state').selectOption(fixture)
        await expect(page.locator('h1')).toHaveCount(1)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${direction}, ${fixture}, ${width}px`).toBeLessThanOrEqual(1)
      }
    }
  }
})

test('selected route preserves Option 01 and both Organization surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/organization')
  await expect(page.getByRole('heading', { name: 'Context rail', level: 2 })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Organization visual direction' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Switch Organization\. Current: North River Review, Owner/ })).toBeVisible()
  await page.getByRole('button', { name: 'Chooser', exact: true }).click()
  await page.getByLabel('Organization edge state').selectOption('many')
  await expect(page.getByRole('heading', { name: 'Choose an Organization' })).toBeVisible()
  await expect(page.getByText('4 memberships')).toBeVisible()
})

test('role and unavailable projections do not leak inaccessible operational data', async ({ page }) => {
  await page.goto('/design-system/organization')
  await page.getByLabel('Organization edge state').selectOption('reviewer')
  await expect(page.getByRole('navigation', { name: 'Organization navigation' }).getByText('Reviews')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Organization navigation' }).getByText('People')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Organization navigation' }).getByText('Settings')).toHaveCount(0)
  await page.getByLabel('Organization edge state').selectOption('unavailable')
  await expect(page.getByText('The Organization overview is unavailable', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lifecycle summary' })).toHaveCount(0)
  await page.getByLabel('Organization edge state').selectOption('foreign')
  await expect(page.getByText(/will not reveal private Organization details/)).toBeVisible()
  await expect(page.getByText('North River Review')).toHaveCount(0)
})

test('taxonomy conflict and command recovery keep their exact boundaries', async ({ page }) => {
  await page.goto('/design-system/organization')
  await page.getByLabel('Organization edge state').selectOption('taxonomy-conflict')
  await expect(page.getByText(/Eligibility and form questions are unaffected/)).toBeVisible()
  await page.getByLabel('Organization edge state').selectOption('command-empty')
  await page.getByRole('button', { name: /Search/ }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No matching action' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('selected mobile chooser and overview pass WCAG A and AA checks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/organization')
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
  await page.getByLabel('Organization edge state').selectOption('many')
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
