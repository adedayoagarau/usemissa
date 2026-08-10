import type { Metadata } from 'next'

import { OpportunityDetailDirections } from '@/components/design-system/opportunity-detail-directions'

export const metadata: Metadata = {
  title: 'Opportunity detail directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function OpportunityDetailDirectionsPage() {
  return <OpportunityDetailDirections />
}
