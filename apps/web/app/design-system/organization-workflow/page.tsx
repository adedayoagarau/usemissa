import type { Metadata } from 'next'

import { OrganizationWorkflowSelected } from '@/components/design-system/organization-workflow-directions'

export const metadata: Metadata = {
  title: 'Selected Organization workflow · Missa design review',
  robots: { index: false, follow: false },
}

export default function OrganizationWorkflowDesignSystemPage() {
  return <OrganizationWorkflowSelected />
}
