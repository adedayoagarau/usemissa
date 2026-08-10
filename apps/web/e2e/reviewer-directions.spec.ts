import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const fixtures = [
  'active', 'empty', 'many', 'multi-org', 'due-soon', 'overdue', 'closed', 'removed', 'single-blind',
  'double-blind', 'withheld', 'multi-work', 'pdf', 'audio', 'unavailable-file', 'inaccessible-file',
  'long-rubric', 'required-missing', 'score-range', 'saving', 'offline', 'save-failed', 'concurrent',
  'rubric-changed', 'conflict', 'conflict-failed', 'submitted', 'reopened', 'ambiguous', 'forbidden', 'long-text',
] as const

const widths = [320, 390, 768, 1280, 1536]
const directions = ['Focused assignment', 'Evidence desk', 'Review packet'] as const

test('all reviewer directions and edge fixtures fit target widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/design-system/reviewer-directions')
    await expect(page.getByRole('button', { name: 'Evidence desk' })).toHaveAttribute('aria-pressed', 'true')

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

test('selected Evidence Desk keeps Work, rubric, and submission deliberate on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/reviewer')

  await expect(page.getByRole('heading', { name: 'Saltwater remembers every name' })).toBeVisible()
  await page.getByRole('button', { name: 'Review', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your review' })).toBeVisible()

  await page.getByRole('button', { name: 'Review recommendation' }).click()
  await expect(page.getByRole('heading', { name: 'Review your recommendation' })).toBeFocused()
  await page.getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('North River Review')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByRole('status')).toContainText('Review submitted once')
})

test('required criteria, conflict, and blind-review states stay explicit', async ({ page }) => {
  await page.goto('/design-system/reviewer')
  await page.getByLabel('Edge state').selectOption('required-missing')
  await page.getByRole('button', { name: 'Review recommendation' }).click()
  await expect(page.getByTestId('review-error-summary')).toBeFocused()
  await expect(page.getByText('Choose a response for Clarity of intent.')).toHaveAttribute('role', 'alert')

  await page.getByLabel('Edge state').selectOption('double-blind')
  await expect(page.getByText('Double-blind', { exact: true })).toBeVisible()
  await expect(page.getByText(/identity-bearing answer is withheld/)).toBeVisible()
  await expect(page.getByText(/submitter account|source confidence|freshness/i)).toHaveCount(0)

  await page.getByRole('button', { name: 'Declare a conflict' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('reassign the Work')
  await page.getByLabel('Conflict explanation').fill('I have collaborated with the creator.')
  await page.getByRole('button', { name: 'Declare conflict' }).click()
  await expect(page.getByRole('status')).toContainText('Conflict recorded privately')
})

test('selected Evidence Desk has no detectable WCAG A or AA violations in core panes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/design-system/reviewer')
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('button', { name: 'Review', exact: true }).click()
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
