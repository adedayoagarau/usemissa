'use client'

import { useEffect, useState } from 'react'

import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

const ProgressLoadingDemo = () => {
  const [value, setValue] = useState(20)

  useEffect(() => {
    const interval = setInterval(() => {
      setValue(current => Math.min(100, Math.round(current + Math.random() * 25)))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className='w-full'>
      <Progress value={value} className='transition-all duration-300'>
        <ProgressLabel>{value >= 100 ? 'Complete' : 'Loading...'}</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>
    </div>
  )
}

export default ProgressLoadingDemo
