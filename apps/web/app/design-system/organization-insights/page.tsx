import type { Metadata } from 'next'

import { OrganizationInsightsSelected } from '@/components/design-system/organization-insights-directions'

export const metadata: Metadata = {
  title: 'Selected Organization Insights · Missa design review',
  robots: { index: false, follow: false },
}

export default function OrganizationInsightsDesignSystemPage() {
  return <OrganizationInsightsSelected />
}
