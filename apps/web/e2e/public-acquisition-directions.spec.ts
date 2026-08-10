import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const directions = ['Immediate usefulness', 'Editorial evidence', 'Guided pathways'] as const

const surfaces = [
  { value: 'home', fixtures: ['ready', 'signed-in', 'no-media', 'no-records', 'unavailable'] },
  { value: 'about', fixtures: ['principles'] },
  { value: 'organizations', fixtures: ['capability-mix'] },
  { value: 'guides', fixtures: ['guide-index'] },
  { value: 'article', fixtures: ['guide-no-related'] },
  { value: 'methodology', fixtures: ['evidence'] },
  { value: 'collection', fixtures: ['collection-active', 'collection-thin', 'collection-zero', 'collection-stale'] },
  { value: 'profile', fixtures: ['profile-public', 'profile-private', 'profile-empty', 'profile-not-found'] },
  { value: 'access', fixtures: ['signup-open', 'waitlist-only', 'waitlist-duplicate', 'waitlist-invalid', 'waitlist-unavailable'] },
] as const

test('all public directions and edge states reflow without horizontal overflow', async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/design-system/public-acquisition-directions')
    for (const direction of directions) {
      await page.getByRole('button', { name: direction }).click()
      await expect(page.getByRole('button', { name: direction })).toHaveAttribute('aria-pressed', 'true')
      for (const surface of surfaces) {
        await page.getByLabel('Public page').selectOption(surface.value)
        for (const fixture of surface.fixtures) {
          await page.getByLabel('Public edge state').selectOption(fixture)
          await expect(page.getByRole('heading', { name: direction, level: 1 })).toBeVisible()
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
          expect(overflow, `${direction}, ${surface.value}, ${fixture}, ${width}px`).toBeLessThanOrEqual(1)
        }
      }
    }
  }
})

test('public truth, taxonomy, media, and access-policy boundaries remain explicit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/public-acquisition-directions')
  await expect(page.getByText('Organization not listed')).toBeVisible()
  await expect(page.getByText('Deadline not published')).toBeVisible()
  await expect(page.getByText('Fee not published')).toBeVisible()

  await page.getByLabel('Public edge state').selectOption('no-media')
  await expect(page.getByText('Media not provided').first()).toBeVisible()

  await page.getByLabel('Public page').selectOption('organizations')
  await expect(page.locator('[data-state="available"]').first()).toHaveText('Available')
  await expect(page.locator('[data-state="limited"]').first()).toHaveText('Limited')
  await expect(page.locator('[data-state="planned"]').first()).toHaveText('Planned')

  await page.getByLabel('Public page').selectOption('access')
  await expect(page.getByRole('heading', { name: 'Create an account and begin with Opportunities.' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Join waitlist/i })).toHaveCount(0)
  await page.getByLabel('Public edge state').selectOption('waitlist-only')
  await expect(page.getByRole('button', { name: /Join waitlist/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Create account/i })).toHaveCount(0)

  const publicCopy = await page.locator('[data-surface]').innerText()
  expect(publicCopy).not.toMatch(/freshness|confidence score|source tier|next refresh|verified until/i)
})

test('public Profile and collection states do not leak private product data or overclaim coverage', async ({ page }) => {
  await page.goto('/design-system/public-acquisition-directions')
  await page.getByLabel('Public page').selectOption('profile')
  await expect(page.getByRole('heading', { name: 'Amaka Nwosu' })).toBeVisible()
  await expect(page.getByText('Tracker', { exact: true })).toHaveCount(0)
  await page.getByLabel('Public edge state').selectOption('profile-private')
  await expect(page.getByRole('heading', { name: 'This Profile is private' })).toBeVisible()

  await page.getByLabel('Public page').selectOption('collection')
  await page.getByLabel('Public edge state').selectOption('collection-thin')
  await expect(page.getByText(/not a claim about the wider field/i)).toBeVisible()
  await page.getByLabel('Public edge state').selectOption('collection-zero')
  await expect(page.getByText('No published Opportunities to show here')).toBeVisible()
})

test('waitlist field errors remain associated and comparison passes core WCAG A and AA checks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/public-acquisition-directions')
  await page.getByLabel('Public page').selectOption('access')
  await page.getByLabel('Public edge state').selectOption('waitlist-invalid')
  const email = page.getByLabel('Email address')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAttribute('aria-describedby', 'public-email-error')
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByLabel('Public page').selectOption('home')
  await page.getByLabel('Public edge state').selectOption('ready')
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})

test('selected public route applies the approved composition by page job', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/public-acquisition')
  await expect(page.getByRole('group', { name: 'Public visual direction' })).toHaveCount(0)
  const expected = [
    ['home', 'Immediate usefulness'],
    ['about', 'Editorial evidence'],
    ['organizations', 'Editorial evidence'],
    ['guides', 'Editorial evidence'],
    ['article', 'Editorial evidence'],
    ['methodology', 'Editorial evidence'],
    ['collection', 'Immediate usefulness'],
    ['profile', 'Editorial evidence'],
    ['access', 'Immediate usefulness'],
  ] as const

  for (const [surface, direction] of expected) {
    await page.getByLabel('Public page').selectOption(surface)
    await expect(page.getByRole('heading', { name: direction, level: 1 })).toBeVisible()
    await expect(page.getByText('Selected public composition for this page', { exact: true })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, surface).toBeLessThanOrEqual(1)
  }
})
