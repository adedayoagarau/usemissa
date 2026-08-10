import type { Metadata } from 'next'

import { ProfileSelected } from '@/components/design-system/profile-directions'

export const metadata: Metadata = {
  title: 'Selected Profile · Missa design review',
  robots: { index: false, follow: false },
}

export default function ProfileSelectedPage() {
  return <ProfileSelected />
}
