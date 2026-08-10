import type { Metadata } from 'next'

import { OrganizationWorkflowDirections } from '@/components/design-system/organization-workflow-directions'

export const metadata: Metadata = {
  title: 'Organization workflow directions · Missa design review',
  robots: { index: false, follow: false },
}

export default function OrganizationWorkflowDirectionsPage() {
  return <OrganizationWorkflowDirections />
}
