import type { Metadata } from 'next'

import { OrganizationPeoplePermissionsSelected } from '@/components/design-system/organization-people-permissions-directions'

export const metadata: Metadata = {
  title: 'Selected Organization People and Permissions · Missa design review',
  robots: { index: false, follow: false },
}

export default function OrganizationPeoplePermissionsDesignSystemPage() {
  return <OrganizationPeoplePermissionsSelected />
}
