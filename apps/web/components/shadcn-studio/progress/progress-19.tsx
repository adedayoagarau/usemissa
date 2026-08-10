'use client'

import { useState } from 'react'

import { Slider } from '@/components/ui/slider'
import { CircularProgress } from '@/components/ui/circular-progress'

const CircularProgressColorDemo = () => {
  const [progress, setProgress] = useState(70)

  return (
    <div className='mx-auto flex w-full max-w-md flex-col items-center gap-8 px-4 py-10'>
      <div className='flex flex-col items-center gap-1 text-center'>
        <h3 className='text-base font-medium uppercase'>Health Rings</h3>
        <p className='text-muted-foreground text-xs font-medium uppercase'>Activity synchronized</p>
      </div>

      <div className='flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-4 xl:gap-x-8 xl:gap-y-10'>
        {/* Move */}
        <div className='flex flex-col items-center gap-2'>
          <CircularProgress
            size={100}
            strokeWidth={8}
            value={progress}
            showLabel
            progressClassName='stroke-destructive transition-all duration-300'
            labelClassName='text-xl font-medium text-destructive'
            progressBgClassName='stroke-destructive/10'
          />
          <span className='text-muted-foreground text-xs font-medium uppercase'>Move</span>
        </div>

        {/* Exercise */}
        <div className='flex flex-col items-center'>
          <CircularProgress
            size={100}
            strokeWidth={8}
            value={progress}
            showLabel
            progressClassName='stroke-green-600 dark:stroke-green-400 transition-all duration-300'
            labelClassName='text-xl font-medium text-green-600 dark:text-green-400'
            progressBgClassName='stroke-green-600/10 dark:stroke-green-400/10'
          />
          <span className='text-muted-foreground text-xs font-medium uppercase'>Exercise</span>
        </div>

        {/* Stand */}
        <div className='flex flex-col items-center'>
          <CircularProgress
            size={100}
            strokeWidth={8}
            value={progress}
            showLabel
            progressClassName='stroke-sky-600 dark:stroke-sky-400 transition-all duration-300'
            labelClassName='text-xl font-medium text-sky-600 dark:text-sky-400'
            progressBgClassName='stroke-sky-600/10 dark:stroke-sky-400/10'
          />
          <span className='text-muted-foreground text-xs font-medium uppercase'>Stand</span>
        </div>
      </div>

      <div className='w-full max-w-70'>
        <Slider
          value={progress}
          max={100}
          onValueChange={val => setProgress(Array.isArray(val) ? val[0] : val)}
          step={1}
          className='cursor-pointer'
        />
      </div>
    </div>
  )
}

export default CircularProgressColorDemo
