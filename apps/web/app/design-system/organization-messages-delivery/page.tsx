import type { Metadata } from 'next'

import { OrganizationMessagesDeliverySelected } from '@/components/design-system/organization-messages-delivery-directions'

export const metadata: Metadata = {
  title: 'Selected Organization Messages and Delivery · Missa design review',
  robots: { index: false, follow: false },
}

export default function OrganizationMessagesDeliveryDesignSystemPage() {
  return <OrganizationMessagesDeliverySelected />
}
