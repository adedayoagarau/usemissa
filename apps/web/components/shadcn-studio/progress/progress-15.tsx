'use client'

import { useState } from 'react'

import { Slider } from '@/components/ui/slider'
import { CircularProgress } from '@/components/ui/circular-progress'

const CircularProgressDemo = () => {
  const [progress, setProgress] = useState(50)

  return (
    <div className='mx-auto flex w-full max-w-xs flex-col items-center'>
      <CircularProgress
        size={120}
        showLabel
        renderLabel={v => Math.round(v)}
        strokeWidth={8}
        value={progress}
        progressBgClassName='stroke-primary/10'
        progressClassName='stroke-primary'
        labelClassName='text-xl'
      />
      <Slider
        className='mt-6 w-[80%]'
        value={[progress]}
        max={100}
        onValueChange={val => setProgress(Array.isArray(val) ? val[0] : val)}
        step={1}
      />
    </div>
  )
}

export default CircularProgressDemo
