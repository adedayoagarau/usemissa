import type { Metadata } from 'next'

import { HostedApplicationSelected } from '@/components/design-system/hosted-application-directions'

export const metadata: Metadata = {
  title: 'Selected hosted application · Missa design review',
  robots: { index: false, follow: false },
}

export default function HostedApplicationDesignSystemPage() {
  return <HostedApplicationSelected />
}
