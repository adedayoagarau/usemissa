import type { Metadata } from 'next'

import { ReviewerSelected } from '@/components/design-system/reviewer-directions'

export const metadata: Metadata = {
  title: 'Selected reviewer workspace · Missa design review',
  robots: { index: false, follow: false },
}

export default function ReviewerPage() {
  return <ReviewerSelected />
}
