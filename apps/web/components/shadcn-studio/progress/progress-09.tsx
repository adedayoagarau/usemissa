'use client'

import { useState, useEffect } from 'react'

import { Progress } from '@/components/ui/progress'

const ProgressVerticalDemo = () => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(75), 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className='bg-card flex flex-col items-center justify-center space-y-6 rounded-xl border p-6 px-8 shadow-sm'>
      <span className='text-base font-medium'>Completed</span>

      <div className='relative flex h-32 w-4 items-center justify-center'>
        <Progress value={progress} className='absolute w-32 -rotate-90 **:data-[slot=progress-track]:h-2' />
      </div>

      <span className='text-base font-medium tabular-nums'>{progress}%</span>
    </div>
  )
}

export default ProgressVerticalDemo
