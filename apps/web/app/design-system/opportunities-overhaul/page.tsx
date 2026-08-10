import type { Metadata } from 'next'

import { OpportunitiesOverhaulPreview } from '@/components/design-system/opportunities-overhaul-preview'

export const metadata: Metadata = {
  title: 'Opportunities overhaul · Missa design review',
  robots: { index: false, follow: false },
}

export default function OpportunitiesOverhaulDesignSystemPage() {
  return <OpportunitiesOverhaulPreview />
}
