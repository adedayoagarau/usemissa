import type { Metadata } from 'next'

import { ShellSelected } from '@/components/design-system/shell-directions'

export const metadata: Metadata = {
  title: 'Selected shared shell · Missa design review',
  robots: { index: false, follow: false },
}

export default function ShellDesignSystemPage() {
  return <ShellSelected />
}
