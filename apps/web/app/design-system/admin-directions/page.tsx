import type { Metadata } from 'next'

import { AdminDirections } from '@/components/design-system/admin-directions'

export const metadata: Metadata = {
  title: 'Platform Admin directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function AdminDirectionsPage() {
  return <AdminDirections />
}
