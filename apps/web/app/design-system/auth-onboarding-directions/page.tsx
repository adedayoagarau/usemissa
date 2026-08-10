import type { Metadata } from 'next'

import { AuthOnboardingDirections } from '@/components/design-system/auth-onboarding-directions'

export const metadata: Metadata = {
  title: 'Authentication and onboarding directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function AuthOnboardingDirectionsPage() {
  return <AuthOnboardingDirections />
}
