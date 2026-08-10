import type { Metadata } from 'next'

import { InboxSelected } from '@/components/design-system/inbox-directions'

export const metadata: Metadata = {
  title: 'Selected Inbox · Missa design review',
  robots: { index: false, follow: false },
}

export default function InboxSelectedPage() {
  return <InboxSelected />
}
