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
            ? 'border-green-600 text-green-600! hover:bg-green-600/10 focus-visible:border-green-600 focus-visible:ring-green-600/20 dark:border-green-400 dark:text-green-400! dark:hover:bg-green-400/10 dark:focus-visible:border-green-400 dark:focus-visible:ring-green-400/40'
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
