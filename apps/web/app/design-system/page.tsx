import type { Metadata } from 'next'

import { SelectedSystemIndex } from '@/components/design-system/selected-system-index'

export const metadata: Metadata = {
  title: 'Selected Missa system · local design review',
  description: 'A local-only index of selected Missa page-family compositions and retained comparisons.',
  robots: { index: false, follow: false },
}

export default function DesignSystemIndexPage() {
  return <SelectedSystemIndex />
}

