import type { Metadata } from 'next'

import { OrganizationDirections } from '@/components/design-system/organization-directions'

export const metadata: Metadata = {
  title: 'Organization directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function OrganizationDirectionsPage() {
  return <OrganizationDirections />
}
