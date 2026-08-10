import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const fixtures = [
  'active', 'no-attention', 'mixed', 'large', 'no-results', 'latest-run-only', 'partial', 'unavailable',
  'worker-unknown', 'worker-stale', 'worker-running', 'worker-failed', 'source-fetch-failed',
  'source-process-failed', 'source-conflict', 'content-review', 'content-missing-source', 'content-concurrent',
  'content-failed', 'taxonomy-proposal', 'taxonomy-sensitive', 'taxonomy-deprecated', 'taxonomy-unavailable',
  'customer-inactive', 'organization-no-owner', 'support-sensitive', 'messaging-partial', 'billing-past-due',
  'billing-mismatch', 'analytics-zero', 'read-only', 'missing-capability', 'step-up', 'two-person',
  'capability-removed', 'session-expired', 'forbidden', 'action-working', 'action-failed', 'action-conflict',
  'action-ambiguous', 'duplicate-protected', 'audit-unavailable', 'long-content', 'rtl',
] as const

const widths = [320, 390, 768, 1280, 1536]
const directions = ['Command ledger', 'Evidence control room', 'Domain index'] as const

test('selected Admin route keeps Evidence control room canonical without removing the comparison', async ({ page }) => {
  await page.goto('/design-system/admin')
  await expect(page.getByText('Selected Platform Admin composition')).toBeVisible()
  await expect(page.getByText('02 · Evidence control room')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Evidence control room', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Command ledger' })).toHaveCount(0)
  await page.getByLabel('Edge state').selectOption('source-process-failed')
  await expect(page.getByRole('heading', { name: 'Fetch succeeded; processing failed' })).toBeVisible()

  await page.goto('/design-system/admin-directions')
  await expect(page.getByRole('button', { name: 'Command ledger' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Evidence control room' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Domain index' })).toBeVisible()
})

test('all Admin directions and edge fixtures fit target widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/design-system/admin-directions')
    await expect(page.getByRole('button', { name: 'Evidence control room' })).toHaveAttribute('aria-pressed', 'true')

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

test('Evidence control room preserves desktop context and mobile list-detail focus', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/design-system/admin-directions')
  await page.getByRole('button', { name: /Fetch succeeded; processing failed/ }).click()
  await expect(page.getByRole('heading', { name: 'Fetch succeeded; processing failed' })).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  const row = page.getByRole('button', { name: /Conflicting deadline evidence/ })
  await row.click()
  await expect(page.getByRole('heading', { name: 'Conflicting deadline evidence' })).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to worklist' }).click()
  await expect(page.getByRole('button', { name: /Conflicting deadline evidence/ })).toBeFocused()
})

test('bounded action preview names scope and produces an acknowledgement receipt', async ({ page }) => {
  await page.goto('/design-system/admin-directions')
  await page.getByRole('button', { name: 'Preview bounded action' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('One item only')
  await expect(dialog).toContainText('worker acknowledgement separate')
  await page.getByLabel('Reason for Admin action').fill('Retry one failed processing item after reviewing the retained snapshot.')
  await dialog.getByRole('button', { name: 'Request action' }).click()
  await expect(page.getByRole('status')).toContainText('Awaiting acknowledgement')

  await page.getByLabel('Edge state').selectOption('missing-capability')
  await expect(page.getByRole('button', { name: 'Preview bounded action' })).toBeDisabled()
  await expect(page.getByText(/Investigate access only/)).toBeVisible()
})

test('taxonomy and unavailable states preserve governance boundaries', async ({ page }) => {
  await page.goto('/design-system/admin-directions')
  await page.getByLabel('Edge state').selectOption('taxonomy-deprecated')
  await expect(page.getByText('Language', { exact: true })).toBeVisible()
  await expect(page.getByText('lang_yoruba', { exact: true })).toBeVisible()
  await expect(page.getByText('384', { exact: true })).toBeVisible()
  await expect(page.getByText(/Opportunity type, eligibility, career stage, geography, fee, and deadline are not part/)).toBeVisible()

  await page.getByLabel('Edge state').selectOption('taxonomy-unavailable')
  await expect(page.getByText('The canonical taxonomy graph is unavailable')).toBeVisible()
  await expect(page.getByText('No actionable rows observed')).toBeVisible()
})

test('Admin comparison has no detectable WCAG A or AA violations in core wide and mobile states', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/design-system/admin-directions')
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('button', { name: /Conflicting deadline evidence/ }).click()
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])

  await page.getByRole('button', { name: 'Back to worklist' }).click()
  await page.getByRole('button', { name: 'Toggle Admin navigation' }).click()
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
