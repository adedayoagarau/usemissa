import type { Metadata } from 'next'

import { InboxDirections } from '@/components/design-system/inbox-directions'

export const metadata: Metadata = {
  title: 'Inbox directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function InboxDirectionsPage() {
  return <InboxDirections />
}
