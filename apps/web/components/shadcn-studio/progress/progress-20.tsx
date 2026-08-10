'use client'

import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { CheckCircle2Icon, FileTextIcon } from "lucide-react"

const ProgressDownloadDemo = () => {
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isCanceled, setIsCanceled] = useState(false)

  useEffect(() => {
    if (isPaused || isCanceled) return

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)

          return 100
        }

        return prev + Math.random() * 15
      })
    }, 300)

    return () => clearInterval(timer)
  }, [isPaused, isCanceled])

  const getText = () => {
    if (isCanceled) return 'Download Canceled'
    if (isPaused) return 'Download Paused'
    if (progress >= 100) return 'Download Complete'

    return 'Downloading Document...'
  }

  return (
    <div className='bg-card w-full max-w-sm rounded-xl border p-4 shadow-sm'>
      <Field>
        <div className='mb-4 flex items-center gap-4 max-sm:flex-wrap max-sm:gap-2'>
          <div className='bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg max-sm:size-8'>
            {progress >= 100 && !isCanceled ? (
              <CheckCircle2Icon className='size-5 max-sm:size-4' />
            ) : (
              <FileTextIcon className='size-5 max-sm:size-4' />
            )}
          </div>

          <div className='flex-1'>
            <p className='m-0 mb-1 text-sm font-medium text-nowrap max-sm:text-xs'>{getText()}</p>
            <p className='text-muted-foreground text-sm text-nowrap max-sm:text-xs'>Project-Proposal.pdf</p>
          </div>

          {!isCanceled && (
            <div className='flex flex-col items-end max-sm:items-start'>
              <div className='text-sm font-medium tabular-nums max-sm:text-xs'>{Math.round(progress)}%</div>
              <div className='text-muted-foreground text-sm font-medium tabular-nums max-sm:text-xs'>
                {((progress / 100) * 5.2).toFixed(1)} / 5.2 MB
              </div>
            </div>
          )}
        </div>

        <Progress value={progress} id='progress-upload' className='**:data-[slot=progress-track]:h-1.5' />

        <div className='mt-2 grid grid-cols-2 gap-2'>
          {progress >= 100 || isCanceled ? (
            <Button
              className='col-span-2 text-sm'
              size='sm'
              onClick={() => {
                setProgress(0)
                setIsCanceled(false)
                setIsPaused(false)
              }}
            >
              Restart
            </Button>
          ) : (
            <>
              <Button onClick={() => setIsPaused(!isPaused)} size='sm' variant='outline' className='text-sm'>
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                variant='secondary'
                size='sm'
                className='text-sm'
                onClick={() => {
                  setProgress(0)
                  setIsCanceled(true)
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </Field>
    </div>
  )
}

export default ProgressDownloadDemo
