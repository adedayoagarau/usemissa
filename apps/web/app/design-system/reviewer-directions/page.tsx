import type { Metadata } from 'next'

import { ReviewerDirections } from '@/components/design-system/reviewer-directions'

export const metadata: Metadata = {
  title: 'Reviewer directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function ReviewerDirectionsPage() {
  return <ReviewerDirections />
}
