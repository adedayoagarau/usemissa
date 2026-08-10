'use client'

import { useState, useEffect } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

const AlertTaskDemo = () => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(50), 100)

    return () => clearTimeout(timer)
  }, [])

  return (
    <Alert className='grid-cols-[auto_1fr] gap-x-2'>
      <Avatar className='row-span-2 rounded-sm'>
        <AvatarImage
          src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png'
          alt='Hallie Richards'
          className='rounded-sm'
        />
        <AvatarFallback className='text-xs'>HR</AvatarFallback>
      </Avatar>
      <AlertTitle>@Rocky</AlertTitle>
      <AlertDescription>
        <p className='mb-2!'>this projects task is remaining, deadline is near.</p>
        <Progress
          value={progress}
          className='**:data-[slot=progress-indicator]:bg-amber-600 *:data-[slot=progress-track]:h-1.5 *:data-[slot=progress-track]:bg-amber-600/20 dark:**:data-[slot=progress-indicator]:bg-amber-400 dark:*:data-[slot=progress-track]:bg-amber-400/20'
          aria-label='Task progress'
        />
      </AlertDescription>
    </Alert>
  )
}

export default AlertTaskDemo
