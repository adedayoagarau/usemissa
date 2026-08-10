'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BellOffIcon, BellIcon } from "lucide-react"

const ToggleTooltip = () => {
  const [notification, setNotification] = useState(false)

  return (
    <div className='flex flex-wrap items-center justify-center'>
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              size='lg'
              variant='outline'
              aria-label='Toggle notification'
              pressed={notification}
              onPressedChange={setNotification}
              className='relative'
            />
          }
        >
          {notification ? (
            <BellOffIcon
            />
          ) : (
            <BellIcon
            />
          )}
          {notification ? null : (
            <Badge className='absolute -top-2.5 -right-2.5 h-5 min-w-5 px-1 tabular-nums'>8</Badge>
          )}
        </TooltipTrigger>
        <TooltipContent>{notification ? 'Notifications Off' : 'Notifications On'}</TooltipContent>
      </Tooltip>
    </div>
  )
}

export default ToggleTooltip
