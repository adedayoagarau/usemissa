import type { Metadata } from 'next'

import { CreatorUtilitiesSelected } from '@/components/design-system/creator-utilities-directions'

export const metadata: Metadata = {
  title: 'Selected Creator utilities · Missa design review',
  robots: { index: false, follow: false },
}

export default function CreatorUtilitiesPage() {
  return <CreatorUtilitiesSelected />
}
