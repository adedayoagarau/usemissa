import type { Metadata } from 'next'

import { PublicAcquisitionSelected } from '@/components/design-system/public-acquisition-directions'

export const metadata: Metadata = {
  title: 'Selected public and acquisition system · Missa design review',
  robots: { index: false, follow: false },
}

export default function PublicAcquisitionPage() {
  return <PublicAcquisitionSelected />
}
