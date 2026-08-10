import type { Metadata } from 'next'

import { LibraryWorkSelected } from '@/components/design-system/library-work-selected'

export const metadata: Metadata = {
  title: 'Selected Library and Work · Missa design review',
  robots: { index: false, follow: false },
}

export default function LibraryWorkSelectedPage() {
  return <LibraryWorkSelected />
}
