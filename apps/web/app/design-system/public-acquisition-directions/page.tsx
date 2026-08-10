import type { Metadata } from 'next'

import { PublicAcquisitionDirections } from '@/components/design-system/public-acquisition-directions'

export const metadata: Metadata = {
  title: 'Public and acquisition directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function PublicAcquisitionDirectionsPage() {
  return <PublicAcquisitionDirections />
}
