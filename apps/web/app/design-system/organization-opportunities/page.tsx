import type { Metadata } from 'next'

import { OrganizationOpportunitySelected } from '@/components/design-system/organization-opportunity-directions'

export const metadata: Metadata = {
  title: 'Selected Organization Opportunities · Missa design review',
  robots: { index: false, follow: false },
}

export default function OrganizationOpportunitiesPage() {
  return <OrganizationOpportunitySelected />
}
