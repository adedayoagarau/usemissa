'use client'

import { useState } from 'react'

import { Slider } from '@/components/ui/slider'
import { CircularProgress } from '@/components/ui/circular-progress'

const CircularProgressShapeDemo = () => {
  const [progress, setProgress] = useState(65)

  return (
    <div className='mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4 py-10'>
      <div className='flex w-full items-center justify-center gap-12 text-center'>
        {/* Download - Round */}
        <div className='flex flex-col items-center'>
          <CircularProgress
            size={110}
            strokeWidth={8}
            value={progress}
            showLabel
            progressClassName='stroke-primary transition-all duration-300 ease-in-out'
            labelClassName='text-xl font-medium'
            progressBgClassName='stroke-primary/10'
          />
          <span className='text-muted-foreground text-xs font-medium uppercase'>Download</span>
        </div>

        {/* Upload - Square */}
        <div className='flex flex-col items-center'>
          <CircularProgress
            size={110}
            strokeWidth={8}
            shape='square'
            value={progress}
            showLabel
            progressClassName='stroke-primary transition-all duration-300 ease-in-out'
            labelClassName='text-xl font-medium'
            progressBgClassName='stroke-primary/10'
          />
          <span className='text-muted-foreground text-xs font-medium uppercase'>Upload</span>
        </div>
      </div>

      <div className='w-full max-w-60 space-y-4 text-center'>
        <Slider
          value={progress}
          max={100}
          onValueChange={val => setProgress(Array.isArray(val) ? val[0] : val)}
          step={1}
          className='cursor-pointer'
        />
        <p className='text-muted-foreground text-xs font-medium uppercase'>Optimizing network speed</p>
      </div>
    </div>
  )
}

export default CircularProgressShapeDemo
