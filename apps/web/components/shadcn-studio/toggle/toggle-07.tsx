'use client'

import { useState } from 'react'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'
import { PowerIcon } from "lucide-react"

const ToggleIconPattern = () => {
  const [isPowerOff, setIsPowerOff] = useState(false)

  return (
    <div className='flex items-center justify-center'>
      <Toggle
        variant='outline'
        aria-label='power toggle'
        onClick={() => setIsPowerOff(!isPowerOff)}
        className={cn(
          isPowerOff
            ? 'border-success text-success! hover:bg-success/10 focus-visible:border-success focus-visible:ring-green-600/20 dark:border-success dark:text-success! dark:hover:bg-success/10 dark:focus-visible:border-success dark:focus-visible:ring-green-400/40'
            : 'border-destructive text-destructive! hover:bg-destructive/10 focus-visible:border-destructive focus-visible:ring-destructive/20 dark:border-destructive dark:text-destructive! dark:hover:bg-destructive/10 dark:focus-visible:border-destructive dark:focus-visible:ring-destructive/40'
        )}
      >
        {isPowerOff ? (
          <PowerIcon
          />
        ) : (
          <PowerIcon
          />
        )}
      </Toggle>
    </div>
  )
}

export default ToggleIconPattern
