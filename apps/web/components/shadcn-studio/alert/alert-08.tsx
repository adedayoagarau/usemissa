'use client'

import { useState } from 'react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CircleAlertIcon, XIcon } from "lucide-react"

const AlertMultipleActionDemo = () => {
  const [isActive, setIsActive] = useState(true)

  if (!isActive) return null

  return (
    <Alert className='bg-primary text-primary-foreground border-none'>
      <CircleAlertIcon
      />
      <AlertTitle>A new update is available</AlertTitle>
      <AlertDescription className='text-primary-foreground/80'>
        <p className='mb-2!'>Includes the at new dashboard View. Pages end exports will now load taster</p>
        <div className='flex items-center gap-3'>
          <Button
            size='xs'
            className='bg-secondary/10 hover:bg-secondary/20 focus-visible:bg-secondary/20 cursor-pointer'
          >
            Skip this update
          </Button>
          <Button variant='secondary' size='xs' className='cursor-pointer'>
            Install now
          </Button>
        </div>
      </AlertDescription>
      <AlertAction>
        <button className='cursor-pointer' onClick={() => setIsActive(false)}>
          <XIcon className='size-4' />
          <span className='sr-only'>Close</span>
        </button>
      </AlertAction>
    </Alert>
  )
}

export default AlertMultipleActionDemo
