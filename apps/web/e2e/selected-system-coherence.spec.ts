import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { selectedSystemItems } from '../components/design-system/selected-system-manifest'

const customerNamingBoundary = /\bPassport\b|\bWorkspace\b|\bTrust Layer\b/
const customerOperationsBoundary = /source confidence|freshness score|last checked|checked at|source tier|worker state|Opportunity photo/i

test('selected-system index exposes every selected composition and retained comparison', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const response = await page.goto('/design-system')
  expect(response?.ok()).toBe(true)
  await expect(page.getByRole('heading', { name: 'The whole overhaul, in one place' })).toBeVisible()
  await expect(page.getByText('Product routes are unchanged')).toBeVisible()
  await expect(page.getByRole('link', { name: /Open selected/ })).toHaveCount(selectedSystemItems.length)
  await expect(page.getByRole('link', { name: /Compare options/ })).toHaveCount(
    selectedSystemItems.filter((item) => item.comparisonPath).length,
  )
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('every selected composition is healthy and reflows at phone and desktop widths', async ({ page }) => {
  test.setTimeout(180_000)

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })

    for (const item of selectedSystemItems) {
      const response = await page.goto(item.selectedPath, { waitUntil: 'domcontentloaded' })
      expect(response?.ok(), `${item.selectedPath} returned ${response?.status()}`).toBe(true)
      await expect(page.locator('h1').first(), `${item.selectedPath} needs a visible page heading`).toBeVisible()
      await expect(page).toHaveTitle(/Missa design review|Missa system/)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${item.selectedPath} overflows at ${width}px`).toBeLessThanOrEqual(1)

      if (item.customerFacing) {
        const visibleCopy = await page.locator('body').innerText()
        expect(visibleCopy, `${item.selectedPath} exposes a retired customer product name`).not.toMatch(customerNamingBoundary)
        expect(visibleCopy, `${item.selectedPath} exposes internal operational metadata`).not.toMatch(customerOperationsBoundary)
      }
    }
  }
})

test('selected-system index passes core automated accessibility checks', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/design-system')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  }
})

