import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const directions = ['Task return', 'Quiet split', 'Guided continuity'] as const
const journeys = [
  { value: 'login', fixtures: ['ordinary-login', 'opportunity-return', 'application-return', 'invalid-credentials', 'malformed-return', 'rate-limited', 'session-expired', 'login-timeout'] },
  { value: 'signup', fixtures: ['ordinary-signup', 'invite-only', 'existing-account', 'invalid-email', 'weak-password', 'password-mismatch', 'signup-pending', 'ambiguous-signup', 'signup-unavailable'] },
  { value: 'profile', fixtures: ['profile-start', 'no-practice', 'many-practices', 'alias-match', 'deprecated-term', 'preference-conflict', 'profile-offline', 'profile-concurrent', 'profile-resume', 'no-matches'] },
  { value: 'organization', fixtures: ['owner-create', 'valid-invite', 'expired-invite', 'revoked-invite', 'accepted-invite', 'duplicate-organization', 'domain-mismatch', 'reviewer-invite', 'reviewer-removed', 'role-limited'] },
  { value: 'recovery', fixtures: ['recovery-request', 'recovery-safe-unknown', 'recovery-used', 'recovery-expired', 'recovery-weak', 'recovery-success'] },
  { value: 'verification', fixtures: ['verification-pending', 'verification-expired', 'verification-resend-limit', 'verification-changed-email', 'verification-outage', 'verification-success'] },
] as const

test('all authentication directions and edge states reflow without horizontal overflow', async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/design-system/auth-onboarding-directions')
    for (const direction of directions) {
      await page.getByRole('button', { name: direction }).click()
      await expect(page.getByRole('button', { name: direction })).toHaveAttribute('aria-pressed', 'true')
      for (const journey of journeys) {
        await page.getByLabel('Authentication journey').selectOption(journey.value)
        for (const fixture of journey.fixtures) {
          await page.getByLabel('Authentication edge state').selectOption(fixture)
          await expect(page.getByRole('heading', { name: direction, level: 1 })).toBeVisible()
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
          expect(overflow, `${direction}, ${journey.value}, ${fixture}, ${width}px`).toBeLessThanOrEqual(1)
        }
      }
    }
  }
})

test('safe return and credential errors remain explicit and field-associated', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/auth-onboarding-directions')
  await page.getByLabel('Authentication edge state').selectOption('application-return')
  await expect(page.getByText('International Writing Fellowship · Readiness')).toBeVisible()
  await expect(page.getByText(/No draft is created twice/)).toBeVisible()
  await page.getByLabel('Authentication edge state').selectOption('malformed-return')
  await expect(page.getByText('Unsafe return removed')).toBeVisible()

  await page.getByLabel('Authentication journey').selectOption('signup')
  await page.getByLabel('Authentication edge state').selectOption('invalid-email')
  const email = page.getByLabel('Email address')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAttribute('aria-describedby', 'signup-email-error')
  await page.getByLabel('Authentication edge state').selectOption('weak-password')
  const password = page.getByLabel('Password', { exact: true })
  await expect(password).toHaveAttribute('aria-invalid', 'true')
  await expect(password).toHaveAttribute('aria-describedby', 'signup-password-error')
  const reveal = page.getByRole('button', { name: 'Show password' })
  await reveal.click()
  await expect(page.getByRole('button', { name: 'Hide password' })).toBeFocused()
})

test('Profile onboarding preserves taxonomy, preference, and privacy boundaries', async ({ page }) => {
  await page.goto('/design-system/auth-onboarding-directions')
  await page.getByLabel('Authentication journey').selectOption('profile')
  await expect(page.getByText(/12 facets later/)).toBeVisible()
  await expect(page.getByText(/No flat list of 1,084 terms/)).toBeVisible()
  await expect(page.getByText(/private matching context/)).toBeVisible()
  await expect(page.getByText(/Opportunity interests are separate/)).toBeVisible()
  await page.getByLabel('Authentication edge state').selectOption('alias-match')
  await expect(page.getByText(/save as the canonical Writing term/)).toBeVisible()
  await page.getByLabel('Authentication edge state').selectOption('no-matches')
  await expect(page.getByText(/does not mean no Opportunities exist/)).toBeVisible()
  await expect(page.getByText(/eligible|artistic quality/i)).toHaveCount(0)
})

test('Organization invitations show identity, role, scope, expiry, and safe failure', async ({ page }) => {
  await page.goto('/design-system/auth-onboarding-directions')
  await page.getByLabel('Authentication journey').selectOption('organization')
  await page.getByLabel('Authentication edge state').selectOption('valid-invite')
  await expect(page.getByText('North River Review')).toBeVisible()
  await expect(page.getByText('Program Manager')).toBeVisible()
  await expect(page.getByText('Artist Development Program')).toBeVisible()
  await expect(page.getByText(/14 August 2026/)).toBeVisible()
  await page.getByLabel('Authentication edge state').selectOption('reviewer-removed')
  await expect(page.getByText('Assignment no longer available')).toBeVisible()
  await expect(page.getByText(/No Submission data is shown/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Accept assignment/ })).toBeDisabled()
})

test('unsupported recovery and verification remain target states and core views pass WCAG A and AA', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/auth-onboarding-directions')
  await page.getByLabel('Authentication journey').selectOption('recovery')
  await expect(page.getByText('Contract target · no production API')).toBeVisible()
  await page.getByLabel('Authentication journey').selectOption('verification')
  await expect(page.getByText('Contract target · no production policy')).toBeVisible()
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByLabel('Authentication journey').selectOption('login')
  await page.getByLabel('Authentication edge state').selectOption('ordinary-login')
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})

test('selected entry route uses Task return for authentication and Guided continuity for onboarding', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/auth-onboarding')
  await expect(page.getByRole('group', { name: 'Authentication direction' })).toHaveCount(0)
  const expected = [
    ['login', 'Task return'],
    ['signup', 'Task return'],
    ['profile', 'Guided continuity'],
    ['organization', 'Guided continuity'],
    ['recovery', 'Task return'],
    ['verification', 'Task return'],
  ] as const

  for (const [journey, direction] of expected) {
    await page.getByLabel('Authentication journey').selectOption(journey)
    await expect(page.getByRole('heading', { name: direction, level: 1 })).toBeVisible()
    await expect(page.getByText('Selected entry composition for this journey', { exact: true })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, journey).toBeLessThanOrEqual(1)
  }
})
