import type { Metadata } from 'next'

import { OpportunityDetailSelected } from '@/components/design-system/opportunity-detail-selected'

export const metadata: Metadata = {
  title: 'Selected opportunity detail · Missa design review',
  robots: { index: false, follow: false },
}

export default function OpportunityDetailSelectedPage() {
  return <OpportunityDetailSelected />
}
