'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { UploadIcon, XIcon } from "lucide-react"

const AlertFileUploadDemo = () => {
  const [isActive, setIsActive] = useState(true)

  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(50), 100)

    return () => clearTimeout(timer)
  }, [])

  if (!isActive) return null

  return (
    <Alert>
      <UploadIcon
      />
      <AlertTitle>Uploading your &apos;Img-234.png&apos;</AlertTitle>
      <AlertDescription>
        <p className='mb-2!'>Please wait While we upload your image.</p>
        <Progress
          value={progress}
          className='**:data-[slot=progress-indicator]:bg-sky-600 *:data-[slot=progress-track]:h-1.5 *:data-[slot=progress-track]:bg-sky-600/20 dark:**:data-[slot=progress-indicator]:bg-sky-400 dark:*:data-[slot=progress-track]:bg-sky-400/20'
          aria-label='Upload Progress'
        />
        <div className='mt-2 flex items-center gap-3'>
          <Button variant='ghost' size='sm' className='cursor-pointer'>
            Cancel
          </Button>
          <Button
            variant='ghost'
            size='sm'
            disabled
            className='cursor-pointer text-sky-600 hover:bg-sky-600/10 hover:text-sky-600 dark:text-sky-400 dark:hover:bg-sky-400/10 dark:hover:text-sky-400'
          >
            Upload another
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

export default AlertFileUploadDemo
