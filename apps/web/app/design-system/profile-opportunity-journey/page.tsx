import type { Metadata } from 'next'

import { ProfileOpportunityJourneyPreview } from '@/components/design-system/profile-opportunity-journey-preview'

export const metadata: Metadata = {
  title: 'Profile opportunity journey · Missa design review',
  robots: { index: false, follow: false },
}

export default function ProfileOpportunityJourneyDesignSystemPage() {
  return <ProfileOpportunityJourneyPreview />
}
