'use client'

import { useState } from 'react'

import { Slider } from '@/components/ui/slider'
import { CircularProgress } from '@/components/ui/circular-progress'

const CircularProgressStrokeDemo = () => {
  const [progress, setProgress] = useState(65)

  return (
    <div className='mx-auto flex w-full max-w-sm flex-col items-center gap-10 px-4 py-10'>
      <div className='flex w-full items-center justify-center gap-6 text-center xl:gap-8'>
        {/* Standard - Balanced */}
        <div className='flex flex-col items-center gap-2'>
          <CircularProgress
            size={100}
            strokeWidth={8}
            value={progress}
            showLabel
            progressClassName='stroke-primary'
            labelClassName='text-xl font-medium text-primary'
            progressBgClassName='stroke-primary/10'
          />
          <span className='text-muted-foreground text-xs font-medium uppercase'>Standard</span>
        </div>

        {/* Inset - Thick Base, Thin Progress */}
        <div className='flex flex-col items-center gap-4'>
          <CircularProgress
            size={100}
            circleStrokeWidth={10}
            progressStrokeWidth={5}
            value={progress}
            showLabel
            progressClassName='stroke-primary transition-all duration-300 ease-in-out'
            labelClassName='text-xl font-medium text-primary'
            progressBgClassName='stroke-primary/10'
          />
          <span className='text-muted-foreground text-xs font-medium uppercase'>Inset</span>
        </div>

        {/* Emphasis - Thin Base, Thick Progress */}
        <div className='flex flex-col items-center gap-4'>
          <CircularProgress
            size={100}
            circleStrokeWidth={6}
            progressStrokeWidth={10}
            value={progress}
            showLabel
            progressClassName='stroke-primary transition-all duration-300 ease-in-out'
            labelClassName='text-xl font-medium text-primary'
            progressBgClassName='stroke-primary/10'
          />
          <span className='text-muted-foreground text-xs font-medium uppercase'>Emphasis</span>
        </div>
      </div>

      <div className='w-full max-w-60 space-y-4'>
        <Slider
          value={progress}
          max={100}
          onValueChange={val => setProgress(Array.isArray(val) ? val[0] : val)}
          step={1}
          className='cursor-pointer'
        />
        <p className='text-muted-foreground text-center text-xs font-medium uppercase'>Comparing stroke weights</p>
      </div>
    </div>
  )
}

export default CircularProgressStrokeDemo
