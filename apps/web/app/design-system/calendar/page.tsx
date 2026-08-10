import type { Metadata } from 'next'

import { CalendarSelected } from '@/components/design-system/calendar-directions'

export const metadata: Metadata = {
  title: 'Selected Tracker Calendar · Missa design review',
  robots: { index: false, follow: false },
}

export default function CalendarSelectedPage() {
  return <CalendarSelected />
}
