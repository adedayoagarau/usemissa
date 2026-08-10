import type { Metadata } from 'next'

import { CreatorUtilitiesDirections } from '@/components/design-system/creator-utilities-directions'

export const metadata: Metadata = {
  title: 'Creator utilities directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function CreatorUtilitiesDirectionsPage() {
  return <CreatorUtilitiesDirections />
}
