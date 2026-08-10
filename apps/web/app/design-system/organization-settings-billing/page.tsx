import type { Metadata } from 'next'

import { OrganizationSettingsBillingSelected } from '@/components/design-system/organization-settings-billing-directions'

export const metadata: Metadata = {
  title: 'Selected Organization Settings and Billing · Missa design review',
  robots: { index: false, follow: false },
}

export default function OrganizationSettingsBillingDesignSystemPage() {
  return <OrganizationSettingsBillingSelected />
}
