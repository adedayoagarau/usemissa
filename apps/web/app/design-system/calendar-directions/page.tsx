import type { Metadata } from 'next'

import { CalendarDirections } from '@/components/design-system/calendar-directions'

export const metadata: Metadata = {
  title: 'Tracker Calendar directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function CalendarDirectionsPage() {
  return <CalendarDirections />
}
