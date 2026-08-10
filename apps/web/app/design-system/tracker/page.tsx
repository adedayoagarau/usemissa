import type { Metadata } from 'next'

import { TrackerSelected } from '@/components/design-system/tracker-directions'

export const metadata: Metadata = {
  title: 'Selected Tracker · Missa design review',
  robots: { index: false, follow: false },
}

export default function TrackerSelectedPage() {
  return <TrackerSelected />
}
