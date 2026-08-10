import type { Metadata } from 'next'

import { AuthOnboardingSelected } from '@/components/design-system/auth-onboarding-directions'

export const metadata: Metadata = {
  title: 'Selected authentication and onboarding system · Missa design review',
  robots: { index: false, follow: false },
}

export default function AuthOnboardingPage() {
  return <AuthOnboardingSelected />
}
