import type { Metadata } from 'next'

import { PublicOrganizationProfileSelected } from '@/components/design-system/public-organization-profile-directions'

export const metadata: Metadata = {
  title: 'Selected public Organization profile · Missa design review',
  robots: { index: false, follow: false },
}

export default function PublicOrganizationProfileDesignSystemPage() {
  return <PublicOrganizationProfileSelected />
}
