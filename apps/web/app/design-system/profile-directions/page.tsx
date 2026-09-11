import type { Metadata } from 'next'

import { ProfileDirections } from '@/components/design-system/profile-directions'

export const metadata: Metadata = {
  title: 'Profile directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function ProfileDirectionsPage() {
  return <ProfileDirections />
}
