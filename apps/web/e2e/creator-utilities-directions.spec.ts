import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const directions = ['Focused task', 'Creator desk', 'Guided utility'] as const
const surfaces = [
  { value: 'home', fixtures: ['home-next-task', 'home-new-account', 'home-no-activity', 'home-competing', 'home-same-deadline', 'home-hidden-target', 'home-fit-conflict', 'home-partial-failure', 'home-session-expired', 'home-long-content', 'home-rtl', 'home-no-projection'] },
  { value: 'import', fixtures: ['import-upload', 'import-wrong-type', 'import-too-large', 'import-malformed', 'import-map', 'import-missing-required', 'import-review', 'import-exact-match', 'import-several-candidates', 'import-taxonomy-review', 'import-status-conflict', 'import-duplicate-row', 'import-preview-expired', 'import-concurrent', 'import-confirm', 'import-all-skipped', 'import-offline', 'import-ambiguous', 'import-failed', 'import-result'] },
  { value: 'ask', fixtures: ['ask-empty', 'ask-results', 'ask-no-results', 'ask-clarify', 'ask-out-of-scope', 'ask-source-unavailable', 'ask-partial', 'ask-rate-limit', 'ask-database-unavailable', 'ask-disabled', 'ask-pending', 'ask-failed', 'ask-ambiguous', 'ask-history', 'ask-long-content', 'ask-rtl'] },
] as const

test('all Creator utility directions and edge states reflow without horizontal overflow', async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/design-system/creator-utilities-directions')
    for (const direction of directions) {
      await page.getByRole('button', { name: direction }).click()
      await expect(page.getByRole('button', { name: direction })).toHaveAttribute('aria-pressed', 'true')
      for (const surface of surfaces) {
        await page.getByLabel('Creator utility', { exact: true }).selectOption(surface.value)
        for (const fixture of surface.fixtures) {
          await page.getByLabel('Creator utility edge state').selectOption(fixture)
          await expect(page.getByRole('heading', { name: direction, level: 1 })).toBeVisible()
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
          expect(overflow, `${direction}, ${surface.value}, ${fixture}, ${width}px`).toBeLessThanOrEqual(1)
        }
      }
    }
  }
})

test('Home either presents one evidence-backed next task or recommends a redirect', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/creator-utilities-directions')
  await expect(page.getByRole('heading', { name: 'What to continue now' })).toBeVisible()
  await expect(page.getByText(/explicit state and deadlines/)).toBeVisible()
  await expect(page.getByText(/artistic value, prestige, or hidden scores/)).toBeVisible()
  await page.getByLabel('Creator utility edge state').selectOption('home-partial-failure')
  await expect(page.getByText('Inbox is temporarily unavailable')).toBeVisible()
  await expect(page.getByText(/No missing Inbox state is converted into “all clear.”/)).toBeVisible()
  await page.getByLabel('Creator utility edge state').selectOption('home-no-projection')
  await expect(page.getByRole('heading', { name: 'Home is not useful enough yet' })).toBeVisible()
  await expect(page.getByText(/should redirect to Opportunities/)).toBeVisible()
  await expect(page.getByText(/metric|streak|completeness/i)).toHaveCount(0)
})

test('Import preserves no-write review, match reasons, taxonomy separation, and exact confirmation', async ({ page }) => {
  await page.goto('/design-system/creator-utilities-directions')
  await page.getByLabel('Creator utility', { exact: true }).selectOption('import')
  await expect(page.getByText(/no Organization receives it/)).toBeVisible()
  await page.getByLabel('Creator utility edge state').selectOption('import-review')
  await expect(page.getByText(/exact facts that produced it/)).toBeVisible()
  await expect(page.getByText('Known Opportunity ID and official source URL match.')).toBeVisible()
  await page.getByLabel('Creator utility edge state').selectOption('import-taxonomy-review')
  await expect(page.getByText(/resolves to canonical Writing/)).toBeVisible()
  await expect(page.getByText(/remains unresolved under the Genre\/Form facets/)).toBeVisible()
  await page.getByLabel('Creator utility edge state').selectOption('import-confirm')
  await expect(page.getByRole('heading', { name: 'Confirm exact changes' })).toBeVisible()
  await expect(page.getByText('No write has happened yet.')).toBeVisible()
  await expect(page.getByText(/No Organization, Submission, Work snapshot, or application is changed/)).toBeVisible()
})

test('Ask keeps parsed facts and official-source evidence without operational metadata', async ({ page }) => {
  await page.goto('/design-system/creator-utilities-directions')
  await page.getByLabel('Creator utility', { exact: true }).selectOption('ask')
  await page.getByLabel('Creator utility edge state').selectOption('ask-results')
  await expect(page.getByText('Type · Fellowship')).toBeVisible()
  await expect(page.getByText('Practice · Writing')).toBeVisible()
  await expect(page.getByText('Fee · No fee')).toBeVisible()
  await expect(page.getByText('Deadline · Closing soon')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Official source' }).first()).toBeVisible()
  const previewCopy = await page.locator('[data-surface="ask"]').innerText()
  expect(previewCopy).not.toMatch(/last checked|checked at|freshness|confidence|organization confirmed|source tier|worker/i)
  await page.getByLabel('Creator utility edge state').selectOption('ask-out-of-scope')
  await expect(page.getByText(/do not judge eligibility, artistic quality, or likely outcomes/)).toBeVisible()
  await page.getByLabel('Creator utility edge state').selectOption('ask-no-results')
  await expect(page.getByText(/does not mean no Opportunities exist/)).toBeVisible()
})

test('selected Creator utilities route keeps Option 02 and all utilities available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/creator-utilities')
  await expect(page.getByRole('heading', { name: 'Creator desk', level: 1 })).toBeVisible()
  await expect(page.getByText('Selected · local only')).toHaveCount(1)
  await expect(page.getByRole('group', { name: 'Creator utility direction' })).toHaveCount(0)
  await page.getByLabel('Creator utility', { exact: true }).selectOption('import')
  await expect(page.getByRole('heading', { name: 'Import your tracker' })).toBeVisible()
  await page.getByLabel('Creator utility', { exact: true }).selectOption('ask')
  await expect(page.getByRole('heading', { name: 'Ask Missa' })).toBeVisible()
})

test('mobile Import and Ask core states pass WCAG A and AA checks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/creator-utilities-directions')
  await page.getByLabel('Creator utility', { exact: true }).selectOption('import')
  await page.getByLabel('Creator utility edge state').selectOption('import-review')
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
  await page.getByLabel('Creator utility', { exact: true }).selectOption('ask')
  await page.getByLabel('Creator utility edge state').selectOption('ask-results')
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
