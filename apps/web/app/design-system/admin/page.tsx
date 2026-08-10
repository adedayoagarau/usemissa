import type { Metadata } from 'next'

import { AdminSelected } from '@/components/design-system/admin-directions'

export const metadata: Metadata = {
  title: 'Selected Platform Admin · Missa design review',
  robots: { index: false, follow: false },
}

export default function AdminDesignSystemPage() {
  return <AdminSelected />
}
