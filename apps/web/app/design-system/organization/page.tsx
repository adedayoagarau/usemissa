import type { Metadata } from 'next'

import { OrganizationSelected } from '@/components/design-system/organization-directions'

export const metadata: Metadata = {
  title: 'Selected Organization chooser and overview · Missa design review',
  robots: { index: false, follow: false },
}

export default function OrganizationDesignSystemPage() {
  return <OrganizationSelected />
}
