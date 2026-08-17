import type { Metadata } from 'next'

import { ApplicationOfficePrototype } from '@/components/design-system/application-office-prototype/application-office-prototype'

export const metadata: Metadata = {
  title: 'Tracker workbench prototype',
  robots: { index: false, follow: false },
}

export default function ApplicationOfficePrototypePage() {
  return <ApplicationOfficePrototype />
}
