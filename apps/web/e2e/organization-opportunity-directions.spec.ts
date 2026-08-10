import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const directions = ['Operational index', 'Program ledger', 'Preview desk'] as const
const fixtures = [
  'mixed-list', 'no-program', 'empty-list', 'one-draft', 'large-list', 'no-results', 'viewer', 'program-manager', 'finance', 'legal', 'long-names', 'no-image', 'extreme-image',
  'incomplete-basics', 'unknown-type', 'deadlines', 'fee-unknown', 'fee-free', 'multi-currency', 'practice-rules', 'taxonomy-conflict', 'deprecated-term', 'large-rules', 'eligibility-conflict', 'geography-conflict',
  'no-fields', 'long-form', 'invalid-branch', 'guideline-success', 'guideline-pdf', 'guideline-blocked', 'csv-preview', 'csv-limit', 'save-failure', 'concurrent', 'recovered', 'publish-ready', 'publish-blocked', 'readiness-unavailable', 'publish-replay', 'published-change', 'connected-conflict', 'close-impact', 'foreign', 'mobile-urgent',
] as const

test('all Organization Opportunity directions and edge states reflow without page overflow', async ({ page }) => {
  test.setTimeout(120_000)
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/design-system/organization-opportunities-directions')
    for (const direction of directions) {
      const directionButton = page.getByRole('button', { name: new RegExp(`${direction}$`) })
      await directionButton.click()
      await expect(directionButton).toHaveAttribute('aria-pressed', 'true')
      for (const fixture of fixtures) {
        await page.getByLabel('Organization Opportunity edge state').selectOption(fixture)
        await expect(page.locator('h1')).toHaveCount(1)
        await expect(page.locator('main')).toHaveCount(1)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${direction}, ${fixture}, ${width}px`).toBeLessThanOrEqual(1)
      }
    }
  }
})

test('selected route preserves Option 02 across list and builder', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/organization-opportunities')
  await expect(page.getByText('Selected Organization Opportunities composition', { exact: true })).toBeVisible()
  await expect(page.getByText('Program ledger', { exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Opportunity visual direction' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Opportunities', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Builder', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'New Voices Residency', level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Opportunity builder sections' })).toBeVisible()
})

test('role projections omit inaccessible builder domains and mutations', async ({ page }) => {
  await page.goto('/design-system/organization-opportunities')
  await page.getByLabel('Organization Opportunity edge state').selectOption('viewer')
  await expect(page.getByText('Read only', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create Opportunity' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Import' })).toHaveCount(0)
  await page.getByLabel('Organization Opportunity edge state').selectOption('finance')
  let builderNavigation = page.getByRole('navigation', { name: 'Opportunity builder sections' })
  await expect(builderNavigation.getByText('Fees and terms', { exact: true })).toBeVisible()
  await expect(builderNavigation.getByRole('link')).toHaveCount(1)
  await page.getByLabel('Organization Opportunity edge state').selectOption('legal')
  builderNavigation = page.getByRole('navigation', { name: 'Opportunity builder sections' })
  await expect(builderNavigation.getByText('Guidelines', { exact: true })).toBeVisible()
  await expect(builderNavigation.getByText('Fees and terms', { exact: true })).toBeVisible()
  await expect(builderNavigation.getByRole('link')).toHaveCount(2)
})

test('taxonomy, eligibility, geography, fee, and form blockers remain separate', async ({ page }) => {
  await page.goto('/design-system/organization-opportunities')
  await page.getByLabel('Organization Opportunity edge state').selectOption('taxonomy-conflict')
  await expect(page.getByText(/Writing and literature is excluded while Poetry beneath it is preferred/)).toBeVisible()
  await expect(page.getByText(/Opportunity type, eligibility, place, fees, and application materials are edited in their own sections/)).toBeVisible()
  await page.getByLabel('Organization Opportunity edge state').selectOption('eligibility-conflict')
  await expect(page.getByText(/Eligibility statements conflict/)).toBeVisible()
  await page.getByLabel('Organization Opportunity edge state').selectOption('geography-conflict')
  await expect(page.getByText(/Application reach and participation location conflict/)).toBeVisible()
  await page.getByLabel('Organization Opportunity edge state').selectOption('fee-unknown')
  await expect(page.getByText(/The public preview will not say “No fee.”/)).toBeVisible()
  await page.getByLabel('Organization Opportunity edge state').selectOption('no-fields')
  await expect(page.getByText(/Add the first applicant field/)).toBeVisible()
})

test('publication and failed-save states fail safely', async ({ page }) => {
  await page.goto('/design-system/organization-opportunities')
  await page.getByLabel('Organization Opportunity edge state').selectOption('publish-blocked')
  await expect(page.getByRole('button', { name: 'Publish Opportunity' })).toBeDisabled()
  await page.getByLabel('Organization Opportunity edge state').selectOption('publish-ready')
  await page.getByRole('button', { name: 'Publish Opportunity' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await expect(page.getByRole('alertdialog').getByText(/applications close 12 October/i)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await page.getByLabel('Organization Opportunity edge state').selectOption('save-failure')
  const title = page.getByLabel('Public title')
  await title.fill('My preserved title')
  await page.getByRole('button', { name: 'Try saving again' }).click()
  await expect(title).toHaveValue('My preserved title')
  await expect(page.getByText(/could not be saved\. Your edits remain here/)).toBeVisible()
})

test('selected mobile list and taxonomy review pass WCAG A and AA checks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/organization-opportunities')
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
  await page.getByLabel('Organization Opportunity edge state').selectOption('taxonomy-conflict')
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
