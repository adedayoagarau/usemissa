import { expect, test } from '@playwright/test'

const selectedRoutes = [
  {
    path: '/design-system/organization',
    marker: 'Selected Organization composition',
    comparison: 'Operations ledger',
  },
  {
    path: '/design-system/organization-opportunities',
    marker: 'Selected Organization Opportunities composition',
    comparison: 'Program ledger',
  },
  {
    path: '/design-system/organization-workflow',
    marker: 'Selected workflow composition',
    comparison: 'Lifecycle ledger',
  },
  {
    path: '/design-system/organization-messages-delivery',
    marker: 'Selected post-decision composition',
    comparison: 'Correspondence ledger',
  },
  {
    path: '/design-system/organization-insights',
    marker: 'Organization Insights · Program lens',
    comparison: 'Operating brief',
  },
  {
    path: '/design-system/organization-people-permissions',
    marker: 'Organization People · Access dossier',
    comparison: 'Directory ledger',
  },
  {
    path: '/design-system/organization-settings-billing',
    marker: 'Organization Settings & Billing · Control centre',
    comparison: 'Settings index',
  },
  {
    path: '/design-system/public-organization-profile',
    marker: 'Public Organization · Opportunity-first profile',
    comparison: 'Editorial profile',
  },
  {
    path: '/design-system/hosted-application',
    marker: 'Hosted application · Application desk',
    comparison: 'Guided steps',
  },
] as const

test('approved Organization families have stable selected-only mobile routes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  for (const route of selectedRoutes) {
    await page.goto(route.path)
    await expect(page.getByText(route.marker, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(route.comparison, 'i') })).toHaveCount(0)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, route.path).toBeLessThanOrEqual(1)
  }
})

test('comparison routes still retain all alternatives', async ({ page }) => {
  await page.goto('/design-system/organization-directions')
  await expect(page.getByRole('button', { name: /Context rail/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Operations ledger/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Attention desk/i })).toBeVisible()

  await page.goto('/design-system/organization-opportunities-directions')
  await expect(page.getByRole('button', { name: /Operational index/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Program ledger/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Preview desk/i })).toBeVisible()

  await page.goto('/design-system/organization-insights-directions')
  await expect(page.getByRole('button', { name: /Operating brief/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Program lens/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Analysis table/i })).toBeVisible()

  await page.goto('/design-system/hosted-application-directions')
  await expect(page.getByRole('button', { name: /Guided steps/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Application desk/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Packet builder/i })).toBeVisible()
})

test('selected workflow uses the approved composition for each job', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design-system/organization-workflow')
  await expect(page.getByText('01 · Queue and dossier')).toBeVisible()
  await page.getByRole('button', { name: 'Reviews', exact: true }).click()
  await expect(page.getByText('03 · Evidence desk')).toBeVisible()
  await page.getByRole('button', { name: 'Decisions', exact: true }).click()
  await expect(page.getByText('03 · Evidence desk')).toBeVisible()
  await expect(page.getByRole('button', { name: /Lifecycle ledger/i })).toHaveCount(0)
})
