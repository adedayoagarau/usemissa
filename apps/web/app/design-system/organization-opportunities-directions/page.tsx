import type { Metadata } from 'next'

import { OrganizationOpportunityDirections } from '@/components/design-system/organization-opportunity-directions'

export const metadata: Metadata = {
  title: 'Organization Opportunities directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function OrganizationOpportunitiesDirectionsPage() {
  return <OrganizationOpportunityDirections />
}
