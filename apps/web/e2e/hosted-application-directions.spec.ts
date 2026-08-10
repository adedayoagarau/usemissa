import { expect, test } from '@playwright/test'

const fixtures = [
  'new', 'signed-out', 'resumed', 'offline', 'conflict', 'expiring', 'expired', 'form-changed',
  'rolling', 'unknown-deadline', 'deadline-conflict', 'closed', 'no-fee', 'paid', 'payment-cancelled',
  'payment-processing', 'paid-pending', 'waiver', 'unsupported-currency', 'one-work', 'multiple-works',
  'work-limit', 'uploading', 'file-rejected', 'scan-unavailable', 'field-error', 'long-form', 'no-questions',
  'required-practice', 'preferred-practice', 'excluded-practice', 'taxonomy-unresolved', 'duplicate-submit',
  'ambiguous-submit', 'load-error', 'unicode', 'submitted',
] as const

const widths = [320, 390, 768, 1280, 1536]

test('hosted application directions render every fixture without horizontal overflow', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/design-system/hosted-application-directions')
    for (const fixture of fixtures) {
      await page.getByLabel('Test fixture').selectOption(fixture)
      if (fixture === 'submitted') await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible()
      else await expect(page.getByRole('heading', { name: 'Hosted application directions' })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${fixture} at ${width}px should not overflow`).toBeLessThanOrEqual(1)
    }
  }
})

test('selected Application desk supports mobile section, file, review, dialog, and receipt flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/hosted-application-directions')

  await expect(page.getByRole('button', { name: /Application desk/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('Application section', { exact: true }).selectOption('works')
  await expect(page.getByRole('heading', { name: 'Choose your Works' })).toBeVisible()

  await page.getByRole('button', { name: 'Choose file' }).click()
  await expect(page.getByText('Uploading · 61%')).toBeVisible()
  await expect(page.getByText('PDF · 8.4 MB · Ready').first()).toBeVisible()

  await page.getByLabel('Application section', { exact: true }).selectOption('questions')
  await expect(page.getByLabel(/Proposal summary/)).toBeVisible()
  await page.getByLabel(/Proposal summary/).focus()
  await expect(page.getByLabel(/Proposal summary/)).toBeFocused()

  await page.getByLabel('Test fixture').selectOption('no-fee')
  await page.getByLabel('Application section', { exact: true }).selectOption('review')
  await page.getByRole('button', { name: 'Submit application' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Submit this application?' })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit application' }).click()
  await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible()
  await expect(page.getByText('MSA-2704-0186')).toBeVisible()
})

test('field errors are associated with their controls and blocking submit stays unavailable', async ({ page }) => {
  await page.goto('/design-system/hosted-application-directions')
  await page.getByLabel('Test fixture').selectOption('field-error')
  await page.getByRole('button', { name: /Questions/ }).click()

  const summary = page.getByLabel(/Proposal summary/)
  const website = page.getByLabel(/Project website/)
  await expect(summary).toHaveAttribute('aria-invalid', 'true')
  await expect(summary).toHaveAttribute('aria-describedby', /proposal-summary-error/)
  await expect(website).toHaveAttribute('aria-invalid', 'true')
  await expect(website).toHaveAttribute('aria-describedby', /website-error/)

  await page.getByRole('button', { name: 'Review Check and submit' }).click()
  await expect(page.getByRole('button', { name: 'Pay $25 and submit' })).toBeDisabled()
})
