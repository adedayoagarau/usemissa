import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const directions = ['Editorial masthead', 'Product switcher', 'Context rail'] as const
const shells = ['public', 'profile', 'organization', 'reviewer', 'admin'] as const
const fixtures = ['normal', 'signed-out', 'no-org', 'multi-org', 'role-limited', 'removed', 'session-expired', 'unavailable', 'long-content', 'rtl'] as const
const widths = [320, 390, 768, 1280, 1536]

test('selected shell route keeps Product switcher canonical without removing the comparison', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/shell')
  await expect(page.getByText('Selected shared shell', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('02 · Product switcher')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Product switcher', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editorial masthead' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Context rail' })).toHaveCount(0)
  await page.getByLabel('Shell').selectOption('organization')
  await page.getByLabel('Edge state').selectOption('multi-org')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('button', { name: 'Switch Organization' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/design-system/shell-directions')
  await expect(page.getByRole('button', { name: 'Editorial masthead' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Product switcher' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Context rail' })).toBeVisible()
})

test('all shell directions, products, and edge fixtures fit target widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/design-system/shell-directions')
    for (const direction of directions) {
      await page.getByRole('button', { name: direction }).click()
      await expect(page.getByRole('button', { name: direction })).toHaveAttribute('aria-pressed', 'true')
      for (const shell of shells) {
        await page.getByLabel('Shell').selectOption(shell)
        for (const fixture of fixtures) {
          await page.getByLabel('Edge state').selectOption(fixture)
          await expect(page.getByRole('heading', { name: direction, level: 1 })).toBeVisible()
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
          expect(overflow, `${direction}, ${shell}, ${fixture}, ${width}px`).toBeLessThanOrEqual(1)
        }
      }
    }
  }
})

test('mobile menu retains product context and closes after navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/shell-directions')
  await page.getByLabel('Shell').selectOption('organization')
  const trigger = page.getByRole('button', { name: 'Open navigation' })
  await trigger.click()
  await expect(page.getByRole('navigation', { name: 'Organization navigation' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Switch Organization' })).toBeVisible()
  await page.getByRole('link', { name: 'Submissions' }).last().click()
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
})

test('capability and customer vocabulary boundaries remain visible', async ({ page }) => {
  await page.goto('/design-system/shell-directions')
  await page.getByLabel('Shell').selectOption('organization')
  await page.getByLabel('Edge state').selectOption('role-limited')
  await expect(page.getByText('Review-only access')).toBeVisible()
  await expect(page.getByRole('link', { name: 'People' })).toHaveCount(0)
  await expect(page.getByText('Workspace', { exact: true })).toHaveCount(0)

  await page.getByLabel('Shell').selectOption('admin')
  await page.getByLabel('Edge state').selectOption('normal')
  await expect(page.getByRole('link', { name: 'Radar' })).toBeVisible()
})

test('core desktop and mobile shell states have no detectable WCAG A or AA violations', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/design-system/shell-directions')
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByLabel('Shell').selectOption('organization')
  await page.getByLabel('Edge state').selectOption('multi-org')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
