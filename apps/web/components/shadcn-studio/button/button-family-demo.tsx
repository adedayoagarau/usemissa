import { ArrowRight, Check, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Reference-only showcase for the Missa Button family.
 * Keep the shine variant for marketing or special moments, not Workspace chrome.
 */
export function ButtonFamilyDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Explore opportunities</Button>
      <Button variant="outline">Build your profile</Button>
      <Button size="icon" variant="ghost" aria-label="Mark as complete">
        <Check />
      </Button>
      <Button variant="destructive">
        <Trash2 />
        Delete
      </Button>
      <Button variant="shine">
        See what fits
        <ArrowRight />
      </Button>
    </div>
  )
}
