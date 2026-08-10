import type { Metadata } from 'next'

import { TrackerDirections } from '@/components/design-system/tracker-directions'

export const metadata: Metadata = {
  title: 'Tracker directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function TrackerDirectionsPage() {
  return <TrackerDirections />
}
