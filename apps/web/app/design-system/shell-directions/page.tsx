import type { Metadata } from 'next'

import { ShellDirections } from '@/components/design-system/shell-directions'

export const metadata: Metadata = {
  title: 'Shared shell directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function ShellDirectionsPage() {
  return <ShellDirections />
}
