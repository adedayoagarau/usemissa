import type { Metadata } from 'next'

import { OpportunityJourneyReview } from '@/components/design-system/opportunity-journey-review'

export const metadata: Metadata = {
  title: 'Opportunity journey · Missa design review',
  description: 'The five-screen public Opportunity journey, connected for local review.',
  robots: { index: false, follow: false },
}

export default function OpportunityJourneyDesignSystemPage() {
  return <OpportunityJourneyReview />
}
